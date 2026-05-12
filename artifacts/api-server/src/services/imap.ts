import { ImapFlow } from "imapflow";
import { db, imapCredentialsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";

export const IMAP_ACCOUNT_BASE = 2_000_000_000;
const IMAP_MSG_BASE = 3_000_000_000;

export function imapVirtualAccountId(credentialId: number): number {
  return -(IMAP_ACCOUNT_BASE + credentialId);
}

export function credentialIdFromVirtualAccountId(virtualId: number): number | null {
  if (virtualId > -IMAP_ACCOUNT_BASE) return null;
  const id = Math.abs(virtualId) - IMAP_ACCOUNT_BASE;
  return id > 0 ? id : null;
}

const imapMsgMap = new Map<number, { credentialId: number; uid: number; folder: string }>();

function imapVirtualMsgId(credentialId: number, uid: number, folder: string): number {
  const id = -(IMAP_MSG_BASE + credentialId * 10_000_000 + (uid % 10_000_000));
  imapMsgMap.set(id, { credentialId, uid, folder });
  return id;
}

export function imapMsgInfo(virtualId: number) {
  return imapMsgMap.get(virtualId) ?? null;
}

export function isImapVirtualAccountId(accountId: number): boolean {
  return accountId <= -IMAP_ACCOUNT_BASE;
}

function makeClient(cred: {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
}) {
  return new ImapFlow({
    host: cred.host,
    port: cred.port,
    secure: cred.secure,
    auth: { user: cred.username, pass: cred.password },
    logger: false,
    tls: { rejectUnauthorized: false },
  });
}

const FOLDER_MAP: Record<string, string[]> = {
  Inbox: ["INBOX"],
  Sent: ["Sent", "Sent Items", "Sent Messages", "[Gmail]/Sent Mail", "INBOX.Sent"],
  Drafts: ["Drafts", "[Gmail]/Drafts", "INBOX.Drafts"],
  Trash: ["Trash", "Deleted Items", "[Gmail]/Trash", "INBOX.Trash"],
  Spam: ["Spam", "Junk", "Junk Email", "[Gmail]/Spam", "INBOX.Junk"],
  Archive: ["Archive", "[Gmail]/All Mail", "INBOX.Archive"],
};

async function resolveFolder(client: ImapFlow, folder: string): Promise<string> {
  const candidates = FOLDER_MAP[folder] ?? [folder];
  const tree = await client.listTree();
  const allFolders = flattenTree(tree);
  for (const candidate of candidates) {
    const match = allFolders.find(
      (f) => f.toLowerCase() === candidate.toLowerCase()
    );
    if (match) return match;
  }
  return candidates[0];
}

function flattenTree(node: any): string[] {
  const names: string[] = [];
  if (node.path) names.push(node.path);
  if (node.folders) {
    for (const child of node.folders) names.push(...flattenTree(child));
  }
  return names;
}

export async function testImapConnection(cred: {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
}): Promise<{ ok: boolean; error?: string }> {
  const client = makeClient(cred);
  try {
    await client.connect();
    await client.logout();
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message ?? "Connection failed" };
  }
}

export async function getImapAccounts(userId: string) {
  const creds = await db
    .select()
    .from(imapCredentialsTable)
    .where(eq(imapCredentialsTable.userId, userId));

  return creds.map((c) => ({
    id: imapVirtualAccountId(c.id),
    email: c.email,
    phone: null,
    name: c.displayName || c.email,
    provider: "imap" as const,
    color: c.color,
    isActive: c.isActive,
    unreadCount: 0,
    createdAt: c.createdAt.toISOString(),
  }));
}

