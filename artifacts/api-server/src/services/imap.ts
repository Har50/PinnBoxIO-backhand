import { ImapFlow } from "imapflow";
import { db, imapCredentialsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// ---------------------------------------------------------------------------
// Encryption helpers (AES-256-GCM)
// ---------------------------------------------------------------------------
const ALGO = "aes-256-gcm";
const ENC_KEY_HEX = process.env.IMAP_ENCRYPTION_KEY ?? "";

function getKey(): Buffer {
  if (ENC_KEY_HEX.length !== 64) {
    throw new Error("IMAP_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)");
  }
  return Buffer.from(ENC_KEY_HEX, "hex");
}

export function encryptPassword(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), encrypted.toString("base64")].join(":");
}

export function decryptPassword(stored: string): string {
  const key = getKey();
  const parts = stored.split(":");
  if (parts.length !== 3) throw new Error("Invalid encrypted password format");
  const [ivB64, tagB64, dataB64] = parts;
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(tagB64, "base64");
  const data = Buffer.from(dataB64, "base64");
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

// ---------------------------------------------------------------------------
// Virtual ID scheme — fully deterministic, no in-memory map needed.
//
// Account IDs:  -(IMAP_ACCOUNT_BASE + credentialId)
// Message IDs:  -(IMAP_MSG_BASE + credentialId * UID_MULTIPLIER + uid)
//
// IMAP UIDs are 32-bit (max 4,294,967,295). UID_MULTIPLIER = 10_000_000_000
// allows credentialId up to ~898 within JS MAX_SAFE_INTEGER.
// ---------------------------------------------------------------------------
export const IMAP_ACCOUNT_BASE = 2_000_000_000;
const IMAP_MSG_BASE = 10_000_000_000_000;
const UID_MULTIPLIER = 10_000_000_000;

export function imapVirtualAccountId(credentialId: number): number {
  return -(IMAP_ACCOUNT_BASE + credentialId);
}

export function credentialIdFromVirtualAccountId(virtualId: number): number | null {
  if (virtualId > -IMAP_ACCOUNT_BASE) return null;
  const id = Math.abs(virtualId) - IMAP_ACCOUNT_BASE;
  return id > 0 ? id : null;
}

export function isImapVirtualAccountId(accountId: number): boolean {
  return accountId <= -IMAP_ACCOUNT_BASE;
}

export function isImapVirtualMsgId(msgId: number): boolean {
  return msgId <= -IMAP_MSG_BASE;
}

function imapVirtualMsgId(credentialId: number, uid: number): number {
  return -(IMAP_MSG_BASE + credentialId * UID_MULTIPLIER + uid);
}

function decodeMsgId(virtualId: number): { credentialId: number; uid: number } | null {
  const abs = Math.abs(virtualId);
  if (abs < IMAP_MSG_BASE) return null;
  const remainder = abs - IMAP_MSG_BASE;
  const credentialId = Math.floor(remainder / UID_MULTIPLIER);
  const uid = remainder % UID_MULTIPLIER;
  return { credentialId, uid };
}

// ---------------------------------------------------------------------------
// ImapFlow client factory (TLS verification enabled by default)
// ---------------------------------------------------------------------------
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
  });
}

// ---------------------------------------------------------------------------
// Folder resolution
// ---------------------------------------------------------------------------
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
    const match = allFolders.find((f) => f.toLowerCase() === candidate.toLowerCase());
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

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
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

