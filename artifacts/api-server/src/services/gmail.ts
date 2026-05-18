// Gmail integration via per-user OAuth2 tokens stored in user_oauth_tokens.
// Tokens are obtained through /api/auth/gmail/connect (GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET).
// The tokenManager handles refresh automatically.
import { getValidGmailToken, getOAuthToken } from "./tokenManager";
import { logger } from "../lib/logger";

const GMAIL_ACCOUNT_ID = -1;
const GMAIL_COLOR = "#ea4335";

type GmailListResponse = {
  messages?: Array<{ id: string; threadId: string }>;
  resultSizeEstimate?: number;
};

type GmailMessagePart = {
  mimeType?: string;
  filename?: string;
  headers?: Array<{ name: string; value: string }>;
  body?: {
    data?: string;
    size?: number;
    attachmentId?: string;
  };
  parts?: GmailMessagePart[];
};

type GmailMessage = {
  id: string;
  threadId?: string;
  labelIds?: string[];
  snippet?: string;
  internalDate?: string;
  payload?: GmailMessagePart;
};

type GmailProfile = {
  emailAddress?: string;
  messagesTotal?: number;
  threadsTotal?: number;
};

type GmailLabelDetail = {
  messagesTotal?: number;
  messagesUnread?: number;
  threadsTotal?: number;
  threadsUnread?: number;
};

const folderLabelMap: Record<string, string> = {
  Inbox: "INBOX",
  Sent: "SENT",
  Drafts: "DRAFT",
  Trash: "TRASH",
  Spam: "SPAM",
};

const gmailIdsByVirtualId = new Map<number, string>();

function virtualIdForGmailId(gmailId: string) {
  let hash = 0;
  for (let i = 0; i < gmailId.length; i += 1) {
    hash = (hash * 31 + gmailId.charCodeAt(i)) | 0;
  }
  const id = -(1_000 + (Math.abs(hash) % 999_999_000));
  gmailIdsByVirtualId.set(id, gmailId);
  return id;
}

function decodeBase64Url(value?: string) {
  if (!value) return "";
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return Buffer.from(padded, "base64").toString("utf8");
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#160;/g, " ")
    .replace(/&#8203;/g, "")
    .replace(/&#(\d+);/g, (_m, code) => String.fromCodePoint(parseInt(code, 10)))
    .replace(/&[a-z]+;/gi, " ");
}

async function gmailFetch(
  userId: string,
  path: string,
  options?: { method?: string; body?: string; headers?: Record<string, string> }
): Promise<Response> {
  const token = await getValidGmailToken(userId);
  if (!token) {
    return new Response(JSON.stringify({ error: "No Gmail token" }), { status: 401 });
  }
  const url = `https://gmail.googleapis.com${path}`;
  return fetch(url, {
    method: options?.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options?.headers ?? {}),
    },
    body: options?.body,
  });
}

function getHeader(message: GmailMessage, name: string) {
  const headers = message.payload?.headers ?? [];
  return headers.find((header) => header.name.toLowerCase() === name.toLowerCase())?.value ?? "";
}

function parseAddress(value: string) {
  const match = value.match(/^(.*?)\s*<([^>]+)>$/);
  if (!match) {
    return { name: value || "Unknown Sender", email: value || "unknown@example.com" };
  }
  const rawName = match[1].trim().replace(/^"|"$/g, "");
  return { name: rawName || match[2], email: match[2] };
}

function findBodyPart(part: GmailMessagePart | undefined, mimeType: string): string {
  if (!part) return "";
  if (part.mimeType === mimeType && part.body?.data) {
    return decodeBase64Url(part.body.data);
  }
  for (const child of part.parts ?? []) {
    const value = findBodyPart(child, mimeType);
    if (value) return value;
  }
  return "";
}

function hasAttachments(part: GmailMessagePart | undefined): boolean {
  if (!part) return false;
  if (part.filename || part.body?.attachmentId) return true;
  return (part.parts ?? []).some(hasAttachments);
}

