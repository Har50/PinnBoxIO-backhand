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

// ---------------------------------------------------------------------------
// In-memory PKCE session store
// Before opening the OAuth browser, the mobile client POSTs its code_verifier +
// redirect_uri keyed by state. The callback route looks this up to do the token
// exchange server-side, which avoids any deep-link dependency in Expo Go.
// ---------------------------------------------------------------------------
interface PkceEntry {
  codeVerifier: string;
  nonce: string;
  redirectUri: string;
  createdAt: number;
}

type TokenEntry =
  | { status: "complete"; token: string }
  | { status: "error"; error: string };

const pkceStore = new Map<string, PkceEntry>();
const tokenStore = new Map<string, TokenEntry>();

setInterval(() => {
  const cutoff = Date.now() - 15 * 60 * 1000;
  for (const [k, v] of pkceStore) {
    if (v.createdAt < cutoff) pkceStore.delete(k);
  }
  // Drain token store entries older than 15 min (shouldn't accumulate, just safety)
  if (tokenStore.size > 500) {
    const keys = [...tokenStore.keys()].slice(0, 250);
    keys.forEach((k) => tokenStore.delete(k));
  }
}, 5 * 60 * 1000);

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

router.get("/login", (req: Request, res: Response) => {
  const base = process.env.PUBLIC_URL?.replace(/\/$/, "") ?? "";
  const returnTo = (req.query.returnTo as string) ?? "/";
  res.redirect(`${base}/sign-in`);
});

router.get("/logout", (req: Request, res: Response) => {
  const base = process.env.PUBLIC_URL?.replace(/\/$/, "") ?? "";
  res.redirect(`${base}/sign-in`);
});

/**
 * POST /mobile-auth/prepare
 *
 * Called by the mobile app BEFORE opening the OAuth browser.
 * Stores the PKCE code_verifier + redirect_uri keyed by the OAuth state so
 * the server can do the token exchange itself when the callback fires,
 * without the app needing a working deep link.
 */
router.post("/mobile-auth/prepare", (req: Request, res: Response) => {
  const { state, code_verifier, nonce, redirect_uri } = req.body as {
    state?: string;
    code_verifier?: string;
    nonce?: string;
    redirect_uri?: string;
  };

  if (!state || !code_verifier || !nonce || !redirect_uri) {
    res.status(400).json({ error: "state, code_verifier, nonce, redirect_uri required" });
    return;
  }

  pkceStore.set(state, { codeVerifier: code_verifier, nonce, redirectUri: redirect_uri, createdAt: Date.now() });
  res.json({ ok: true });
});

/**
 * GET /mobile-auth/poll/:state
 *
 * Long-poll endpoint: the mobile app calls this every 2 s after opening the
 * OAuth browser.  Returns `{status:"pending"}` until the callback fires, then
 * `{status:"complete", token}` or `{status:"error", error}`.
 * Token is consumed on first read.
 */
router.get("/mobile-auth/poll/:state", (req: Request, res: Response) => {
  const { state } = req.params;
  const entry = tokenStore.get(state);
  if (!entry) {
    res.json({ status: "pending" });
    return;
  }
  tokenStore.delete(state); // one-time consume
  res.json(entry);
});

/**
 * GET /mobile-auth/callback
 *
 * Replit redirects here after the user approves OAuth.
 * We look up the pre-registered PKCE session, exchange the code server-side,
 * create a mobile session, store it for polling, then try a deep-link redirect
 * so standalone builds get an instant return to the app.
 */
