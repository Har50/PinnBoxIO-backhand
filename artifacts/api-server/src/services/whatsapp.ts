import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  type WASocket,
  type WAMessage,
  type WAChat,
  makeCacheableSignalKeyStore,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import { EventEmitter } from "events";
import path from "path";
import fs from "fs";
import { logger } from "../lib/logger";
import {
  downloadWaAuthFromStorage,
  uploadWaAuthDirToStorage,
  deleteWaAuthFromStorage,
} from "../lib/waAuthSync";

const AUTH_DIR = path.join(process.cwd(), "wa-auth");
const CHATS_FILE = path.join(AUTH_DIR, "chats.json");
const CONTACTS_FILE = path.join(AUTH_DIR, "contacts.json");
const MSGS_DIR = path.join(AUTH_DIR, "msgs");

export type WAStatus = "disconnected" | "connecting" | "qr" | "pairing" | "connected";

export interface WAEvent {
  type: "status" | "qr" | "pairing_code" | "chats" | "message";
  data: unknown;
}

export interface WAContact {
  id: string;
  name?: string;
  notify?: string;
}

/** Encode a chat JID into a safe filename */
function jidToFilename(jid: string): string {
  return jid.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function loadPersistedChats(): Map<string, WAChat> {
  try {
    if (fs.existsSync(CHATS_FILE)) {
      const raw = fs.readFileSync(CHATS_FILE, "utf-8");
      const arr: WAChat[] = JSON.parse(raw);
      const map = new Map<string, WAChat>();
      arr.forEach((c) => map.set(c.id, c));
      return map;
    }
  } catch (err) {
    logger.warn({ err }, "Could not load persisted WhatsApp chats");
  }
  return new Map();
}

function loadPersistedContacts(): Map<string, WAContact> {
  try {
    if (fs.existsSync(CONTACTS_FILE)) {
      const raw = fs.readFileSync(CONTACTS_FILE, "utf-8");
      const arr: WAContact[] = JSON.parse(raw);
      const map = new Map<string, WAContact>();
      arr.forEach((c) => map.set(c.id, c));
      return map;
    }
  } catch (err) {
    logger.warn({ err }, "Could not load persisted WhatsApp contacts");
  }
  return new Map();
}

function loadPersistedMessages(chatId: string): WAMessage[] {
  try {
    fs.mkdirSync(MSGS_DIR, { recursive: true });
    const file = path.join(MSGS_DIR, `${jidToFilename(chatId)}.json`);
    if (fs.existsSync(file)) {
      const raw = fs.readFileSync(file, "utf-8");
      return JSON.parse(raw);
    }
  } catch (err) {
    logger.warn({ err, chatId }, "Could not load persisted messages");
  }
  return [];
}

function saveMessagesToFile(chatId: string, msgs: WAMessage[]) {
  try {
    fs.mkdirSync(MSGS_DIR, { recursive: true });
    const file = path.join(MSGS_DIR, `${jidToFilename(chatId)}.json`);
    fs.writeFileSync(file, JSON.stringify(msgs));
  } catch (err) {
    logger.warn({ err, chatId }, "Could not persist messages");
  }
}

class WhatsAppService extends EventEmitter {
  private sock: WASocket | null = null;
  private status: WAStatus = "disconnected";
  private qrCode: string | null = null;
  private pairingCode: string | null = null;
  private pendingPairingPhone: string | null = null;
  private chats: Map<string, WAChat> = loadPersistedChats();
  private contacts: Map<string, WAContact> = loadPersistedContacts();
  private messages: Map<string, WAMessage[]> = new Map();
  private msgSaveTimers: Map<string, NodeJS.Timeout> = new Map();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private saveTimer: NodeJS.Timeout | null = null;
  private connectInProgress = false;

  getStatus(): WAStatus { return this.status; }
  getQR(): string | null { return this.qrCode; }
  getPairingCode(): string | null { return this.pairingCode; }

  getChats(): WAChat[] {
    return Array.from(this.chats.values()).sort((a, b) => {
      const ta = (a as any).conversationTimestamp ?? 0;
      const tb = (b as any).conversationTimestamp ?? 0;
      return Number(tb) - Number(ta);
    });
  }

  /** Resolve the best display name for a JID */
  getContactName(jid: string, pushName?: string | null): string {
    const contact = this.contacts.get(jid);
    return contact?.name ?? contact?.notify ?? pushName ?? jid.split("@")[0] ?? jid;
  }

  getMessages(chatId: string): WAMessage[] {
    if (!this.messages.has(chatId)) {
      const persisted = loadPersistedMessages(chatId);
      this.messages.set(chatId, persisted);
    }
    return this.messages.get(chatId) ?? [];
  }

  getMessage(chatId: string, msgId: string): WAMessage | undefined {
    return this.getMessages(chatId).find((m) => m.key.id === msgId);
  }

  getSocket(): WASocket | null {
    return this.sock;
  }

  private scheduleSaveChats() {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      try {
        fs.mkdirSync(AUTH_DIR, { recursive: true });
        fs.writeFileSync(CHATS_FILE, JSON.stringify(Array.from(this.chats.values())));
        uploadWaAuthDirToStorage(AUTH_DIR).catch(() => {});
      } catch (err) {
        logger.warn({ err }, "Could not persist WhatsApp chats");
      }
    }, 2000);
  }

  private scheduleSaveContacts() {
    setTimeout(() => {
      try {
        fs.mkdirSync(AUTH_DIR, { recursive: true });
        fs.writeFileSync(CONTACTS_FILE, JSON.stringify(Array.from(this.contacts.values())));
      } catch (err) {
        logger.warn({ err }, "Could not persist WhatsApp contacts");
      }
    }, 3000);
  }

  private scheduleSaveMessages(chatId: string) {
    const existing = this.msgSaveTimers.get(chatId);
    if (existing) clearTimeout(existing);
    const t = setTimeout(() => {
      const msgs = this.messages.get(chatId);
      if (msgs) saveMessagesToFile(chatId, msgs);
      this.msgSaveTimers.delete(chatId);
    }, 1500);
    this.msgSaveTimers.set(chatId, t);
  }

  private upsertMessages(chatId: string, incoming: WAMessage[], prepend = false) {
    const existing = this.getMessages(chatId);
    for (const msg of incoming) {
      const idx = existing.findIndex((m) => m.key.id === msg.key.id);
      if (idx >= 0) {
        existing[idx] = msg;
      } else if (prepend) {
        existing.unshift(msg);
      } else {
        existing.push(msg);
      }
    }
    existing.sort((a, b) => Number(a.messageTimestamp ?? 0) - Number(b.messageTimestamp ?? 0));
    // Keep up to 500 messages per chat
    const trimmed = existing.slice(-500);
    this.messages.set(chatId, trimmed);
    this.scheduleSaveMessages(chatId);
    return trimmed;
  }

  /** Returns true when valid saved credentials exist in cloud storage (source of truth). */
  async hasCredentials(): Promise<boolean> {
    const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
    if (!bucketId) {
      return fs.existsSync(path.join(AUTH_DIR, "creds.json"));
    }
    try {
      const { objectStorageClient } = await import("../lib/objectStorage");
      const bucket = objectStorageClient.bucket(bucketId);
      const [exists] = await bucket.file("wa-auth/creds.json").exists();
      return exists;
    } catch {
      return false;
    }
  }

  /** Start a connection that will use a pairing code instead of QR. */
  async requestPairing(phoneNumber: string): Promise<void> {
    const clean = phoneNumber.replace(/\D/g, "");
    if (clean.length < 7) throw new Error("Invalid phone number");
    this.pendingPairingPhone = clean;
    this.pairingCode = null;
    await this.connect();
  }

  async connect() {
    if (this.connectInProgress) {
      logger.info("connect() already in progress — skipping duplicate call");
      return;
    }
    this.connectInProgress = true;

    try {
      if (this.sock) {
        try { this.sock.end(undefined); } catch {}
        this.sock = null;
      }
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }

      this.setStatus("connecting");

      try {
        if (fs.existsSync(AUTH_DIR)) {
          const entries = fs.readdirSync(AUTH_DIR);
          for (const entry of entries) {
            const fp = path.join(AUTH_DIR, entry);
            // Only clear auth credential files — preserve chats, contacts, and msgs
            if (!["chats.json", "contacts.json", "msgs"].includes(entry)) {
              if (fs.lstatSync(fp).isDirectory()) {
                fs.rmSync(fp, { recursive: true, force: true });
              } else {
                fs.unlinkSync(fp);
              }
            }
          }
        }
      } catch {}

      await downloadWaAuthFromStorage(AUTH_DIR);

      const freshChats = loadPersistedChats();
      if (freshChats.size > 0) {
        freshChats.forEach((c, id) => this.chats.set(id, c));
        logger.info({ count: freshChats.size }, "Reloaded WA chats from storage after download");
      }

      const freshContacts = loadPersistedContacts();
      if (freshContacts.size > 0) {
        freshContacts.forEach((c, id) => this.contacts.set(id, c));
        logger.info({ count: freshContacts.size }, "Reloaded WA contacts");
      }

      const { version } = await fetchLatestBaileysVersion();
      const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

      this.sock = makeWASocket({
        version,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, logger as any),
        },
        printQRInTerminal: false,
        logger: logger as any,
        browser: ["PinnboxIO", "Chrome", "1.0.0"],
        syncFullHistory: false,
        markOnlineOnConnect: false,
      });

      this.sock.ev.on("creds.update", async () => {
        await saveCreds();
        uploadWaAuthDirToStorage(AUTH_DIR).catch(() => {});
      });

      if (this.pendingPairingPhone && !state.creds.registered) {
        const phone = this.pendingPairingPhone;
        this.setStatus("pairing");
        setTimeout(async () => {
          try {
            const code = await this.sock!.requestPairingCode(phone);
            this.pairingCode = code;
            this.pendingPairingPhone = null;
            this.emit("event", { type: "pairing_code", data: { code } } as WAEvent);
            this.setStatus("pairing");
          } catch (err) {
            logger.error({ err }, "WhatsApp pairing code request failed");
            this.pendingPairingPhone = null;
            this.setStatus("disconnected");
          }
        }, 2500);
      }

      this.sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr && !this.pendingPairingPhone) {
          this.qrCode = qr;
          this.setStatus("qr");
          this.emit("event", { type: "qr", data: { qr } } as WAEvent);
        }

        if (connection === "open") {
          this.qrCode = null;
          this.pairingCode = null;
          this.pendingPairingPhone = null;
          this.setStatus("connected");
        }

        if (connection === "close") {
          const code = (lastDisconnect?.error as Boom)?.output?.statusCode;
          const isLoggedOut = code === DisconnectReason.loggedOut;
          const isReplaced = code === DisconnectReason.connectionReplaced;
          this.pairingCode = null;
          this.setStatus("disconnected");

          if (isLoggedOut) {
            logger.info({ code }, "WA logged out by user — clearing credentials");
            try {
              const files = fs.readdirSync(AUTH_DIR);
              files.forEach((f) => {
                const fp = path.join(AUTH_DIR, f);
                if (!["chats.json", "contacts.json", "msgs"].includes(f)) {
                  if (fs.lstatSync(fp).isDirectory()) {
                    fs.rmSync(fp, { recursive: true, force: true });
                  } else {
                    fs.unlinkSync(fp);
                  }
                }
              });
            } catch {}
            deleteWaAuthFromStorage().catch(() => {});
          } else if (isReplaced) {
            logger.info("WA connection replaced — reconnecting in 8s");
            this.reconnectTimer = setTimeout(() => this.connect(), 8000);
          } else if (!this.pendingPairingPhone) {
            this.reconnectTimer = setTimeout(() => this.connect(), 5000);
          }
        }
      });

      this.sock.ev.on("chats.set", ({ chats }) => {
        chats.forEach((c) => this.chats.set(c.id, c));
        this.scheduleSaveChats();
        this.emit("event", { type: "chats", data: null } as WAEvent);
      });

      this.sock.ev.on("chats.upsert", (chats) => {
        chats.forEach((c) => this.chats.set(c.id, c));
        this.scheduleSaveChats();
        this.emit("event", { type: "chats", data: null } as WAEvent);
      });

      this.sock.ev.on("chats.update", (updates) => {
        updates.forEach((u) => {
          const existing = this.chats.get(u.id);
          if (existing) this.chats.set(u.id, { ...existing, ...u });
        });
        this.scheduleSaveChats();
        this.emit("event", { type: "chats", data: null } as WAEvent);
      });

      // Contacts
      this.sock.ev.on("contacts.set", ({ contacts: list }) => {
        list.forEach((c: any) => {
          if (!c.id) return;
          const existing = this.contacts.get(c.id) ?? { id: c.id };
          this.contacts.set(c.id, {
            ...existing,
            id: c.id,
            name: c.name ?? existing.name,
            notify: c.notify ?? existing.notify,
          });
        });
        logger.info({ count: this.contacts.size }, "WA contacts set");
        this.scheduleSaveContacts();
      });

      this.sock.ev.on("contacts.upsert", (list: any[]) => {
        list.forEach((c: any) => {
          if (!c.id) return;
          const existing = this.contacts.get(c.id) ?? { id: c.id };
          this.contacts.set(c.id, {
            ...existing,
            id: c.id,
            name: c.name ?? existing.name,
            notify: c.notify ?? existing.notify,
          });
        });
        this.scheduleSaveContacts();
      });

      this.sock.ev.on("contacts.update", (updates: any[]) => {
        updates.forEach((u: any) => {
          if (!u.id) return;
          const existing = this.contacts.get(u.id) ?? { id: u.id };
          this.contacts.set(u.id, {
            ...existing,
            name: u.name ?? existing.name,
            notify: u.notify ?? existing.notify,
          });
        });
        this.scheduleSaveContacts();
      });

      // Messages
      this.sock.ev.on("messages.set", ({ messages: msgs }) => {
        msgs.forEach((msg) => {
          if (!msg.key.remoteJid) return;
          this.upsertMessages(msg.key.remoteJid, [msg]);
        });
      });

      this.sock.ev.on("messages.upsert", ({ messages: msgs, type }) => {
        msgs.forEach((msg) => {
          if (!msg.key.remoteJid) return;
          const chatId = msg.key.remoteJid;

          const existingChat = this.chats.get(chatId) ?? ({ id: chatId } as WAChat);
          const contactName = this.contacts.get(chatId)?.name
            ?? this.contacts.get(chatId)?.notify
            ?? (msg.key.fromMe ? undefined : (msg.pushName ?? undefined))
            ?? existingChat.name;

          const updatedChat: WAChat = {
            ...existingChat,
            id: chatId,
            name: contactName ?? existingChat.name,
            conversationTimestamp: msg.messageTimestamp ?? existingChat.conversationTimestamp,
            messages: { first: msg } as any,
            unreadCount: msg.key.fromMe ? (existingChat.unreadCount ?? 0) : ((existingChat.unreadCount ?? 0) + 1),
          };
          this.chats.set(chatId, updatedChat);
          this.scheduleSaveChats();

          this.upsertMessages(chatId, [msg]);
          this.emit("event", { type: "message", data: { chatId, msg } } as WAEvent);
        });
      });

      // Historical messages from history sync
      this.sock.ev.on("messaging-history.set", ({ messages: msgs, chats: histChats, contacts: histContacts, isLatest }) => {
        if (histContacts) {
          histContacts.forEach((c: any) => {
            if (!c.id) return;
            const existing = this.contacts.get(c.id) ?? { id: c.id };
            this.contacts.set(c.id, { ...existing, id: c.id, name: c.name ?? existing.name, notify: c.notify ?? existing.notify });
          });
          this.scheduleSaveContacts();
        }
        if (histChats) {
          histChats.forEach((c: any) => {
            if (c.id) this.chats.set(c.id, { ...(this.chats.get(c.id) ?? {}), ...c });
          });
          this.scheduleSaveChats();
        }
        if (msgs) {
          msgs.forEach((msg: any) => {
            if (!msg.key?.remoteJid) return;
            this.upsertMessages(msg.key.remoteJid, [msg]);
          });
          logger.info({ count: msgs.length }, "WA history sync messages loaded");
        }
      });

    } catch (err) {
      logger.error({ err }, "WhatsApp connect error");
      this.setStatus("disconnected");
    } finally {
      this.connectInProgress = false;
    }
  }

  async sendMessage(chatId: string, text: string): Promise<boolean> {
    if (!this.sock || this.status !== "connected") return false;
    try {
      await this.sock.sendMessage(chatId, { text });
      return true;
    } catch (err) {
      logger.error({ err }, "WhatsApp sendMessage error");
      return false;
    }
  }

  async logout() {
    if (this.sock) {
      try { await this.sock.logout(); } catch {}
      this.sock = null;
    }
    this.chats.clear();
    this.messages.clear();
    this.qrCode = null;
    this.pairingCode = null;
    this.pendingPairingPhone = null;
    try { fs.unlinkSync(CHATS_FILE); } catch {}
    deleteWaAuthFromStorage().catch(() => {});
    this.setStatus("disconnected");
  }

  async loadMessages(chatId: string) {
    // Messages are loaded from disk on first access (via getMessages).
    // Bail if no socket — just return persisted data.
    if (!this.sock || this.status !== "connected") return;

    // Ensure in-memory cache is populated from disk
    this.getMessages(chatId);

    // Request older history from WhatsApp for this chat
    try {
      const msgs = this.messages.get(chatId) ?? [];
      if (msgs.length > 0) {
        const oldest = msgs[0];
        if (oldest?.key) {
          await (this.sock as any).fetchMessageHistory?.(50, chatId, oldest.key);
        }
      }
    } catch {
      // fetchMessageHistory may not be available in all Baileys versions — ignore
    }
  }

  private setStatus(s: WAStatus) {
    this.status = s;
    this.emit("event", {
      type: "status",
      data: { status: s, qr: this.qrCode, pairingCode: this.pairingCode },
    } as WAEvent);
  }
}

export const whatsappService = new WhatsAppService();