function folderFromLabels(labels: string[] | undefined, requestedFolder?: string | null) {
  if (requestedFolder) return requestedFolder;
  if (labels?.includes("SENT")) return "Sent";
  if (labels?.includes("DRAFT")) return "Drafts";
  if (labels?.includes("TRASH")) return "Trash";
  if (labels?.includes("SPAM")) return "Spam";
  if (labels?.includes("INBOX")) return "Inbox";
  return "Archive";
}

function toMessageResponse(message: GmailMessage, profile: GmailProfile | null, requestedFolder?: string | null) {
  const from = parseAddress(getHeader(message, "From"));
  const receivedAt = message.internalDate ? new Date(Number(message.internalDate)) : new Date();
  const bodyText = decodeHtmlEntities(findBodyPart(message.payload, "text/plain") || message.snippet || "");
  const bodyHtml = findBodyPart(message.payload, "text/html") || null;

  return {
    id: virtualIdForGmailId(message.id),
    accountId: GMAIL_ACCOUNT_ID,
    accountEmail: profile?.emailAddress ?? "Gmail",
    accountName: "Gmail",
    accountColor: GMAIL_COLOR,
    folder: folderFromLabels(message.labelIds, requestedFolder),
    subject: getHeader(message, "Subject") || "(No subject)",
    fromName: from.name,
    fromEmail: from.email,
    toList: getHeader(message, "To") || profile?.emailAddress || "",
    ccList: getHeader(message, "Cc") || null,
    bodyText,
    bodyHtml,
    isRead: !(message.labelIds ?? []).includes("UNREAD"),
    isStarred: (message.labelIds ?? []).includes("STARRED"),
    hasAttachments: hasAttachments(message.payload),
    attachments: [],
    receivedAt: receivedAt.toISOString(),
    createdAt: receivedAt.toISOString(),
  };
}

export async function isGmailConnected(userId: string): Promise<boolean> {
  if (!process.env.GOOGLE_CLIENT_ID) return false;
  const token = await getOAuthToken(userId, "gmail");
  return !!token;
}

export async function getGmailProfile(userId: string): Promise<GmailProfile | null> {
  try {
    const response = await gmailFetch(userId, "/gmail/v1/users/me/profile");
    if (!response.ok) {
      const body = await response.text().catch(() => "(unreadable)");
      logger.warn({ status: response.status, body }, "Gmail profile fetch failed");
      return null;
    }
    return (await response.json()) as GmailProfile;
  } catch (err) {
    logger.warn({ err }, "Gmail profile fetch threw");
    return null;
  }
}

export async function getGmailAccount(userId: string) {
  if (!process.env.GOOGLE_CLIENT_ID) return null;
  const token = await getOAuthToken(userId, "gmail");
  if (!token) return null;
  const profile = await getGmailProfile(userId);
  return {
    id: GMAIL_ACCOUNT_ID,
    email: profile?.emailAddress ?? token.email ?? null,
    phone: null,
    name: "Gmail",
    provider: "gmail",
    color: GMAIL_COLOR,
    isActive: true,
    unreadCount: 0,
    createdAt: new Date().toISOString(),
  };
}

export async function getGmailUnreadCount(userId: string): Promise<number> {
  try {
    const response = await gmailFetch(userId, "/gmail/v1/users/me/labels/INBOX");
    if (!response.ok) return 0;
    const data = (await response.json()) as GmailLabelDetail;
    return data.messagesUnread ?? 0;
  } catch {
    return 0;
  }
}

export async function getGmailStarredCount(userId: string): Promise<number> {
  try {
    const response = await gmailFetch(userId, "/gmail/v1/users/me/labels/STARRED");
    if (!response.ok) return 0;
    const data = (await response.json()) as GmailLabelDetail;
    return data.messagesTotal ?? 0;
  } catch {
    return 0;
  }
}

