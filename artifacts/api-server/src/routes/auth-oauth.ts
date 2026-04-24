import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { upsertOAuthToken, deleteOAuthToken } from "../services/tokenManager";

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
  const proto = req.headers["x-forwarded-proto"] || req.protocol || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${proto}://${host}`;
}

router.get("/auth/gmail/connect", (req, res) => {
  const auth = getAuth(req);
  if (!auth?.userId) {
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
  const state = Buffer.from(JSON.stringify({ userId: auth.userId, redirect: "/settings" })).toString("base64url");

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

  let stateData: { userId: string; redirect?: string } | null = null;
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
    await upsertOAuthToken(stateData.userId, "gmail", {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token ?? null,
      expiresAt,
      email: profile?.email ?? null,
    });

    res.redirect(`/settings?connected=gmail`);
  } catch {
    res.redirect(`/?error=gmail_callback_failed`);
  }
});

router.get("/auth/outlook/connect", (req, res) => {
  const auth = getAuth(req);
  if (!auth?.userId) {
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
  const state = Buffer.from(JSON.stringify({ userId: auth.userId, redirect: "/settings" })).toString("base64url");

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

  let stateData: { userId: string; redirect?: string } | null = null;
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
    await upsertOAuthToken(stateData.userId, "outlook", {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token ?? null,
      expiresAt,
      email: profile?.mail ?? profile?.userPrincipalName ?? null,
    });

    res.redirect(`/settings?connected=outlook`);
  } catch {
    res.redirect(`/?error=outlook_callback_failed`);
  }
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
