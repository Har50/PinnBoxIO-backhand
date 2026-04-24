import { ReplitConnectors } from "@replit/connectors-sdk";

const OUTLOOK_ACCOUNT_ID = -2;
const OUTLOOK_COLOR = "#0078d4";

const connectors = new ReplitConnectors();
const outlookIdsByVirtualId = new Map<number, string>();

type OutlookProfile = {
  displayName?: string;
  mail?: string;
  userPrincipalName?: string;
};

type OutlookEmailAddress = {
  name?: string;
  address?: string;
};

type OutlookRecipient = {
  emailAddress?: OutlookEmailAddress;
};

type OutlookMessage = {
  id: string;
  subject?: string;
  bodyPreview?: string;
  body?: {
    contentType?: string;
    content?: string;
  };
  from?: {
    emailAddress?: OutlookEmailAddress;
  };
  sender?: {
    emailAddress?: OutlookEmailAddress;
  };
  toRecipients?: OutlookRecipient[];
  ccRecipients?: OutlookRecipient[];
  receivedDateTime?: string;
  sentDateTime?: string;
  isRead?: boolean;
  isDraft?: boolean;
  hasAttachments?: boolean;
  flag?: {
    flagStatus?: string;
  };
  parentFolderId?: string;
};

type OutlookListResponse = {
  value?: OutlookMessage[];
  "@odata.count"?: number;
  "@odata.nextLink"?: string;
};

const folderPathMap: Record<string, string> = {
  Inbox: "inbox",
  Sent: "sentitems",
  Drafts: "drafts",
  Trash: "deleteditems",
  Spam: "junkemail",
  Archive: "archive",
};

function virtualIdForOutlookId(outlookId: string) {
  let hash = 0;
  for (let i = 0; i < outlookId.length; i += 1) {
    hash = (hash * 31 + outlookId.charCodeAt(i)) | 0;
  }
  const id = -(1_000_000_000 + (Math.abs(hash) % 999_999_000));
  outlookIdsByVirtualId.set(id, outlookId);
  return id;
}

async function outlookProxy(path: string, init?: { method?: string }) {
  return connectors.proxy("outlook", path, {
    method: init?.method ?? "GET",
  });
}

function recipientList(recipients?: OutlookRecipient[]) {
  return (recipients ?? [])
    .map((recipient) => {
      const address = recipient.emailAddress?.address ?? "";
      const name = recipient.emailAddress?.name ?? "";
      return name && address ? `${name} <${address}>` : address || name;
    })
    .filter(Boolean)
    .join(", ");
}

