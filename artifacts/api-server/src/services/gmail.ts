import { ReplitConnectors } from "@replit/connectors-sdk";

const GMAIL_ACCOUNT_ID = -1;
const GMAIL_COLOR = "#ea4335";

const connectors = new ReplitConnectors();
const gmailIdsByVirtualId = new Map<number, string>();

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

type GmailLabelsResponse = {
  labels?: Array<{ id: string; name: string }>;
};

const folderLabelMap: Record<string, string> = {
  Inbox: "INBOX",
  Sent: "SENT",
  Drafts: "DRAFT",
  Trash: "TRASH",
  Spam: "SPAM",
};

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

async function gmailProxy(path: string, init?: { method?: string }) {
  return connectors.proxy("google-mail", path, {
    method: init?.method ?? "GET",
  });
}

function getHeader(message: GmailMessage, name: string) {
  const headers = message.payload?.headers ?? [];
  return headers.find((header) => header.name.toLowerCase() === name.toLowerCase())?.value ?? "";
}

function parseAddress(value: string) {
  const match = value.match(/^(.*?)\\s*<([^>]+)>$/);
  if (!match) {
    return {
      name: value || "Unknown Sender",
      email: value || "unknown@example.com",
    };
  }

  const rawName = match[1].trim().replace(/^"|"$/g, "");
  return {
    name: rawName || match[2],
    email: match[2],
  };
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
  const bodyText = findBodyPart(message.payload, "text/plain") || message.snippet || "";
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

export async function getGmailProfile(): Promise<GmailProfile | null> {
  try {
    const response = await gmailProxy("/gmail/v1/users/me/profile");
    if (!response.ok) return null;
    return (await response.json()) as GmailProfile;
  } catch {
    return null;
  }
}

async function hasGmailConnection() {
  try {
    const response = await gmailProxy("/gmail/v1/users/me/labels");
    if (!response.ok) return false;
    const data = (await response.json()) as GmailLabelsResponse;
    return Boolean(data.labels?.length);
  } catch {
    return false;
  }
}

export async function getGmailAccount() {
  const profile = await getGmailProfile();
  const isConnected = profile?.emailAddress ? true : await hasGmailConnection();
  if (!isConnected) return null;

  return {
    id: GMAIL_ACCOUNT_ID,
    email: profile?.emailAddress ?? null,
    phone: null,
    name: profile?.emailAddress ? "Gmail" : "Gmail (permission needed)",
    provider: "gmail",
    color: GMAIL_COLOR,
    isActive: true,
    unreadCount: 0,
    createdAt: new Date().toISOString(),
  };
}

export async function listGmailMessages(folder?: string | null, limit = 25) {
  const profile = await getGmailProfile();
  if (!profile) return null;

  const params = new URLSearchParams();
  params.set("maxResults", String(Math.min(Math.max(limit, 1), 25)));
  const label = folder ? folderLabelMap[folder] : "INBOX";
  if (label) {
    params.append("labelIds", label);
  } else if (folder === "Archive") {
    params.set("q", "-in:inbox -in:sent -in:drafts -in:trash -in:spam");
  }

  const listResponse = await gmailProxy(`/gmail/v1/users/me/messages?${params.toString()}`);
  if (!listResponse.ok) return null;

  const list = (await listResponse.json()) as GmailListResponse;
  const messages = await Promise.all(
    (list.messages ?? []).map(async (item) => {
      const messageResponse = await gmailProxy(`/gmail/v1/users/me/messages/${item.id}?format=full`);
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
}

export async function getGmailUnreadCount(): Promise<number> {
  try {
    const response = await gmailProxy("/gmail/v1/users/me/labels/INBOX");
    if (!response.ok) return 0;
    const data = (await response.json()) as { messagesUnread?: number };
    return data.messagesUnread ?? 0;
  } catch {
    return 0;
  }
}

export async function getGmailStarredCount(): Promise<number> {
  try {
    const response = await gmailProxy("/gmail/v1/users/me/labels/STARRED");
    if (!response.ok) return 0;
    const data = (await response.json()) as { messagesTotal?: number };
    return data.messagesTotal ?? 0;
  } catch {
    return 0;
  }
}

export async function listGmailMessageSenders(limit = 50): Promise<Array<{ name: string; email: string }>> {
  try {
    const profile = await getGmailProfile();
    if (!profile) return [];
    const params = new URLSearchParams();
    params.set("maxResults", String(Math.min(limit, 25)));
    const listResponse = await gmailProxy(`/gmail/v1/users/me/messages?${params.toString()}`);
    if (!listResponse.ok) return [];
    const list = (await listResponse.json()) as GmailListResponse;
    const senders = await Promise.all(
      (list.messages ?? []).map(async (item) => {
        const msgResponse = await gmailProxy(`/gmail/v1/users/me/messages/${item.id}?format=metadata&metadataHeaders=From`);
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

export async function getGmailMessage(virtualId: number) {
  const gmailId = gmailIdsByVirtualId.get(virtualId);
  if (!gmailId) return null;

  const profile = await getGmailProfile();
  if (!profile) return null;

  const response = await gmailProxy(`/gmail/v1/users/me/messages/${gmailId}?format=full`);
  if (!response.ok) return null;

  const message = (await response.json()) as GmailMessage;
  return toMessageResponse(message, profile);
}