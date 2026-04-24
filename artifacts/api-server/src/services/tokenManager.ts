import { db, userOAuthTokensTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";

export async function getOAuthToken(userId: string, provider: string) {
  const [row] = await db
    .select()
    .from(userOAuthTokensTable)
    .where(and(eq(userOAuthTokensTable.userId, userId), eq(userOAuthTokensTable.provider, provider)));
  return row ?? null;
}

export async function upsertOAuthToken(
  userId: string,
  provider: string,
  data: {
    accessToken: string;
    refreshToken?: string | null;
    expiresAt?: Date | null;
    email?: string | null;
    scope?: string | null;
  }
) {
  const existing = await getOAuthToken(userId, provider);
  if (existing) {
    const [updated] = await db
      .update(userOAuthTokensTable)
      .set({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken ?? existing.refreshToken,
        expiresAt: data.expiresAt ?? existing.expiresAt,
        email: data.email ?? existing.email,
        scope: data.scope ?? existing.scope,
      })
      .where(and(eq(userOAuthTokensTable.userId, userId), eq(userOAuthTokensTable.provider, provider)))
      .returning();
    return updated;
  }
  const [created] = await db
    .insert(userOAuthTokensTable)
    .values({
      userId,
      provider,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken ?? null,
      expiresAt: data.expiresAt ?? null,
      email: data.email ?? null,
      scope: data.scope ?? null,
    })
    .returning();
  return created;
}

export async function deleteOAuthToken(userId: string, provider: string) {
  await db
    .delete(userOAuthTokensTable)
    .where(and(eq(userOAuthTokensTable.userId, userId), eq(userOAuthTokensTable.provider, provider)));
}

export async function refreshGmailToken(userId: string): Promise<string | null> {
  const token = await getOAuthToken(userId, "gmail");
  if (!token?.refreshToken) return null;

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: token.refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { access_token: string; expires_in?: number };
    const expiresAt = data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null;
    await upsertOAuthToken(userId, "gmail", { accessToken: data.access_token, expiresAt });
    return data.access_token;
  } catch {
    return null;
  }
}

export async function refreshOutlookToken(userId: string): Promise<string | null> {
  const token = await getOAuthToken(userId, "outlook");
  if (!token?.refreshToken) return null;

  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  try {
    const res = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: token.refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
        scope: "https://graph.microsoft.com/Mail.ReadWrite https://graph.microsoft.com/User.Read offline_access",
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { access_token: string; expires_in?: number; refresh_token?: string };
    const expiresAt = data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null;
    await upsertOAuthToken(userId, "outlook", {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? null,
      expiresAt,
    });
    return data.access_token;
  } catch {
    return null;
  }
}

export async function getValidGmailToken(userId: string): Promise<string | null> {
  const token = await getOAuthToken(userId, "gmail");
  if (!token) return null;
  if (token.expiresAt && token.expiresAt <= new Date(Date.now() + 60_000)) {
    return await refreshGmailToken(userId);
  }
  return token.accessToken;
}

export async function getValidOutlookToken(userId: string): Promise<string | null> {
  const token = await getOAuthToken(userId, "outlook");
  if (!token) return null;
  if (token.expiresAt && token.expiresAt <= new Date(Date.now() + 60_000)) {
    return await refreshOutlookToken(userId);
  }
  return token.accessToken;
}