export async function listImapMessages(
  userId: string,
  credentialId: number,
  folder = "Inbox",
  limit = 25
) {
  const [cred] = await db
    .select()
    .from(imapCredentialsTable)
    .where(
      and(
        eq(imapCredentialsTable.id, credentialId),
        eq(imapCredentialsTable.userId, userId)
      )
    );
  if (!cred) return null;

  const client = makeClient(cred);
  try {
    await client.connect();
    const resolvedFolder = await resolveFolder(client, folder);
    const lock = await client.getMailboxLock(resolvedFolder);
    try {
      const messages: any[] = [];
      const uids: number[] = [];

      for await (const msg of client.fetch(
        { seq: "1:*" },
        { uid: true, envelope: true, bodyStructure: true, flags: true },
        { uid: false }
      )) {
        uids.push(msg.uid);
      }

      const topUids = uids.slice(-limit).reverse();

      for await (const msg of client.fetch(topUids.join(","), {
        uid: true,
        envelope: true,
        bodyStructure: true,
        flags: true,
        source: true,
      }, { uid: true })) {
        const env = msg.envelope;
        const from = env?.from?.[0];
        const to = env?.to?.map((a: any) => a.address).join(", ") ?? "";
        const cc = env?.cc?.map((a: any) => a.address).join(", ") ?? null;
        const subject = env?.subject ?? "(No subject)";
        const receivedAt = env?.date ?? new Date();
        const isRead = msg.flags?.has("\\Seen") ?? false;
        const isStarred = msg.flags?.has("\\Flagged") ?? false;

        let bodyText = "";
        let bodyHtml: string | null = null;
        try {
          if (msg.source) {
            const raw = msg.source.toString();
            const htmlMatch = raw.match(/Content-Type: text\/html[\s\S]*?\r\n\r\n([\s\S]*?)(?=\r\n--|\r\n\r\nContent-Type|$)/i);
            const textMatch = raw.match(/Content-Type: text\/plain[\s\S]*?\r\n\r\n([\s\S]*?)(?=\r\n--|\r\n\r\nContent-Type|$)/i);
            if (htmlMatch) bodyHtml = htmlMatch[1].replace(/=\r\n/g, "").trim();
            if (textMatch) bodyText = textMatch[1].replace(/=\r\n/g, "").trim();
            if (!bodyText && !bodyHtml) {
              const parts = raw.split(/\r\n\r\n/);
              bodyText = parts.slice(1).join("\n").replace(/=\r\n/g, "").trim().slice(0, 500);
            }
          }
        } catch {
          bodyText = "";
        }

        messages.push({
          id: imapVirtualMsgId(credentialId, msg.uid, resolvedFolder),
          accountId: imapVirtualAccountId(credentialId),
          accountEmail: cred.email,
          accountName: cred.displayName || cred.email,
          accountColor: cred.color,
          folder,
          subject,
          fromName: from?.name || from?.address || "Unknown",
          fromEmail: from?.address || "unknown@example.com",
          toList: to,
          ccList: cc,
          bodyText,
          bodyHtml,
          isRead,
          isStarred,
          hasAttachments: false,
          attachments: [],
          receivedAt: (receivedAt instanceof Date ? receivedAt : new Date(receivedAt)).toISOString(),
          createdAt: (receivedAt instanceof Date ? receivedAt : new Date(receivedAt)).toISOString(),
        });
      }

      return {
        messages,
        total: uids.length,
        hasMore: uids.length > limit,
      };
    } finally {
      lock.release();
    }
  } catch {
    return null;
  } finally {
    await client.logout().catch(() => {});
  }
}

export async function getImapMessage(
  userId: string,
  virtualId: number
): Promise<any | null> {
  const info = imapMsgInfo(virtualId);
  if (!info) return null;

  const [cred] = await db
    .select()
    .from(imapCredentialsTable)
    .where(
      and(
        eq(imapCredentialsTable.id, info.credentialId),
        eq(imapCredentialsTable.userId, userId)
      )
    );
  if (!cred) return null;

  const client = makeClient(cred);
  try {
    await client.connect();
    const lock = await client.getMailboxLock(info.folder);
    try {
      for await (const msg of client.fetch([info.uid], {
        uid: true,
        envelope: true,
        bodyStructure: true,
        flags: true,
        source: true,
      }, { uid: true })) {
        const env = msg.envelope;
        const from = env?.from?.[0];
        const to = env?.to?.map((a: any) => a.address).join(", ") ?? "";
        const cc = env?.cc?.map((a: any) => a.address).join(", ") ?? null;

        let bodyText = "";
        let bodyHtml: string | null = null;
        try {
          if (msg.source) {
            const raw = msg.source.toString();
            const htmlMatch = raw.match(/Content-Type: text\/html[\s\S]*?\r\n\r\n([\s\S]*?)(?=\r\n--|\r\n\r\nContent-Type|$)/i);
            const textMatch = raw.match(/Content-Type: text\/plain[\s\S]*?\r\n\r\n([\s\S]*?)(?=\r\n--|\r\n\r\nContent-Type|$)/i);
            if (htmlMatch) bodyHtml = htmlMatch[1].replace(/=\r\n/g, "").trim();
            if (textMatch) bodyText = textMatch[1].replace(/=\r\n/g, "").trim();
          }
        } catch {
          bodyText = "";
        }

        return {
          id: virtualId,
          accountId: imapVirtualAccountId(info.credentialId),
          accountEmail: cred.email,
          accountName: cred.displayName || cred.email,
          accountColor: cred.color,
          folder: info.folder,
          subject: env?.subject ?? "(No subject)",
          fromName: from?.name || from?.address || "Unknown",
          fromEmail: from?.address || "unknown@example.com",
          toList: to,
          ccList: cc,
          bodyText,
          bodyHtml,
          isRead: msg.flags?.has("\\Seen") ?? false,
          isStarred: msg.flags?.has("\\Flagged") ?? false,
          hasAttachments: false,
          attachments: [],
          receivedAt: (env?.date ? new Date(env.date) : new Date()).toISOString(),
          createdAt: (env?.date ? new Date(env.date) : new Date()).toISOString(),
        };
      }
      return null;
    } finally {
      lock.release();
    }
  } catch {
    return null;
  } finally {
    await client.logout().catch(() => {});
  }
}
