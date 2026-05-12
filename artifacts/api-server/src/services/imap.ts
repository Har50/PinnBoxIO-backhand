import { ImapFlow } from "imapflow";
import { db, imapCredentialsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { promises as dns } from "node:dns";
import { isIP } from "node:net";

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
// SSRF protection — validate host/port before any outbound connection
// ---------------------------------------------------------------------------

/** Ports permitted for IMAP connections. */
const ALLOWED_IMAP_PORTS = new Set([143, 585, 993]);

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let val = 0;
  for (const part of parts) {
    const n = Number(part);
    if (!Number.isInteger(n) || n < 0 || n > 255) return null;
    val = (val << 8) | n;
  }
  return val >>> 0;
}

function isPrivateIPv4(ip: string): boolean {
  const n = ipv4ToInt(ip);
  if (n === null) return true;
  const ranges: [number, number][] = [
    [ipv4ToInt("0.0.0.0")!,      ipv4ToInt("0.255.255.255")!],
    [ipv4ToInt("10.0.0.0")!,     ipv4ToInt("10.255.255.255")!],
    [ipv4ToInt("100.64.0.0")!,   ipv4ToInt("100.127.255.255")!],
    [ipv4ToInt("127.0.0.0")!,    ipv4ToInt("127.255.255.255")!],
    [ipv4ToInt("169.254.0.0")!,  ipv4ToInt("169.254.255.255")!],
    [ipv4ToInt("172.16.0.0")!,   ipv4ToInt("172.31.255.255")!],
    [ipv4ToInt("192.0.0.0")!,    ipv4ToInt("192.0.0.255")!],
    [ipv4ToInt("192.0.2.0")!,    ipv4ToInt("192.0.2.255")!],
    [ipv4ToInt("192.168.0.0")!,  ipv4ToInt("192.168.255.255")!],
    [ipv4ToInt("198.18.0.0")!,   ipv4ToInt("198.19.255.255")!],
    [ipv4ToInt("198.51.100.0")!, ipv4ToInt("198.51.100.255")!],
    [ipv4ToInt("203.0.113.0")!,  ipv4ToInt("203.0.113.255")!],
    [ipv4ToInt("240.0.0.0")!,    ipv4ToInt("255.255.255.255")!],
  ];
  return ranges.some(([lo, hi]) => n >= lo && n <= hi);
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase().replace(/^\[|\]$/g, "");
  if (lower === "::1" || lower === "::") return true;
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIPv4(mapped[1]);
  if (/^fe[89ab][0-9a-f]:/i.test(lower)) return true; // link-local fe80::/10
  if (/^f[cd][0-9a-f]{2}:/i.test(lower)) return true;  // unique local fc00::/7
  return false;
}

function isPrivateIP(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return isPrivateIPv4(ip);
  if (version === 6) return isPrivateIPv6(ip);
  return true;
}

/**
 * Validates a host + port before any outbound IMAP connection attempt.
 * Blocks private/reserved IPs, disallows non-IMAP ports, and resolves DNS
 * to guard against hostname rebinding / SSRF attacks.
 */
export async function validateImapTarget(host: string, port: number): Promise<void> {
  if (!ALLOWED_IMAP_PORTS.has(port)) {
    throw new Error(
      `Port ${port} is not allowed. Use 143 (IMAP), 993 (IMAPS), or 585.`
    );
  }

  const cleanHost = host.trim().replace(/^\[|\]$/g, "");

  if (isIP(cleanHost)) {
    if (isPrivateIP(cleanHost)) {
      throw new Error("Connections to private or reserved IP addresses are not allowed.");
    }
    return;
  }

  let addresses: string[] = [];
  try {
    const [v4, v6] = await Promise.allSettled([
      dns.resolve4(cleanHost),
      dns.resolve6(cleanHost),
    ]);
    if (v4.status === "fulfilled") addresses.push(...v4.value);
    if (v6.status === "fulfilled") addresses.push(...v6.value);
  } catch {
    throw new Error(`Could not resolve hostname: ${cleanHost}`);
  }

  if (addresses.length === 0) {
    throw new Error(`No DNS records found for host: ${cleanHost}`);
  }

  for (const addr of addresses) {
    if (isPrivateIP(addr)) {
      throw new Error("Connections to private or reserved addresses are not allowed.");
    }
  }
}