function parseBody(source: Buffer | undefined): { bodyText: string; bodyHtml: string | null } {
  if (!source) return { bodyText: "", bodyHtml: null };
  try {
    const raw = source.toString();
    const htmlMatch = raw.match(
      /Content-Type: text\/html[\s\S]*?\r\n\r\n([\s\S]*?)(?=\r\n--|\r\n\r\nContent-Type|$)/i
    );
    const textMatch = raw.match(
      /Content-Type: text\/plain[\s\S]*?\r\n\r\n([\s\S]*?)(?=\r\n--|\r\n\r\nContent-Type|$)/i
    );
    const bodyHtml = htmlMatch ? htmlMatch[1].replace(/=\r\n/g, "").trim() : null;
    let bodyText = textMatch ? textMatch[1].replace(/=\r\n/g, "").trim() : "";
    if (!bodyText && !bodyHtml) {
      const parts = raw.split(/\r\n\r\n/);
      bodyText = parts.slice(1).join("\n").replace(/=\r\n/g, "").trim().slice(0, 500);
    }
    return { bodyText, bodyHtml };
  } catch {
    return { bodyText: "", bodyHtml: null };
  }
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
    .where(and(eq(imapCredentialsTable.id, credentialId), eq(imapCredentialsTable.userId, userId)));
  if (!cred) return null;

  let plainPassword: string;
  try {
    plainPassword = decryptPassword(cred.password);
  } catch {
    return null;
  }

  const client = makeClient({ ...cred, password: plainPassword });
  try {
    await client.connect();
    const resolvedFolder = await resolveFolder(client, folder);
    const lock = await client.getMailboxLock(resolvedFolder);
    try {
      const uids: number[] = [];
      for await (const msg of client.fetch(
        { seq: "1:*" },
        { uid: true },
        { uid: false }
      )) {
        uids.push(msg.uid);
      }

      const topUids = uids.slice(-limit).reverse();
      const messages: any[] = [];

      for await (const msg of client.fetch(
        topUids.join(","),
        { uid: true, envelope: true, flags: true, source: true },
        { uid: true }
      )) {
        const env = msg.envelope;
        const from = env?.from?.[0];
        const { bodyText, bodyHtml } = parseBody(msg.source);

        messages.push({
          id: imapVirtualMsgId(credentialId, msg.uid),
          accountId: imapVirtualAccountId(credentialId),
          accountEmail: cred.email,
          accountName: cred.displayName || cred.email,
          accountColor: cred.color,
          folder,
          subject: env?.subject ?? "(No subject)",
          fromName: from?.name || from?.address || "Unknown",
          fromEmail: from?.address || "unknown@example.com",
          toList: env?.to?.map((a: any) => a.address).join(", ") ?? "",
          ccList: env?.cc?.map((a: any) => a.address).join(", ") ?? null,
          bodyText,
          bodyHtml,
          isRead: msg.flags?.has("\\Seen") ?? false,
          isStarred: msg.flags?.has("\\Flagged") ?? false,
          hasAttachments: false,
          attachments: [],
          receivedAt: (env?.date instanceof Date ? env.date : new Date()).toISOString(),
          createdAt: (env?.date instanceof Date ? env.date : new Date()).toISOString(),
        });
      }

      return { messages, total: uids.length, hasMore: uids.length > limit };
    } finally {
      lock.release();
    }
  } catch {
    return null;
  } finally {
    await client.logout().catch(() => {});
  }
}

export async function getImapMessage(userId: string, virtualId: number): Promise<any | null> {
  const decoded = decodeMsgId(virtualId);
  if (!decoded) return null;
  const { credentialId, uid } = decoded;

  const [cred] = await db
    .select()
    .from(imapCredentialsTable)
    .where(and(eq(imapCredentialsTable.id, credentialId), eq(imapCredentialsTable.userId, userId)));
  if (!cred) return null;

  let plainPassword: string;
  try {
    plainPassword = decryptPassword(cred.password);
  } catch {
    return null;
  }

  const client = makeClient({ ...cred, password: plainPassword });

  // Try folders in priority order; return the first successful match.
  const foldersToTry = ["INBOX", "Sent", "Drafts", "Trash", "Spam", "Archive"];

  try {
    await client.connect();

    for (const folderName of foldersToTry) {
      let resolvedFolder: string;
      try {
        resolvedFolder = await resolveFolder(client, folderName);
      } catch {
        continue;
      }

      const lock = await client.getMailboxLock(resolvedFolder);
      try {
        for await (const msg of client.fetch(
          [uid],
          { uid: true, envelope: true, flags: true, source: true },
          { uid: true }
        )) {
          const env = msg.envelope;
          const from = env?.from?.[0];
          const { bodyText, bodyHtml } = parseBody(msg.source);

          return {
            id: virtualId,
            accountId: imapVirtualAccountId(credentialId),
            accountEmail: cred.email,
            accountName: cred.displayName || cred.email,
            accountColor: cred.color,
            folder: folderName,
            subject: env?.subject ?? "(No subject)",
            fromName: from?.name || from?.address || "Unknown",
            fromEmail: from?.address || "unknown@example.com",
            toList: env?.to?.map((a: any) => a.address).join(", ") ?? "",
            ccList: env?.cc?.map((a: any) => a.address).join(", ") ?? null,
            bodyText,
            bodyHtml,
            isRead: msg.flags?.has("\\Seen") ?? false,
            isStarred: msg.flags?.has("\\Flagged") ?? false,
            hasAttachments: false,
            attachments: [],
            receivedAt: (env?.date instanceof Date ? env.date : new Date()).toISOString(),
            createdAt: (env?.date instanceof Date ? env.date : new Date()).toISOString(),
          };
        }
      } catch {
        // uid not found in this folder, try next
      } finally {
        lock.release();
      }
    }

    return null;
  } catch {
    return null;
  } finally {
    await client.logout().catch(() => {});
  }
}
