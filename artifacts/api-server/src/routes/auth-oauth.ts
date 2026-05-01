import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { upsertOAuthToken, deleteOAuthToken, ensureUser } from "../services/tokenManager";
import { db, mobileSessionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const MICROSOFT_AUTH_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize";
const MICROSOFT_TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";

const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/userinfo.email",
  "openid",
];

const OUTLOOK_SCOPES = [
  "https://graph.microsoft.com/Mail.ReadWrite",
  "https://graph.microsoft.com/User.Read",
  "offline_access",
];

function getRedirectBase(req: any): string {
  if (process.env.PUBLIC_URL) {
    return process.env.PUBLIC_URL.replace(/\/$/, "");
  }
  const proto = req.headers["x-forwarded-proto"] || req.protocol || "https";
  const rawHost: string = req.headers["x-forwarded-host"] || req.headers.host || "";
  const host = rawHost.replace(/:\d+$/, "");
  return `${proto}://${host}`;
}

async function getMobileUserId(token: string): Promise<string | null> {
  try {
    const [session] = await db
      .select()
      .from(mobileSessionsTable)
      .where(eq(mobileSessionsTable.token, token));
    if (!session) return null;
    if (session.expiresAt && session.expiresAt < new Date()) return null;
    return session.userId;
  } catch {
    return null;
  }
}

async function resolveUserId(req: any): Promise<{ userId: string | null; isMobile: boolean }> {
  const mobileToken = req.query.mobileToken as string | undefined;
  if (mobileToken) {
    const userId = await getMobileUserId(mobileToken);
    return { userId, isMobile: true };
  }
  const auth = getAuth(req);
  return { userId: auth?.userId ?? null, isMobile: false };
}

router.get("/auth/gmail/connect", async (req, res) => {
  const { userId, isMobile } = await resolveUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    res.status(503).json({ error: "Gmail OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET." });
    return;
  }

  const base = getRedirectBase(req);
  const redirectUri = `${base}/api/auth/gmail/callback`;
  const state = Buffer.from(JSON.stringify({ userId, redirect: "/settings", mobile: isMobile })).toString("base64url");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GMAIL_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  });

  res.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
});

router.get("/auth/gmail/callback", async (req, res) => {
  const { code, state, error } = req.query as Record<string, string>;

  if (error) {
    res.redirect(`/?error=gmail_oauth_denied`);
    return;
  }

  let stateData: { userId: string; redirect?: string; mobile?: boolean } | null = null;
  try {
    stateData = JSON.parse(Buffer.from(state, "base64url").toString());
  } catch {
    res.status(400).json({ error: "Invalid state" });
    return;
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    res.status(503).json({ error: "Gmail OAuth not configured" });
    return;
  }

  const base = getRedirectBase(req);
  const redirectUri = `${base}/api/auth/gmail/callback`;

  try {
    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = (await tokenRes.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      token_type?: string;
    };

    if (!tokenData.access_token) {
      res.redirect(`/?error=gmail_token_failed`);
      return;
    }

    const profileRes = await fetch("https://www.googleapis.com/oauth2/v1/userinfo?alt=json", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = profileRes.ok ? (await profileRes.json()) as { email?: string } : null;

    const expiresAt = tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : null;
    await ensureUser(stateData.userId, { email: profile?.email ?? null });
    await upsertOAuthToken(stateData.userId, "gmail", {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token ?? null,
      expiresAt,
      email: profile?.email ?? null,
    });

    if (stateData.mobile) {
      res.redirect(`${base}/api/mobile-oauth-complete?connected=gmail`);
    } else {
      res.redirect(`/settings?connected=gmail`);
    }
  } catch (err) {
    console.error("[Gmail callback] unhandled error:", err);
    res.redirect(`/?error=gmail_callback_failed`);
  }
});

router.get("/auth/outlook/connect", async (req, res) => {
  const { userId, isMobile } = await resolveUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const clientId = process.env.MICROSOFT_CLIENT_ID;
  if (!clientId) {
    res.status(503).json({ error: "Outlook OAuth not configured. Set MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET." });
    return;
  }

  const base = getRedirectBase(req);
  const redirectUri = `${base}/api/auth/outlook/callback`;
  const state = Buffer.from(JSON.stringify({ userId, redirect: "/settings", mobile: isMobile })).toString("base64url");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: OUTLOOK_SCOPES.join(" "),
    state,
    prompt: "consent",
  });

  res.redirect(`${MICROSOFT_AUTH_URL}?${params.toString()}`);
});

router.get("/auth/outlook/callback", async (req, res) => {
  const { code, state, error } = req.query as Record<string, string>;

  if (error) {
    res.redirect(`/?error=outlook_oauth_denied`);
    return;
  }

  let stateData: { userId: string; redirect?: string; mobile?: boolean } | null = null;
  try {
    stateData = JSON.parse(Buffer.from(state, "base64url").toString());
  } catch {
    res.status(400).json({ error: "Invalid state" });
    return;
  }

  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    res.status(503).json({ error: "Outlook OAuth not configured" });
    return;
  }

  const base = getRedirectBase(req);
  const redirectUri = `${base}/api/auth/outlook/callback`;

  try {
    const tokenRes = await fetch(MICROSOFT_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
        scope: OUTLOOK_SCOPES.join(" "),
      }),
    });

    const tokenData = (await tokenRes.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
    };

    if (!tokenData.access_token) {
      res.redirect(`/?error=outlook_token_failed`);
      return;
    }

    const profileRes = await fetch("https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = profileRes.ok ? (await profileRes.json()) as { mail?: string; userPrincipalName?: string } : null;

    const expiresAt = tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : null;
    const outlookEmail = profile?.mail ?? profile?.userPrincipalName ?? null;
    await ensureUser(stateData.userId, { email: outlookEmail });
    await upsertOAuthToken(stateData.userId, "outlook", {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token ?? null,
      expiresAt,
      email: outlookEmail,
    });

    if (stateData.mobile) {
      res.redirect(`${base}/api/mobile-oauth-complete?connected=outlook`);
    } else {
      res.redirect(`/settings?connected=outlook`);
    }
  } catch {
    res.redirect(`/?error=outlook_callback_failed`);
  }
});

router.get("/mobile-oauth-complete", (req, res) => {
  const connected = (req.query.connected as string) ?? "account";
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Connected</title>
        <style>
          body { font-family: -apple-system, sans-serif; display: flex; align-items: center; justify-content: center;
                 min-height: 100vh; margin: 0; background: #0f172a; color: #f1f5f9; text-align: center; padding: 24px; }
          .card { max-width: 320px; }
          .icon { font-size: 48px; margin-bottom: 16px; }
          h1 { font-size: 22px; margin: 0 0 8px; }
          p { font-size: 15px; color: #94a3b8; margin: 0; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">✅</div>
          <h1>${connected.charAt(0).toUpperCase() + connected.slice(1)} Connected!</h1>
          <p>You can close this window and return to PinnboxIO.</p>
        </div>
      </body>
    </html>
  `);
});

router.delete("/auth/gmail/disconnect", async (req: any, res) => {
  await deleteOAuthToken(req.userId, "gmail");
  res.json({ success: true });
});

router.delete("/auth/outlook/disconnect", async (req: any, res) => {
  await deleteOAuthToken(req.userId, "outlook");
  res.json({ success: true });
});

export default router;
