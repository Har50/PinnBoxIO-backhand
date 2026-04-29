import { Router, type Request, type Response } from "express";
import { getAuth } from "@clerk/express";
import { linkedInService } from "../services/linkedin";
import { getOAuthToken } from "../services/tokenManager";
import { logger } from "../lib/logger";

export const linkedinPublicRouter = Router();
export const linkedinRouter = Router();

function getBaseUrl(req: Request): string {
  if (process.env.LINKEDIN_REDIRECT_BASE_URL) {
    return process.env.LINKEDIN_REDIRECT_BASE_URL.replace(/\/$/, "");
  }
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
    res.redirect(`${baseUrl}/settings?error=linkedin_not_configured`);
    return;
  }
  try {
    const authUrl = linkedInService.getAuthUrl(userId, baseUrl);
    res.redirect(authUrl);
  } catch (err: any) {
    logger.error({ err }, "LinkedIn connect error");
    res.redirect(`${getBaseUrl(req)}/settings?error=linkedin_not_configured`);
  }
});

linkedinPublicRouter.get("/linkedin/callback", async (req: Request, res: Response) => {
  const { code, state: stateUserId, error } = req.query as Record<string, string>;
  const baseUrl = getBaseUrl(req);

  if (error || !code) {
    logger.warn({ error }, "LinkedIn OAuth denied or errored");
    res.redirect(`${baseUrl}/settings?error=${error ?? "cancelled"}`);
    return;
  }

  const userId = stateUserId ?? getAuth(req)?.userId ?? "unknown";

  try {
    await linkedInService.handleCallback(code, userId, baseUrl);
    res.redirect(`${baseUrl}/settings?linkedin_connected=1`);
  } catch (err: any) {
    logger.error({ err }, "LinkedIn callback failed");
    res.redirect(`${baseUrl}/settings?error=linkedin_auth_failed`);
  }
});

linkedinRouter.get("/linkedin/status", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  await linkedInService.ensureSession(userId);
  const status = linkedInService.getStatus(userId);
  const configured = !!(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET);
  res.json({ status, configured });
});

linkedinRouter.post("/linkedin/disconnect", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  await linkedInService.disconnect(userId);
  res.json({ ok: true });
});

/**
 * Check if any PinnboxIO user has verified their LinkedIn account.
 * Used to show the "LinkedIn Verified" badge on contacts and profiles.
 */
linkedinRouter.get("/linkedin/verified/:userId", async (req: Request, res: Response) => {
  const { userId } = req.params;
  try {
    const token = await getOAuthToken(userId, "linkedin");
    const verified = !!(token && token.expiresAt && token.expiresAt.getTime() > Date.now());
    res.json({ verified });
  } catch {
    res.json({ verified: false });
  }
});
