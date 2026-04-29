import { EventEmitter } from "events";
import { logger } from "../lib/logger";
import {
  getOAuthToken,
  upsertOAuthToken,
  deleteOAuthToken,
  ensureUser,
} from "./tokenManager";

const LINKEDIN_AUTH = "https://www.linkedin.com/oauth/v2";

export type LinkedInStatus = "disconnected" | "connected" | "error";

const SCOPES = [
  "openid",
  "profile",
  "email",
];

interface UserSession {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

class LinkedInService extends EventEmitter {
  private sessions: Map<string, UserSession> = new Map();

  getAuthUrl(userId: string, baseUrl: string): string {
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    if (!clientId) throw new Error("LINKEDIN_CLIENT_ID not configured");

    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: `${baseUrl}/api/linkedin/callback`,
      state: userId,
      scope: SCOPES.join(" "),
    });
    return `${LINKEDIN_AUTH}/authorization?${params.toString()}`;
  }

  async handleCallback(code: string, userId: string, baseUrl: string): Promise<void> {
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
    if (!clientId || !clientSecret) throw new Error("LinkedIn credentials not configured");

    const params = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: `${baseUrl}/api/linkedin/callback`,
      client_id: clientId,
      client_secret: clientSecret,
    });

    const res = await fetch(`${LINKEDIN_AUTH}/accessToken`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!res.ok) {
      const text = await res.text();
      logger.error({ text }, "LinkedIn token exchange failed");
      throw new Error("Failed to exchange LinkedIn code for token");
    }

    const data = (await res.json()) as any;
    const expiresAt = Date.now() + (data.expires_in ?? 5184000) * 1000;

    this.sessions.set(userId, {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt,
    });

    try {
      await ensureUser(userId);
      await upsertOAuthToken(userId, "linkedin", {
        accessToken: data.access_token,
        refreshToken: data.refresh_token ?? null,
        expiresAt: new Date(expiresAt),
        scope: SCOPES.join(" "),
      });
    } catch (err) {
      logger.warn({ err }, "Could not persist LinkedIn token to DB");
    }

    this.emit("event", { type: "status", userId, data: { status: "connected" } });
  }

  async ensureSession(userId: string): Promise<void> {
    if (this.sessions.has(userId)) {
      const s = this.sessions.get(userId)!;
      if (s.expiresAt >= Date.now()) return;
      this.sessions.delete(userId);
    }
    try {
      const row = await getOAuthToken(userId, "linkedin");
      if (!row) return;
      const expiresAt = row.expiresAt ? row.expiresAt.getTime() : Date.now() + 3600_000;
      if (expiresAt < Date.now()) {
        await deleteOAuthToken(userId, "linkedin");
        return;
      }
      this.sessions.set(userId, {
        accessToken: row.accessToken,
        refreshToken: row.refreshToken ?? undefined,
        expiresAt,
      });
    } catch (err) {
      logger.warn({ err }, "Could not restore LinkedIn session from DB");
    }
  }

  async disconnect(userId: string): Promise<void> {
    this.sessions.delete(userId);
    try {
      await deleteOAuthToken(userId, "linkedin");
    } catch (err) {
      logger.warn({ err }, "Could not delete LinkedIn token from DB");
    }
    this.emit("event", { type: "status", userId, data: { status: "disconnected" } });
  }

  getStatus(userId: string): LinkedInStatus {
    const session = this.sessions.get(userId);
    if (!session) return "disconnected";
    if (session.expiresAt < Date.now()) {
      this.sessions.delete(userId);
      return "disconnected";
    }
    return "connected";
  }
}

export const linkedInService = new LinkedInService();
