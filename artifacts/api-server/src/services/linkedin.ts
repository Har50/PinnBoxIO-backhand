import { EventEmitter } from "events";
import { logger } from "../lib/logger";

const LINKEDIN_API = "https://api.linkedin.com/v2";
const LINKEDIN_AUTH = "https://www.linkedin.com/oauth/v2";

export type LinkedInStatus = "disconnected" | "connected" | "error";

export interface LinkedInProfile {
  id: string;
  firstName: string;
  lastName: string;
  headline: string;
  profilePicture: string | null;
  email: string | null;
  vanityName: string | null;
  isVerified: boolean;
  isPremium: boolean;
  connectionCount: number | null;
}

export interface LinkedInConversation {
  id: string;
  participantName: string;
  participantPicture: string | null;
  lastMessage: string | null;
  lastActivityAt: number | null;
  unreadCount: number;
}

export interface LinkedInMessage {
  id: string;
  fromMe: boolean;
  senderName: string;
  text: string;
  sentAt: number | null;
}

interface UserSession {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  profile: LinkedInProfile | null;
}

const SCOPES = [
  "openid",
  "profile",
  "email",
  "w_member_social",
  "r_basicprofile",
];

const MESSAGING_SCOPES = ["r_messages_v2", "w_messages_v2"];

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
      profile: null,
    });

    try {
      const profile = await this.fetchProfile(userId);
      const session = this.sessions.get(userId)!;
      session.profile = profile;
    } catch (err) {
      logger.error({ err }, "Failed to fetch LinkedIn profile after auth");
    }

    this.emit("event", { type: "status", userId, data: { status: "connected" } });
  }

  async disconnect(userId: string): Promise<void> {
    this.sessions.delete(userId);
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

  getProfile(userId: string): LinkedInProfile | null {
    return this.sessions.get(userId)?.profile ?? null;
  }

  private async apiGet<T>(userId: string, path: string): Promise<T> {
    const session = this.sessions.get(userId);
    if (!session) throw new Error("Not connected to LinkedIn");

    const res = await fetch(`${LINKEDIN_API}${path}`, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        "LinkedIn-Version": "202306",
        "X-Restli-Protocol-Version": "2.0.0",
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`LinkedIn API error ${res.status}: ${text}`);
    }

    return res.json() as Promise<T>;
  }

  private async apiPost<T>(userId: string, path: string, body: unknown): Promise<T> {
    const session = this.sessions.get(userId);
    if (!session) throw new Error("Not connected to LinkedIn");

    const res = await fetch(`${LINKEDIN_API}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        "Content-Type": "application/json",
        "LinkedIn-Version": "202306",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`LinkedIn API error ${res.status}: ${text}`);
    }

    return res.json() as Promise<T>;
  }

  async fetchProfile(userId: string): Promise<LinkedInProfile> {
    const data = await this.apiGet<any>(
      userId,
      "/me?projection=(id,firstName,lastName,headline,profilePicture(displayImage~:playableStreams),vanityName,premium)"
    );

    let email: string | null = null;
    try {
      const emailData = await this.apiGet<any>(
        userId,
        "/emailAddress?q=members&projection=(elements*(handle~))"
      );
      email = emailData?.elements?.[0]?.["handle~"]?.emailAddress ?? null;
    } catch {}

    const firstName = data?.firstName?.localized
      ? Object.values(data.firstName.localized as Record<string, string>)[0]
      : "";
    const lastName = data?.lastName?.localized
      ? Object.values(data.lastName.localized as Record<string, string>)[0]
      : "";

    const pictures: any[] =
      data?.profilePicture?.["displayImage~"]?.elements ?? [];
    const picture =
      pictures.length > 0
        ? pictures[pictures.length - 1]?.identifiers?.[0]?.identifier ?? null
        : null;

    const isPremium = !!(data?.premium);

    return {
      id: data.id ?? "",
      firstName: firstName as string,
      lastName: lastName as string,
      headline: data?.headline?.localized
        ? (Object.values(data.headline.localized as Record<string, string>)[0] as string)
        : "",
      profilePicture: picture,
      email,
      vanityName: data?.vanityName ?? null,
      isVerified: !!(data?.id),
      isPremium,
      connectionCount: null,
    };
  }

  async getConversations(userId: string): Promise<LinkedInConversation[]> {
    try {
      const data = await this.apiGet<any>(
        userId,
        "/conversations?q=participants&count=20"
      );

      return (data?.elements ?? []).map((conv: any) => {
        const participant = conv?.participants?.[0]?.["com.linkedin.voyager.messaging.MessagingMember"] ?? {};
        const miniProfile = participant?.miniProfile ?? {};
        const lastMsg = conv?.events?.[0]?.eventContent?.["com.linkedin.voyager.messaging.event.MessageEvent"];
        return {
          id: conv?.entityUrn?.split(":").pop() ?? conv?.id ?? "",
          participantName: `${miniProfile?.firstName ?? ""} ${miniProfile?.lastName ?? ""}`.trim() || "Unknown",
          participantPicture: miniProfile?.picture?.["com.linkedin.common.VectorImage"]?.rootUrl ?? null,
          lastMessage: lastMsg?.attributedBody?.text ?? null,
          lastActivityAt: conv?.lastActivityAt ?? null,
          unreadCount: conv?.unreadCount ?? 0,
        };
      });
    } catch (err: any) {
      const msg = err?.message ?? "";
      if (msg.includes("403") || msg.includes("401")) {
        throw new Error("MESSAGING_ACCESS_REQUIRED");
      }
      throw err;
    }
  }

  async getMessages(userId: string, conversationId: string): Promise<LinkedInMessage[]> {
    const meId = this.sessions.get(userId)?.profile?.id ?? "";
    try {
      const data = await this.apiGet<any>(
        userId,
        `/conversations/${encodeURIComponent(conversationId)}/events?q=query&count=30`
      );

      return (data?.elements ?? [])
        .filter((e: any) => e?.eventContent?.["com.linkedin.voyager.messaging.event.MessageEvent"])
        .map((e: any) => {
          const msg = e.eventContent["com.linkedin.voyager.messaging.event.MessageEvent"];
          const senderId = e?.from?.["com.linkedin.voyager.messaging.MessagingMember"]?.miniProfile?.entityUrn?.split(":").pop() ?? "";
          return {
            id: e?.entityUrn?.split(":").pop() ?? "",
            fromMe: senderId === meId,
            senderName: `${e?.from?.["com.linkedin.voyager.messaging.MessagingMember"]?.miniProfile?.firstName ?? ""} ${e?.from?.["com.linkedin.voyager.messaging.MessagingMember"]?.miniProfile?.lastName ?? ""}`.trim(),
            text: msg?.attributedBody?.text ?? "",
            sentAt: e?.createdAt ?? null,
          };
        });
    } catch (err: any) {
      const msg = err?.message ?? "";
      if (msg.includes("403") || msg.includes("401")) {
        throw new Error("MESSAGING_ACCESS_REQUIRED");
      }
      throw err;
    }
  }

  async sendMessage(userId: string, conversationId: string, text: string): Promise<void> {
    try {
      await this.apiPost(userId, `/conversations/${encodeURIComponent(conversationId)}/events`, {
        eventCreate: {
          value: {
            "com.linkedin.voyager.messaging.create.MessageCreate": {
              attributedBody: { text, attributes: [] },
              attachments: [],
            },
          },
        },
      });
    } catch (err: any) {
      const msg = err?.message ?? "";
      if (msg.includes("403") || msg.includes("401")) {
        throw new Error("MESSAGING_ACCESS_REQUIRED");
      }
      throw err;
    }
  }
}

export const linkedInService = new LinkedInService();