// ---------------------------------------------------------------------------
// Virtual ID scheme
//
// Account IDs:
//   -(IMAP_ACCOUNT_BASE + credentialId)
//   IMAP_ACCOUNT_BASE = 2_000_000_000
//
// Message IDs — encodes credential + folder + UID so they are globally unique
// across mailboxes and fully deterministic (no in-memory state required).
//
//   -(IMAP_MSG_BASE + credentialId * FOLDER_MULT + folderIndex * UID_MULT + uid)
//
//   IMAP_MSG_BASE  = 10_000_000_000_000  (10 trillion — separates from account IDs)
//   FOLDER_MULT    = 50_000_000_000      (50 billion per credential slot)
//   UID_MULT       = 5_000_000_000       (5 billion per folder slot)
//
//   Max safe credentialId ≈ 898 (well above any realistic deployment).
//   UIDs are 32-bit (max 4,294,967,295) which fits within UID_MULT (5B). ✓
//   Max encoded value ≈ −6 × 10^13 << MAX_SAFE_INTEGER (9 × 10^15).        ✓
// ---------------------------------------------------------------------------
export const IMAP_ACCOUNT_BASE = 2_000_000_000;
const IMAP_MSG_BASE = 10_000_000_000_000;
const FOLDER_MULT   =     50_000_000_000;
const UID_MULT      =      5_000_000_000;

/** Canonical folder name → stable numeric index (6 standard IMAP folders). */
const FOLDER_TO_INDEX: Record<string, number> = {
  Inbox:   0,
  Sent:    1,
  Drafts:  2,
  Trash:   3,
  Spam:    4,
  Archive: 5,
};
const INDEX_TO_FOLDER: Record<number, string> = Object.fromEntries(
  Object.entries(FOLDER_TO_INDEX).map(([k, v]) => [v, k])
);

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

function imapVirtualMsgId(credentialId: number, folder: string, uid: number): number {
  const folderIndex = FOLDER_TO_INDEX[folder] ?? 0;
  return -(IMAP_MSG_BASE + credentialId * FOLDER_MULT + folderIndex * UID_MULT + uid);
}

function decodeMsgId(
  virtualId: number
): { credentialId: number; folder: string; uid: number } | null {
  const abs = Math.abs(virtualId);
  if (abs < IMAP_MSG_BASE) return null;
  const remainder   = abs - IMAP_MSG_BASE;
  const credentialId = Math.floor(remainder / FOLDER_MULT);
  const rem2         = remainder % FOLDER_MULT;
  const folderIndex  = Math.floor(rem2 / UID_MULT);
  const uid          = rem2 % UID_MULT;
  const folder       = INDEX_TO_FOLDER[folderIndex] ?? "Inbox";
  return { credentialId, folder, uid };
}

// ---------------------------------------------------------------------------
// ImapFlow client factory (TLS on, no rejectUnauthorized override)
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
// Folder resolution — maps canonical names to actual IMAP path on server
// ---------------------------------------------------------------------------
const FOLDER_CANDIDATES: Record<string, string[]> = {
  Inbox:   ["INBOX"],
  Sent:    ["Sent", "Sent Items", "Sent Messages", "[Gmail]/Sent Mail", "INBOX.Sent"],
  Drafts:  ["Drafts", "[Gmail]/Drafts", "INBOX.Drafts"],
  Trash:   ["Trash", "Deleted Items", "[Gmail]/Trash", "INBOX.Trash"],
  Spam:    ["Spam", "Junk", "Junk Email", "[Gmail]/Spam", "INBOX.Junk"],
  Archive: ["Archive", "[Gmail]/All Mail", "INBOX.Archive"],
};

async function resolveFolder(client: ImapFlow, folder: string): Promise<string> {
  const candidates = FOLDER_CANDIDATES[folder] ?? [folder];
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
  if (node.folders) for (const child of node.folders) names.push(...flattenTree(child));
  return names;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
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

function toDate(d: unknown): Date {
  return d instanceof Date ? d : new Date();
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
  try {
    await validateImapTarget(cred.host, cred.port);
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
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
    .where(and(eq(imapCredentialsTable.id, credentialId), eq(imapCredentialsTable.userId, userId)));
  if (!cred) return null;

  let plainPassword: string;
  try {
    plainPassword = decryptPassword(cred.password);
  } catch {
    return null;
  }

  try {
    await validateImapTarget(cred.host, cred.port);
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
      for await (const msg of client.fetch({ seq: "1:*" }, { uid: true }, { uid: false })) {
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
        const date = toDate(env?.date);

        messages.push({
          // ID encodes credential + folder + UID → globally unique across mailboxes
          id: imapVirtualMsgId(credentialId, folder, msg.uid),
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
          receivedAt: date.toISOString(),
          createdAt: date.toISOString(),
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
  const { credentialId, folder, uid } = decoded;

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

  try {
    await validateImapTarget(cred.host, cred.port);
  } catch {
    return null;
  }

  const client = makeClient({ ...cred, password: plainPassword });
  try {
    await client.connect();
    // Folder is encoded in the virtual ID — go directly, no guessing required
    const resolvedFolder = await resolveFolder(client, folder);
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
        const date = toDate(env?.date);

        return {
          id: virtualId,
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
          receivedAt: date.toISOString(),
          createdAt: date.toISOString(),
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