function stripHtml(value?: string) {
  return (value ?? "")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toMessageResponse(message: OutlookMessage, profile: OutlookProfile | null, requestedFolder?: string | null) {
  const from = message.from?.emailAddress ?? message.sender?.emailAddress ?? {};
  const receivedAt = new Date(message.receivedDateTime ?? message.sentDateTime ?? Date.now());
  const bodyHtml = message.body?.contentType?.toLowerCase() === "html" ? message.body?.content ?? null : null;
  const bodyText = message.body?.contentType?.toLowerCase() === "text"
    ? message.body?.content ?? message.bodyPreview ?? ""
    : stripHtml(message.body?.content) || message.bodyPreview || "";

  return {
    id: virtualIdForOutlookId(message.id),
    accountId: OUTLOOK_ACCOUNT_ID,
    accountEmail: profile?.mail ?? profile?.userPrincipalName ?? "Outlook",
    accountName: "Outlook",
    accountColor: OUTLOOK_COLOR,
    folder: requestedFolder ?? "Inbox",
    subject: message.subject || "(No subject)",
    fromName: from.name || from.address || "Unknown Sender",
    fromEmail: from.address || "unknown@example.com",
    toList: recipientList(message.toRecipients) || profile?.mail || profile?.userPrincipalName || "",
    ccList: recipientList(message.ccRecipients) || null,
    bodyText,
    bodyHtml,
    isRead: message.isRead ?? true,
    isStarred: message.flag?.flagStatus === "flagged",
    hasAttachments: message.hasAttachments ?? false,
    attachments: [],
    receivedAt: receivedAt.toISOString(),
    createdAt: receivedAt.toISOString(),
  };
}

export async function getOutlookProfile(): Promise<OutlookProfile | null> {
  try {
    const response = await outlookProxy("/v1.0/me?$select=displayName,mail,userPrincipalName");
    if (!response.ok) return null;
    return (await response.json()) as OutlookProfile;
  } catch {
    return null;
  }
}

export async function getOutlookAccount() {
  const profile = await getOutlookProfile();
  const email = profile?.mail ?? profile?.userPrincipalName;
  if (!email) return null;

  return {
    id: OUTLOOK_ACCOUNT_ID,
    email,
    phone: null,
    name: "Outlook",
    provider: "outlook",
    color: OUTLOOK_COLOR,
    isActive: true,
    unreadCount: 0,
    createdAt: new Date().toISOString(),
  };
}

export async function getOutlookUnreadCount(): Promise<number> {
  try {
    const response = await outlookProxy("/v1.0/me/mailFolders/inbox?$select=unreadItemCount");
    if (!response.ok) return 0;
    const data = (await response.json()) as { unreadItemCount?: number };
    return data.unreadItemCount ?? 0;
  } catch {
    return 0;
  }
}

export async function getOutlookStarredCount(): Promise<number> {
  try {
    const params = new URLSearchParams({
      "$filter": "flag/flagStatus eq 'flagged'",
      "$count": "true",
      "$select": "id",
      "$top": "0",
    });
    const response = await outlookProxy(`/v1.0/me/messages?${params.toString()}`);
    if (!response.ok) return 0;
    const data = (await response.json()) as { "@odata.count"?: number };
    return data["@odata.count"] ?? 0;
  } catch {
    return 0;
  }
}

export async function listOutlookMessageSenders(limit = 50): Promise<Array<{ name: string; email: string }>> {
  try {
    const profile = await getOutlookProfile();
    if (!profile) return [];
    const safeLimit = Math.min(Math.max(limit, 1), 25);
    const params = new URLSearchParams({
      "$top": String(safeLimit),
      "$orderby": "receivedDateTime desc",
      "$select": "from,sender",
    });
    const response = await outlookProxy(`/v1.0/me/mailFolders/inbox/messages?${params.toString()}`);
    if (!response.ok) return [];
    const list = (await response.json()) as OutlookListResponse;
    return (list.value ?? [])
      .map((msg) => {
        const addr = msg.from?.emailAddress ?? msg.sender?.emailAddress;
        if (!addr?.address) return null;
        return { name: addr.name || addr.address, email: addr.address };
      })
      .filter((s): s is NonNullable<typeof s> => Boolean(s?.email));
  } catch {
    return [];
  }
}

export async function listOutlookMessages(folder?: string | null, limit = 25) {
  const profile = await getOutlookProfile();
  if (!profile) return null;

  const safeLimit = Math.min(Math.max(limit, 1), 25);
  const folderPath = folder ? folderPathMap[folder] : folderPathMap.Inbox;
  const params = new URLSearchParams({
    "$top": String(safeLimit),
    "$orderby": "receivedDateTime desc",
    "$select": "id,subject,bodyPreview,body,from,sender,toRecipients,ccRecipients,receivedDateTime,sentDateTime,isRead,isDraft,hasAttachments,flag",
    "$count": "true",
  });
  const path = folderPath
    ? `/v1.0/me/mailFolders/${folderPath}/messages?${params.toString()}`
    : `/v1.0/me/messages?${params.toString()}`;

  const listResponse = await outlookProxy(path);
  if (!listResponse.ok) return null;

  const list = (await listResponse.json()) as OutlookListResponse;
  const messages = (list.value ?? []).map((message) => toMessageResponse(message, profile, folder ?? "Inbox"));

  return {
    messages,
    total: list["@odata.count"] ?? messages.length,
    hasMore: Boolean(list["@odata.nextLink"]),
  };
}

export async function getOutlookMessage(virtualId: number) {
  const outlookId = outlookIdsByVirtualId.get(virtualId);
  if (!outlookId) return null;

  const profile = await getOutlookProfile();
  if (!profile) return null;

  const params = new URLSearchParams({
    "$select": "id,subject,bodyPreview,body,from,sender,toRecipients,ccRecipients,receivedDateTime,sentDateTime,isRead,isDraft,hasAttachments,flag",
  });
  const response = await outlookProxy(`/v1.0/me/messages/${encodeURIComponent(outlookId)}?${params.toString()}`);
  if (!response.ok) return null;

  const message = (await response.json()) as OutlookMessage;
  return toMessageResponse(message, profile);
}