export async function listGmailMessages(userId: string, folder?: string | null, limit = 25) {
  try {
    const profileResponse = await gmailFetch(userId, "/gmail/v1/users/me/profile");
    if (!profileResponse.ok) return null;
    const profile = (await profileResponse.json()) as GmailProfile;

    const params = new URLSearchParams();
    params.set("maxResults", String(Math.min(Math.max(limit, 1), 25)));
    const label = folder ? folderLabelMap[folder] : "INBOX";
    if (label) {
      params.append("labelIds", label);
    } else if (folder === "Archive") {
      params.set("q", "-in:inbox -in:sent -in:drafts -in:trash -in:spam");
    }

    const listResponse = await gmailFetch(userId, `/gmail/v1/users/me/messages?${params.toString()}`);
    if (!listResponse.ok) return null;

    const list = (await listResponse.json()) as GmailListResponse;
    const messages = await Promise.all(
      (list.messages ?? []).map(async (item) => {
        const messageResponse = await gmailFetch(userId, `/gmail/v1/users/me/messages/${item.id}?format=full`);
        if (!messageResponse.ok) return null;
        const message = (await messageResponse.json()) as GmailMessage;
        return toMessageResponse(message, profile, folder);
      }),
    );

    const filtered = messages.filter((message): message is NonNullable<typeof message> => Boolean(message));
    return {
      messages: filtered,
      total: list.resultSizeEstimate ?? filtered.length,
      hasMore: (list.resultSizeEstimate ?? filtered.length) > filtered.length,
    };
  } catch {
    return null;
  }
}

export async function getGmailMessage(userId: string, virtualId: number) {
  const gmailId = gmailIdsByVirtualId.get(virtualId);
  if (!gmailId) return null;

  try {
    const profileResponse = await gmailFetch(userId, "/gmail/v1/users/me/profile");
    const profile = profileResponse.ok ? (await profileResponse.json()) as GmailProfile : null;

    const response = await gmailFetch(userId, `/gmail/v1/users/me/messages/${gmailId}?format=full`);
    if (!response.ok) return null;

    const message = (await response.json()) as GmailMessage;
    return toMessageResponse(message, profile);
  } catch {
    return null;
  }
}

export async function deleteGmailMessage(userId: string, virtualId: number): Promise<boolean> {
  const gmailId = gmailIdsByVirtualId.get(virtualId);
  if (!gmailId) return false;
  try {
    const res = await gmailFetch(userId, `/gmail/v1/users/me/messages/${gmailId}/trash`, { method: "POST" });
    return res.ok;
  } catch {
    return false;
  }
}

export async function listGmailMessageSenders(userId: string, limit = 25): Promise<Array<{ name: string; email: string }>> {
  try {
    const params = new URLSearchParams();
    params.set("maxResults", String(Math.min(limit, 25)));
    const listResponse = await gmailFetch(userId, `/gmail/v1/users/me/messages?${params.toString()}`);
    if (!listResponse.ok) return [];
    const list = (await listResponse.json()) as GmailListResponse;
    const senders = await Promise.all(
      (list.messages ?? []).map(async (item) => {
        const msgResponse = await gmailFetch(userId, `/gmail/v1/users/me/messages/${item.id}?format=metadata&metadataHeaders=From`);
        if (!msgResponse.ok) return null;
        const message = (await msgResponse.json()) as GmailMessage;
        const fromHeader = (message.payload?.headers ?? []).find((h) => h.name.toLowerCase() === "from");
        if (!fromHeader?.value) return null;
        return parseAddress(fromHeader.value);
      })
    );
    return senders.filter((s): s is NonNullable<typeof s> => Boolean(s?.email));
  } catch {
    return [];
  }
}

export async function createGmailDraft(
  userId: string,
  to: string,
  subject: string,
  body: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const lines = [
      `To: ${to}`,
      `Subject: ${subject}`,
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=UTF-8",
      "",
      body,
    ];
    const raw = Buffer.from(lines.join("\r\n")).toString("base64url");
    const res = await gmailFetch(userId, "/gmail/v1/users/me/drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: { raw } }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: (err as any)?.error?.message ?? `Gmail API error ${res.status}` };
    }
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function sendGmailMessage(
  userId: string,
  to: string,
  subject: string,
  body: string,
  replyToMessageId?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const lines = [
      `To: ${to}`,
      `Subject: ${subject}`,
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=UTF-8",
      "",
      body,
    ];
    if (replyToMessageId) lines.splice(3, 0, `In-Reply-To: ${replyToMessageId}`, `References: ${replyToMessageId}`);
    const raw = Buffer.from(lines.join("\r\n")).toString("base64url");

    const res = await gmailFetch(userId, "/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raw }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: (err as any)?.error?.message ?? `Gmail API error ${res.status}` };
    }
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
