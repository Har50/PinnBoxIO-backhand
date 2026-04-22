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
import { logger } from "../lib/logger";

const AUTH_DIR = path.join(process.cwd(), "wa-auth");

export type WAStatus = "disconnected" | "connecting" | "qr" | "pairing" | "connected";

export interface WAEvent {
  type: "status" | "qr" | "pairing_code" | "chats" | "message";
  data: unknown;
}

class WhatsAppService extends EventEmitter {
  private sock: WASocket | null = null;
  private status: WAStatus = "disconnected";
  private qrCode: string | null = null;
  private pairingCode: string | null = null;
  private pendingPairingPhone: string | null = null;
  private chats: Map<string, WAChat> = new Map();
  private messages: Map<string, WAMessage[]> = new Map();
  private reconnectTimer: NodeJS.Timeout | null = null;

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

  /** Start a connection that will use a pairing code instead of QR. */
  async requestPairing(phoneNumber: string): Promise<void> {
    // Normalise: strip non-digits, keep country code
    const clean = phoneNumber.replace(/\D/g, "");
    if (clean.length < 7) throw new Error("Invalid phone number");
    this.pendingPairingPhone = clean;
    this.pairingCode = null;
    await this.connect();
  }

  async connect() {
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

      this.sock.ev.on("creds.update", saveCreds);

      // If pairing requested, attempt to get pairing code once socket is ready
      if (this.pendingPairingPhone && !state.creds.registered) {
        const phone = this.pendingPairingPhone;
        this.setStatus("pairing");
        // Small delay to let the socket handshake complete before requesting
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
          const shouldReconnect = code !== DisconnectReason.loggedOut;
          this.pairingCode = null;
          this.setStatus("disconnected");
          if (shouldReconnect && !this.pendingPairingPhone) {
            this.reconnectTimer = setTimeout(() => this.connect(), 5000);
          }
        }
      });

      this.sock.ev.on("chats.set", ({ chats }) => {
        chats.forEach((c) => this.chats.set(c.id, c));
        this.emit("event", { type: "chats", data: null } as WAEvent);
      });

      this.sock.ev.on("chats.upsert", (chats) => {
        chats.forEach((c) => this.chats.set(c.id, c));
        this.emit("event", { type: "chats", data: null } as WAEvent);
      });

      this.sock.ev.on("chats.update", (updates) => {
        updates.forEach((u) => {
          const existing = this.chats.get(u.id);
          if (existing) this.chats.set(u.id, { ...existing, ...u });
        });
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
    this.setStatus("disconnected");
  }

  async loadMessages(_chatId: string) {
    // Messages are populated in real-time via messages.upsert events
    // and messages.set on initial connection. No explicit fetch needed.
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
