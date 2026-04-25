import { Router, type Request, type Response } from "express";
import crypto from "crypto";
import { db, usersTable, mobileSessionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { ensureUser } from "../services/tokenManager";
import { logger } from "../lib/logger";

const router = Router();

const REPLIT_OIDC_TOKEN_URL = "https://replit.com/oidc/token";
const REPLIT_OIDC_USERINFO_URL = "https://replit.com/oidc/userinfo";
const APP_SCHEME = "pinnboxio";
const SESSION_TTL_DAYS = 90;

function generateToken(): string {
  return crypto.randomBytes(48).toString("hex");
}

function getPublicBase(req: Request): string {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/$/, "");
  const proto = req.headers["x-forwarded-proto"] || req.protocol || "https";
  const host = (req.headers["x-forwarded-host"] || req.headers.host || "localhost").toString().replace(/:\d+$/, "");
  return `${proto}://${host}`;
}

async function exchangeOidcCode(params: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
  clientId: string;
}): Promise<{ accessToken: string; idToken?: string } | null> {
  try {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code: params.code,
      code_verifier: params.codeVerifier,
      redirect_uri: params.redirectUri,
      client_id: params.clientId,
    });

    const res = await fetch(REPLIT_OIDC_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      logger.error({ status: res.status, text }, "Replit OIDC token exchange failed");
      return null;
    }

    const data = await res.json();
    return { accessToken: data.access_token, idToken: data.id_token };
  } catch (err) {
    logger.error({ err }, "Replit OIDC token exchange error");
    return null;
  }
}

async function fetchReplitUserInfo(accessToken: string): Promise<{
  sub: string;
  email?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
} | null> {
  try {
    const res = await fetch(REPLIT_OIDC_USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function createMobileSession(userId: string): Promise<string> {
  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_TTL_DAYS);

  await db.insert(mobileSessionsTable).values({ token, userId, expiresAt });
  return token;
}

export async function getMobileSessionUser(token: string): Promise<string | null> {
  try {
    const [session] = await db
      .select()
      .from(mobileSessionsTable)
      .where(eq(mobileSessionsTable.token, token));

    if (!session) return null;
    if (session.expiresAt && session.expiresAt < new Date()) {
      await db.delete(mobileSessionsTable).where(eq(mobileSessionsTable.token, token));
      return null;
    }
    return session.userId;
  } catch {
    return null;
  }
}

router.get("/mobile-auth/callback", (req: Request, res: Response) => {
  const { code, state, error } = req.query as Record<string, string>;

  if (error) {
    const redirectUrl = `${APP_SCHEME}://callback?error=${encodeURIComponent(error)}`;
    res.redirect(redirectUrl);
    return;
  }

  if (!code) {
    res.redirect(`${APP_SCHEME}://callback?error=missing_code`);
    return;
  }

  const redirectUrl = `${APP_SCHEME}://callback?code=${encodeURIComponent(code)}${state ? `&state=${encodeURIComponent(state)}` : ""}`;
  res.redirect(redirectUrl);
});

router.post("/mobile-auth/token-exchange", async (req: Request, res: Response) => {
  const { code, code_verifier, redirect_uri, state, nonce } = req.body as {
    code?: string;
    code_verifier?: string;
    redirect_uri?: string;
    state?: string;
    nonce?: string;
  };

  if (!code || !code_verifier || !redirect_uri) {
    res.status(400).json({ error: "code, code_verifier, and redirect_uri are required" });
    return;
  }

  const clientId = process.env.REPL_ID;
  if (!clientId) {
    logger.error("REPL_ID env var not set — cannot do Replit OIDC token exchange");
    res.status(500).json({ error: "Server misconfiguration" });
    return;
  }

  const tokens = await exchangeOidcCode({ code, codeVerifier: code_verifier, redirectUri: redirect_uri, clientId });
  if (!tokens) {
    res.status(401).json({ error: "Failed to exchange authorization code" });
    return;
  }

  const userInfo = await fetchReplitUserInfo(tokens.accessToken);
  if (!userInfo) {
    res.status(401).json({ error: "Failed to fetch user info" });
    return;
  }

  const userId = userInfo.sub;
  const email = userInfo.email ?? null;
  const firstName = userInfo.given_name ?? (userInfo.name ? userInfo.name.split(" ")[0] : null) ?? null;
  const lastName = userInfo.family_name ?? (userInfo.name && userInfo.name.includes(" ") ? userInfo.name.split(" ").slice(1).join(" ") : null) ?? null;
  const profileImageUrl = userInfo.picture ?? null;

  await ensureUser(userId, { email: email ?? undefined });

  await db
    .update(usersTable)
    .set({
      ...(email ? { email } : {}),
      ...(firstName ? { firstName } : {}),
      ...(lastName ? { lastName } : {}),
      ...(profileImageUrl ? { profileImageUrl } : {}),
    })
    .where(eq(usersTable.id, userId));

  const sessionToken = await createMobileSession(userId);

  res.json({
    token: sessionToken,
    user: { id: userId, email, firstName, lastName, profileImageUrl },
  });
});

router.post("/mobile-auth/logout", async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace(/^Bearer\s+/i, "");

  if (token) {
    await db.delete(mobileSessionsTable).where(eq(mobileSessionsTable.token, token)).catch(() => {});
  }

  res.json({ ok: true });
});

router.get("/auth/user", async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace(/^Bearer\s+/i, "");

  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const userId = await getMobileSessionUser(token);
  if (!userId) {
    res.status(401).json({ error: "Invalid or expired session" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({
    user: {
      id: user.id,
      email: user.email ?? null,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
      profileImageUrl: user.profileImageUrl ?? null,
    },
  });
});

export default router;