router.get("/mobile-auth/callback", async (req: Request, res: Response) => {
  const { code, state, error } = req.query as Record<string, string>;

  const deepLinkBase = `${APP_SCHEME}://callback`;

  // Helper: serve a simple in-browser HTML page (Expo Go users will see this)
  function serveBrowserPage(title: string, message: string, isSuccess: boolean) {
    const color = isSuccess ? "#2563eb" : "#dc2626";
    res.setHeader("Content-Type", "text/html");
    res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:-apple-system,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100dvh;margin:0;background:#f9fafb;padding:24px;box-sizing:border-box}h1{font-size:22px;font-weight:700;color:${color};margin-bottom:12px}p{font-size:15px;color:#374151;text-align:center;line-height:1.5}a{display:inline-block;margin-top:24px;padding:12px 28px;background:${color};color:#fff;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px}</style></head><body><h1>${title}</h1><p>${message}</p><a href="${deepLinkBase}">Return to PinnboxIO</a></body></html>`);
  }

  if (error) {
    if (state) tokenStore.set(state, { status: "error", error });
    serveBrowserPage("Sign-in cancelled", "The sign-in was cancelled or an error occurred. You can close this window.", false);
    return;
  }

  if (!code || !state) {
    serveBrowserPage("Sign-in error", "Missing authorization code. Please try again.", false);
    return;
  }

  // Look up the pre-registered PKCE session
  const pkce = pkceStore.get(state);
  if (!pkce) {
    tokenStore.set(state, { status: "error", error: "session_expired" });
    serveBrowserPage("Session expired", "Your sign-in session expired. Please return to the app and try again.", false);
    return;
  }
  pkceStore.delete(state); // consume

  const clientId = process.env.REPL_ID;
  if (!clientId) {
    tokenStore.set(state, { status: "error", error: "server_misconfiguration" });
    serveBrowserPage("Server error", "The server is misconfigured. Please try again later.", false);
    return;
  }

  // Exchange the code using the stored code_verifier and redirect_uri
  const tokens = await exchangeOidcCode({
    code,
    codeVerifier: pkce.codeVerifier,
    redirectUri: pkce.redirectUri,
    clientId,
  });

  if (!tokens) {
    tokenStore.set(state, { status: "error", error: "exchange_failed" });
    serveBrowserPage("Sign-in failed", "Could not verify your identity with Replit. Please try again.", false);
    return;
  }

  const userInfo = await fetchReplitUserInfo(tokens.accessToken);
  if (!userInfo) {
    tokenStore.set(state, { status: "error", error: "userinfo_failed" });
    serveBrowserPage("Sign-in failed", "Could not retrieve your profile. Please try again.", false);
    return;
  }

  const userId = userInfo.sub;
  const email = userInfo.email ?? null;
  const firstName = userInfo.given_name ?? (userInfo.name ? userInfo.name.split(" ")[0] : null) ?? null;
  const lastName = userInfo.family_name ?? (userInfo.name && userInfo.name.includes(" ") ? userInfo.name.split(" ").slice(1).join(" ") : null) ?? null;
  const profileImageUrl = userInfo.picture ?? null;

  await ensureUser(userId, { email: email ?? undefined });
  await db.update(usersTable).set({
    ...(email ? { email } : {}),
    ...(firstName ? { firstName } : {}),
    ...(lastName ? { lastName } : {}),
    ...(profileImageUrl ? { profileImageUrl } : {}),
  }).where(eq(usersTable.id, userId));

  const sessionToken = await createMobileSession(userId);

  // Store for polling — the mobile app will pick this up
  tokenStore.set(state, { status: "complete", token: sessionToken });
  logger.info({ userId }, "Mobile OAuth session created, stored for polling");

  // Serve a success page that also attempts a deep-link redirect via JS.
  // • Standalone builds: JS `window.location` opens the app immediately.
  // • Expo Go: the deep link won't open anything useful, but polling will
  //   have already completed auth. The user can close this browser tab.
  const returnUrl = `${deepLinkBase}?state=${encodeURIComponent(state)}`;
  res.setHeader("Content-Type", "text/html");
  res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:-apple-system,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100dvh;margin:0;background:#f9fafb;padding:24px;box-sizing:border-box}h1{font-size:22px;font-weight:700;color:#2563eb;margin-bottom:12px}p{font-size:15px;color:#374151;text-align:center;line-height:1.5}a{display:inline-block;margin-top:24px;padding:12px 28px;background:#2563eb;color:#fff;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px}</style><script>window.location="${returnUrl}";</script></head><body><h1>You're signed in!</h1><p>Returning you to PinnboxIO…</p><a href="${returnUrl}">Open PinnboxIO</a></body></html>`);
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
