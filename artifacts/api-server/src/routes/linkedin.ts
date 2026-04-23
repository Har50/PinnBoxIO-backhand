import { Router, type Request, type Response } from "express";
import { getAuth } from "@clerk/express";
import { linkedInService } from "../services/linkedin";
import { logger } from "../lib/logger";

export const linkedinPublicRouter = Router();
export const linkedinRouter = Router();

function getBaseUrl(req: Request): string {
  const host = req.headers["x-forwarded-host"] ?? req.headers.host ?? "localhost";
  const proto = req.headers["x-forwarded-proto"] ?? "https";
  return `${proto}://${host}`;
}

function getUserId(req: Request): string {
  return (req as any).userId ?? "unknown";
}

linkedinPublicRouter.get("/linkedin/connect", (req: Request, res: Response) => {
  const auth = getAuth(req);
  if (!auth?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const userId = auth.userId;
  const baseUrl = getBaseUrl(req);
  if (!process.env.LINKEDIN_CLIENT_ID || !process.env.LINKEDIN_CLIENT_SECRET) {
    res.redirect(`${baseUrl}/linkedin?error=not_configured`);
    return;
  }
  try {
    const authUrl = linkedInService.getAuthUrl(userId, baseUrl);
    res.redirect(authUrl);
  } catch (err: any) {
    logger.error({ err }, "LinkedIn connect error");
    res.redirect(`${getBaseUrl(req)}/linkedin?error=not_configured`);
  }
});

linkedinPublicRouter.get("/linkedin/callback", async (req: Request, res: Response) => {
  const { code, state: stateUserId, error } = req.query as Record<string, string>;
  const baseUrl = getBaseUrl(req);

  if (error || !code) {
    logger.warn({ error }, "LinkedIn OAuth denied or errored");
    res.redirect(`${baseUrl}/linkedin?error=${error ?? "cancelled"}`);
    return;
  }

  const userId = stateUserId ?? getAuth(req)?.userId ?? "unknown";

  try {
    await linkedInService.handleCallback(code, userId, baseUrl);
    res.redirect(`${baseUrl}/linkedin?connected=1`);
  } catch (err: any) {
    logger.error({ err }, "LinkedIn callback failed");
    res.redirect(`${baseUrl}/linkedin?error=auth_failed`);
  }
});

linkedinRouter.get("/linkedin/status", (req: Request, res: Response) => {
  const userId = getUserId(req);
  const status = linkedInService.getStatus(userId);
  const profile = linkedInService.getProfile(userId);
  const configured = !!(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET);
  res.json({ status, profile, configured });
});

linkedinRouter.post("/linkedin/disconnect", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  await linkedInService.disconnect(userId);
  res.json({ ok: true });
});

linkedinRouter.get("/linkedin/profile", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (linkedInService.getStatus(userId) !== "connected") {
    res.status(401).json({ error: "Not connected to LinkedIn" });
    return;
  }
  try {
    const profile = await linkedInService.fetchProfile(userId);
    res.json({ profile });
  } catch (err: any) {
    logger.error({ err }, "LinkedIn profile fetch failed");
    res.status(500).json({ error: err.message ?? "Failed to fetch profile" });
  }
});

linkedinRouter.get("/linkedin/conversations", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (linkedInService.getStatus(userId) !== "connected") {
    res.status(401).json({ error: "Not connected to LinkedIn" });
    return;
  }
  try {
    const conversations = await linkedInService.getConversations(userId);
    res.json({ conversations });
  } catch (err: any) {
    if (err.message === "MESSAGING_ACCESS_REQUIRED") {
      res.status(403).json({ error: "MESSAGING_ACCESS_REQUIRED" });
      return;
    }
    logger.error({ err }, "LinkedIn conversations fetch failed");
    res.status(500).json({ error: err.message ?? "Failed to fetch conversations" });
  }
});

linkedinRouter.get("/linkedin/conversations/:convId/messages", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { convId } = req.params;
  if (linkedInService.getStatus(userId) !== "connected") {
    res.status(401).json({ error: "Not connected to LinkedIn" });
    return;
  }
  try {
    const messages = await linkedInService.getMessages(userId, convId);
    res.json({ messages });
  } catch (err: any) {
    if (err.message === "MESSAGING_ACCESS_REQUIRED") {
      res.status(403).json({ error: "MESSAGING_ACCESS_REQUIRED" });
      return;
    }
    logger.error({ err }, "LinkedIn messages fetch failed");
    res.status(500).json({ error: err.message ?? "Failed to fetch messages" });
  }
});

linkedinRouter.post("/linkedin/conversations/:convId/messages", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { convId } = req.params;
  const { text } = req.body as { text?: string };

  if (!text?.trim()) {
    res.status(400).json({ error: "text is required" });
    return;
  }

  if (linkedInService.getStatus(userId) !== "connected") {
    res.status(401).json({ error: "Not connected to LinkedIn" });
    return;
  }

  try {
    await linkedInService.sendMessage(userId, convId, text.trim());
    res.json({ ok: true });
  } catch (err: any) {
    if (err.message === "MESSAGING_ACCESS_REQUIRED") {
      res.status(403).json({ error: "MESSAGING_ACCESS_REQUIRED" });
      return;
    }
    logger.error({ err }, "LinkedIn send message failed");
    res.status(500).json({ error: err.message ?? "Failed to send message" });
  }
});
