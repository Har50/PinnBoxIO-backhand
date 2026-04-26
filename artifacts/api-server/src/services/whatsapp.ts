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

export type WAStatus = "disconnected" | "connecting" | "qr" | "pairing" | "connected";

export interface WAEvent {
  type: "status" | "qr" | "pairing_code" | "chats" | "message";
  data: unknown;
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

class WhatsAppService extends EventEmitter {
  private sock: WASocket | null = null;
  private status: WAStatus = "disconnected";
  private qrCode: string | null = null;
  private pairingCode: string | null = null;
  private pendingPairingPhone: string | null = null;
  private chats: Map<string, WAChat> = loadPersistedChats();
  private messages: Map<string, WAMessage[]> = new Map();
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

  getMessages(chatId: string): WAMessage[] {
    return this.messages.get(chatId) ?? [];
  }

  private scheduleSaveChats() {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      try {
        fs.mkdirSync(AUTH_DIR, { recursive: true });
        fs.writeFileSync(CHATS_FILE, JSON.stringify(Array.from(this.chats.values())));
        // Upload chats to cloud storage so they survive deployments
        uploadWaAuthDirToStorage(AUTH_DIR).catch(() => {});
      } catch (err) {
        logger.warn({ err }, "Could not persist WhatsApp chats");
      }
    }, 2000);
  }

  /** Returns true when valid saved credentials exist in cloud storage (source of truth). */
  async hasCredentials(): Promise<boolean> {
    // Only trust cloud storage — local disk may hold stale/invalidated creds
    // from a previous session that was logged out or replaced.
    const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
    if (!bucketId) {
      // No cloud storage configured: fall back to local disk (dev/local mode)
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
    // Prevent simultaneous connect calls from racing each other
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

      // Always clear local auth dir first so stale/invalidated creds from a
      // previous session never get accidentally reused by Baileys.
      try {
        if (fs.existsSync(AUTH_DIR)) {
          const entries = fs.readdirSync(AUTH_DIR);
          for (const entry of entries) {
            const fp = path.join(AUTH_DIR, entry);
            if (fs.lstatSync(fp).isDirectory()) {
              fs.rmSync(fp, { recursive: true, force: true });
            } else {
              fs.unlinkSync(fp);
            }
          }
        }
      } catch {}

      // Download fresh credentials from cloud storage (empty = fresh scan needed)
      await downloadWaAuthFromStorage(AUTH_DIR);

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
        // Persist updated credentials to cloud storage so they survive deploys
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

          if (isLoggedOut || isReplaced) {
            // Session ended permanently — clear credentials so the next
            // connection starts clean and doesn't loop on stale creds.
            logger.info({ code, reason: isReplaced ? "replaced" : "loggedOut" }, "WA session ended, clearing credentials");
            try {
              const files = fs.readdirSync(AUTH_DIR);
              files.forEach((f) => {
                const fp = path.join(AUTH_DIR, f);
                if (fs.lstatSync(fp).isDirectory()) {
                  fs.rmSync(fp, { recursive: true, force: true });
                } else {
                  fs.unlinkSync(fp);
                }
              });
            } catch {}
            deleteWaAuthFromStorage().catch(() => {});
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

      this.sock.ev.on("messages.set", ({ messages: msgs }) => {
        msgs.forEach((msg) => {
          if (!msg.key.remoteJid) return;
          const chatId = msg.key.remoteJid;
          const existing = this.messages.get(chatId) ?? [];
          const idx = existing.findIndex((m) => m.key.id === msg.key.id);
          if (idx === -1) existing.push(msg);
          this.messages.set(chatId, existing);
        });
      });

      this.sock.ev.on("messages.upsert", ({ messages: msgs }) => {
        msgs.forEach((msg) => {
          if (!msg.key.remoteJid) return;
          const chatId = msg.key.remoteJid;
          const existing = this.messages.get(chatId) ?? [];
          const idx = existing.findIndex((m) => m.key.id === msg.key.id);
          if (idx >= 0) {
            existing[idx] = msg;
          } else {
            existing.push(msg);
          }
          existing.sort((a, b) => {
            const ta = Number(a.messageTimestamp ?? 0);
            const tb = Number(b.messageTimestamp ?? 0);
            return ta - tb;
          });
          this.messages.set(chatId, existing.slice(-100));
          this.emit("event", { type: "message", data: { chatId, msg } } as WAEvent);
        });
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
    // Remove credentials from cloud storage so auto-connect doesn't fire next start
    deleteWaAuthFromStorage().catch(() => {});
    this.setStatus("disconnected");
  }

  async loadMessages(_chatId: string) {
    // Messages are populated in real-time via messages.upsert events
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
