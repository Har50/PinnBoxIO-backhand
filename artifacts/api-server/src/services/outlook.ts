// Microsoft Outlook integration via Replit Connectors SDK
// The SDK handles OAuth2 token injection and refresh automatically.
import { ReplitConnectors } from "@replit/connectors-sdk";

const OUTLOOK_ACCOUNT_ID = -2;
const OUTLOOK_COLOR = "#0078d4";

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
  from?: { emailAddress?: OutlookEmailAddress };
  sender?: { emailAddress?: OutlookEmailAddress };
  toRecipients?: OutlookRecipient[];
  ccRecipients?: OutlookRecipient[];
  receivedDateTime?: string;
  sentDateTime?: string;
  isRead?: boolean;
  isDraft?: boolean;
  hasAttachments?: boolean;
  flag?: { flagStatus?: string };
  parentFolderId?: string;
};

type OutlookListResponse = {
  value?: OutlookMessage[];
  "@odata.count"?: number;
  "@odata.nextLink"?: string;
};

type OutlookMailFolderResponse = {
  unreadItemCount?: number;
  totalItemCount?: number;
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

// Never cache the connectors instance — tokens expire.
function getConnectors() {
  return new ReplitConnectors();
}

async function outlookFetch(path: string, options?: RequestInit) {
  const connectors = getConnectors();
  return connectors.proxy("outlook", path, {
    method: options?.method ?? "GET",
    body: options?.body as string | undefined,
    headers: options?.headers as Record<string, string> | undefined,
  });
}

function recipientList(recipients?: OutlookRecipient[]) {
  return (recipients ?? [])
    .map((r) => {
      const address = r.emailAddress?.address ?? "";
      const name = r.emailAddress?.name ?? "";
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
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#160;/g, " ")
    .replace(/&#8203;/g, "")
    .replace(/&#(\d+);/g, (_m, code) => String.fromCodePoint(parseInt(code, 10)))
    .replace(/&[a-z]+;/gi, " ")
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

export async function isOutlookConnected(_userId: string): Promise<boolean> {
  try {
    const response = await outlookFetch("/v1.0/me?$select=mail");
    return response.ok;
  } catch {
    return false;
  }
}

export async function getOutlookProfile(_userId: string): Promise<OutlookProfile | null> {
  try {
    const response = await outlookFetch("/v1.0/me?$select=displayName,mail,userPrincipalName");
    if (!response.ok) return null;
    return (await response.json()) as OutlookProfile;
  } catch {
    return null;
  }
}

export async function getOutlookAccount(userId: string) {
  const profile = await getOutlookProfile(userId);
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

export async function getOutlookUnreadCount(_userId: string): Promise<number> {
  try {
    const response = await outlookFetch("/v1.0/me/mailFolders/inbox?$select=unreadItemCount");
    if (!response.ok) return 0;
    const data = (await response.json()) as OutlookMailFolderResponse;
    return data.unreadItemCount ?? 0;
  } catch {
    return 0;
  }
}

export async function getOutlookStarredCount(_userId: string): Promise<number> {
  try {
    const params = new URLSearchParams({
      "$filter": "flag/flagStatus eq 'flagged'",
      "$count": "true",
      "$select": "id",
      "$top": "0",
    });
    const response = await outlookFetch(`/v1.0/me/messages?${params.toString()}`);
    if (!response.ok) return 0;
    const data = (await response.json()) as { "@odata.count"?: number };
    return data["@odata.count"] ?? 0;
  } catch {
    return 0;
  }
}

export async function listOutlookMessages(_userId: string, folder?: string | null, limit = 25) {
  try {
    const profile = await getOutlookProfile(_userId);
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

    const listResponse = await outlookFetch(path);
    if (!listResponse.ok) return null;

    const list = (await listResponse.json()) as OutlookListResponse;
    const messages = (list.value ?? []).map((message) => toMessageResponse(message, profile, folder ?? "Inbox"));

    return {
      messages,
      total: list["@odata.count"] ?? messages.length,
      hasMore: Boolean(list["@odata.nextLink"]),
    };
  } catch {
    return null;
  }
}

export async function getOutlookMessage(_userId: string, virtualId: number) {
  const outlookId = outlookIdsByVirtualId.get(virtualId);
  if (!outlookId) return null;

  try {
    const profile = await getOutlookProfile(_userId);
    const params = new URLSearchParams({
      "$select": "id,subject,bodyPreview,body,from,sender,toRecipients,ccRecipients,receivedDateTime,sentDateTime,isRead,isDraft,hasAttachments,flag",
    });
    const response = await outlookFetch(`/v1.0/me/messages/${encodeURIComponent(outlookId)}?${params.toString()}`);
    if (!response.ok) return null;

    const message = (await response.json()) as OutlookMessage;
    return toMessageResponse(message, profile);
  } catch {
    return null;
  }
}

export async function deleteOutlookMessage(_userId: string, virtualId: number): Promise<boolean> {
  const outlookId = outlookIdsByVirtualId.get(virtualId);
  if (!outlookId) return false;
  try {
    const res = await outlookFetch(`/v1.0/me/messages/${encodeURIComponent(outlookId)}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ destinationId: "deleteditems" }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function listOutlookMessageSenders(_userId: string, limit = 25): Promise<Array<{ name: string; email: string }>> {
  try {
    const safeLimit = Math.min(Math.max(limit, 1), 25);
    const params = new URLSearchParams({
      "$top": String(safeLimit),
      "$orderby": "receivedDateTime desc",
      "$select": "from,sender",
    });
    const response = await outlookFetch(`/v1.0/me/mailFolders/inbox/messages?${params.toString()}`);
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

export async function createOutlookDraft(
  _userId: string,
  to: string,
  subject: string,
  body: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await outlookFetch("/v1.0/me/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject,
        body: { contentType: "Text", content: body },
        toRecipients: [{ emailAddress: { address: to } }],
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: (err as any)?.error?.message ?? `Outlook API error ${res.status}` };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message ?? "Unknown error" };
  }
}

export async function sendOutlookMessage(
  _userId: string,
  to: string,
  subject: string,
  body: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await outlookFetch("/v1.0/me/sendMail", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: {
          subject,
          body: { contentType: "Text", content: body },
          toRecipients: [{ emailAddress: { address: to } }],
        },
        saveToSentItems: true,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: (err as any)?.error?.message ?? `Outlook API error ${res.status}` };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message ?? "Unknown error" };
  }
}
