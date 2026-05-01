import { Router, type Request, type Response } from "express";
import crypto from "crypto";
import { db, usersTable, mobileSessionsTable, mobilePkceSessionsTable, mobileTokenResultsTable } from "@workspace/db";
import { eq, lt } from "drizzle-orm";
import { ensureUser } from "../services/tokenManager";
import { logger } from "../lib/logger";

const router = Router();

const REPLIT_OIDC_TOKEN_URL = "https://replit.com/oidc/token";
const REPLIT_OIDC_USERINFO_URL = "https://replit.com/oidc/userinfo";
const APP_SCHEME = "pinnboxio";
const SESSION_TTL_DAYS = 90;
const PKCE_TTL_MINUTES = 15;
const TOKEN_RESULT_TTL_MINUTES = 15;

// Periodically clean up expired DB rows (fire and forget)
setInterval(async () => {
  try {
    const now = new Date();
    await db.delete(mobilePkceSessionsTable).where(lt(mobilePkceSessionsTable.expiresAt, now));
    await db.delete(mobileTokenResultsTable).where(lt(mobileTokenResultsTable.expiresAt, now));
  } catch { /* best-effort */ }
}, 5 * 60 * 1000);

function generateToken(): string {
  return crypto.randomBytes(48).toString("hex");
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

interface OidcUserClaims {
  sub: string;
  email?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
}

/**
 * Decodes the payload of a JWT without signature verification.
 * Safe here because we received the token directly from Replit's token endpoint
 * over TLS — we trust its provenance without needing to re-verify the signature.
 */
function decodeIdTokenClaims(idToken: string): OidcUserClaims | null {
  try {
    const parts = idToken.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = Buffer.from(payload, "base64").toString("utf-8");
    const claims = JSON.parse(json) as OidcUserClaims;
    if (!claims.sub) return null;
    return claims;
  } catch (err) {
    logger.warn({ err }, "Failed to decode ID token claims");
    return null;
  }
}

async function fetchReplitUserInfo(accessToken: string): Promise<OidcUserClaims | null> {
  try {
    const res = await fetch(REPLIT_OIDC_USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      logger.error({ status: res.status, body }, "Replit userinfo endpoint returned non-OK status");
      return null;
    }
    return await res.json() as OidcUserClaims;
  } catch (err) {
    logger.error({ err }, "Replit userinfo fetch failed with exception");
    return null;
  }
}

/**
 * Resolves user profile claims from an OIDC token response.
 * Prefers the ID token (no extra round-trip) and falls back to the userinfo endpoint.
 */
async function resolveUserClaims(accessToken: string, idToken?: string): Promise<OidcUserClaims | null> {
  if (idToken) {
    const claims = decodeIdTokenClaims(idToken);
    if (claims) {
      logger.info({ sub: claims.sub }, "Resolved user claims from ID token");
      return claims;
    }
    logger.warn("ID token present but could not be decoded — falling back to userinfo endpoint");
  }
  logger.info("No ID token available — fetching from userinfo endpoint");
  return fetchReplitUserInfo(accessToken);
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
 * Persists the PKCE code_verifier + redirect_uri keyed by state to the
 * database so the server can exchange the code on callback without relying
 * on in-memory state that would be lost on a server restart.
 */
router.post("/mobile-auth/prepare", async (req: Request, res: Response) => {
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

  const expiresAt = new Date(Date.now() + PKCE_TTL_MINUTES * 60 * 1000);

  try {
    await db
      .insert(mobilePkceSessionsTable)
      .values({ state, codeVerifier: code_verifier, nonce, redirectUri: redirect_uri, expiresAt })
      .onConflictDoUpdate({
        target: mobilePkceSessionsTable.state,
        set: { codeVerifier: code_verifier, nonce, redirectUri: redirect_uri, expiresAt },
      });
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "Failed to store PKCE session");
    res.status(500).json({ error: "Failed to prepare auth session" });
  }
});

/**
 * GET /mobile-auth/poll/:state
 *
 * The mobile app polls this every 2 s after opening the OAuth browser.
 * Returns {status:"pending"} until the callback fires, then
 * {status:"complete", token} or {status:"error", error}.
 * Token entry is consumed on first read.
 */
router.get("/mobile-auth/poll/:state", async (req: Request, res: Response) => {
  const { state } = req.params;

  // Prevent Express ETag / 304 caching — every poll must return a fresh response
  // so the client can detect the transition from "pending" → "complete".
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.setHeader("Pragma", "no-cache");

  try {
    const [entry] = await db
      .select()
      .from(mobileTokenResultsTable)
      .where(eq(mobileTokenResultsTable.state, state));

    if (!entry) {
      res.json({ status: "pending" });
      return;
    }

    // Consume the entry (one-time read)
    await db.delete(mobileTokenResultsTable).where(eq(mobileTokenResultsTable.state, state));

    res.json(entry.status === "complete"
      ? { status: "complete", token: entry.token }
      : { status: "error", error: entry.error ?? "sign_in_failed" });
  } catch (err) {
    logger.error({ err }, "Poll DB error");
    res.json({ status: "pending" });
  }
});

/**
 * GET /mobile-auth/callback
 *
 * Replit redirects here after the user approves OAuth.
 * Looks up the pre-registered PKCE session from the DB, exchanges the code
 * server-side, creates a mobile session, persists the result for polling,
 * then serves an HTML page that the user sees in the browser.
 */
router.get("/mobile-auth/callback", async (req: Request, res: Response) => {
  const { code, state, error } = req.query as Record<string, string>;
  const deepLinkBase = `${APP_SCHEME}://callback`;

  function serveBrowserPage(title: string, message: string, isSuccess: boolean) {
    const color = isSuccess ? "#2563eb" : "#dc2626";
    res.setHeader("Content-Type", "text/html");
    res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:-apple-system,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100dvh;margin:0;background:#f9fafb;padding:24px;box-sizing:border-box}h1{font-size:22px;font-weight:700;color:${color};margin-bottom:12px}p{font-size:15px;color:#374151;text-align:center;line-height:1.5}a{display:inline-block;margin-top:24px;padding:12px 28px;background:${color};color:#fff;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px}</style></head><body><h1>${title}</h1><p>${message}</p><a href="${deepLinkBase}">Return to PinnboxIO</a></body></html>`);
  }

  if (error) {
    if (state) {
      const expiresAt = new Date(Date.now() + TOKEN_RESULT_TTL_MINUTES * 60 * 1000);
      await db.insert(mobileTokenResultsTable)
        .values({ state, status: "error", error, expiresAt })
        .onConflictDoUpdate({ target: mobileTokenResultsTable.state, set: { status: "error", error, expiresAt } })
        .catch(() => {});
    }
    serveBrowserPage("Sign-in cancelled", "The sign-in was cancelled or an error occurred. You can close this window.", false);
    return;
  }

  if (!code || !state) {
    serveBrowserPage("Sign-in error", "Missing authorization code. Please try again.", false);
    return;
  }

  // Look up the pre-registered PKCE session from DB
  let pkce: { codeVerifier: string; nonce: string; redirectUri: string; expiresAt: Date } | null = null;
  try {
    const [row] = await db
      .select()
      .from(mobilePkceSessionsTable)
      .where(eq(mobilePkceSessionsTable.state, state));
    if (row) {
      pkce = { codeVerifier: row.codeVerifier, nonce: row.nonce, redirectUri: row.redirectUri, expiresAt: row.expiresAt };
      await db.delete(mobilePkceSessionsTable).where(eq(mobilePkceSessionsTable.state, state));
    }
  } catch (err) {
    logger.error({ err }, "DB error looking up PKCE session");
  }

  if (!pkce || pkce.expiresAt < new Date()) {
    const expiresAt = new Date(Date.now() + TOKEN_RESULT_TTL_MINUTES * 60 * 1000);
    await db.insert(mobileTokenResultsTable)
      .values({ state, status: "error", error: "session_expired", expiresAt })
      .onConflictDoUpdate({ target: mobileTokenResultsTable.state, set: { status: "error", error: "session_expired", expiresAt } })
      .catch(() => {});
    serveBrowserPage("Session expired", "Your sign-in session expired. Please return to the app and try again.", false);
    return;
  }

  const clientId = process.env.REPL_ID;
  if (!clientId) {
    const expiresAt = new Date(Date.now() + TOKEN_RESULT_TTL_MINUTES * 60 * 1000);
    await db.insert(mobileTokenResultsTable)
      .values({ state, status: "error", error: "server_misconfiguration", expiresAt })
      .onConflictDoUpdate({ target: mobileTokenResultsTable.state, set: { status: "error", error: "server_misconfiguration", expiresAt } })
      .catch(() => {});
    serveBrowserPage("Server error", "The server is misconfigured. Please try again later.", false);
    return;
  }

  const tokens = await exchangeOidcCode({
    code,
    codeVerifier: pkce.codeVerifier,
    redirectUri: pkce.redirectUri,
    clientId,
  });

  if (!tokens) {
    const expiresAt = new Date(Date.now() + TOKEN_RESULT_TTL_MINUTES * 60 * 1000);
    await db.insert(mobileTokenResultsTable)
      .values({ state, status: "error", error: "exchange_failed", expiresAt })
      .onConflictDoUpdate({ target: mobileTokenResultsTable.state, set: { status: "error", error: "exchange_failed", expiresAt } })
      .catch(() => {});
    serveBrowserPage("Sign-in failed", "Could not verify your identity with Replit. Please try again.", false);
    return;
  }

  const userInfo = await resolveUserClaims(tokens.accessToken, tokens.idToken);
  if (!userInfo) {
    const expiresAt = new Date(Date.now() + TOKEN_RESULT_TTL_MINUTES * 60 * 1000);
    await db.insert(mobileTokenResultsTable)
      .values({ state, status: "error", error: "userinfo_failed", expiresAt })
      .onConflictDoUpdate({ target: mobileTokenResultsTable.state, set: { status: "error", error: "userinfo_failed", expiresAt } })
      .catch(() => {});
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

  // Persist for polling
  const resultExpiresAt = new Date(Date.now() + TOKEN_RESULT_TTL_MINUTES * 60 * 1000);
  await db.insert(mobileTokenResultsTable)
    .values({ state, status: "complete", token: sessionToken, expiresAt: resultExpiresAt })
    .onConflictDoUpdate({ target: mobileTokenResultsTable.state, set: { status: "complete", token: sessionToken, expiresAt: resultExpiresAt } })
    .catch((err) => logger.error({ err }, "Failed to store token result"));

  logger.info({ userId }, "Mobile OAuth session created, stored for polling");

  const returnUrl = `${deepLinkBase}?state=${encodeURIComponent(state)}`;
  res.setHeader("Content-Type", "text/html");
  res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:-apple-system,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100dvh;margin:0;background:#f9fafb;padding:24px;box-sizing:border-box}h1{font-size:22px;font-weight:700;color:#2563eb;margin-bottom:12px}p{font-size:15px;color:#374151;text-align:center;line-height:1.5}a{display:inline-block;margin-top:24px;padding:12px 28px;background:#2563eb;color:#fff;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px}</style><script>window.location="${returnUrl}";</script></head><body><h1>You're signed in!</h1><p>Returning you to PinnboxIO…</p><a href="${returnUrl}">Open PinnboxIO</a></body></html>`);
});

router.post("/mobile-auth/token-exchange", async (req: Request, res: Response) => {
  const { code, code_verifier, redirect_uri } = req.body as {
    code?: string;
    code_verifier?: string;
    redirect_uri?: string;
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

  const userInfo = await resolveUserClaims(tokens.accessToken, tokens.idToken);
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
  await db.update(usersTable).set({
    ...(email ? { email } : {}),
    ...(firstName ? { firstName } : {}),
    ...(lastName ? { lastName } : {}),
    ...(profileImageUrl ? { profileImageUrl } : {}),
  }).where(eq(usersTable.id, userId));

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
