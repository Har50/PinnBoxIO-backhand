import { Router, type Request, type Response } from "express";
import QRCode from "qrcode";
import { downloadMediaMessage } from "@whiskeysockets/baileys";
import { whatsappService } from "../services/whatsapp";

const router = Router();

function jidToPhone(jid: string): string {
  return jid.split("@")[0] ?? jid;
}

type MediaType = "image" | "video" | "audio" | "document" | "sticker" | null;

/** Unwrap nested message containers (viewOnce, ephemeral, etc.) */
function unwrapMessage(msg: any): any {
  const m = msg?.message;
  if (!m) return m;
  return (
    m.viewOnceMessageV2?.message ??
    m.viewOnceMessage?.message ??
    m.ephemeralMessage?.message ??
    m.documentWithCaptionMessage?.message ??
    m
  );
}

function getMediaType(msg: any): MediaType {
  const m = unwrapMessage(msg);
  if (!m) return null;
  if (m.imageMessage) return "image";
  if (m.videoMessage) return "video";
  if (m.audioMessage) return "audio";
  if (m.stickerMessage) return "sticker";
  if (m.documentMessage) return "document";
  return null;
}

function getMediaMimetype(msg: any): string | null {
  const m = unwrapMessage(msg);
  if (!m) return null;
  return (
    m.imageMessage?.mimetype ??
    m.videoMessage?.mimetype ??
    m.audioMessage?.mimetype ??
    m.stickerMessage?.mimetype ??
    m.documentMessage?.mimetype ??
    null
  );
}

function getMessageText(msg: any): string {
  const m = unwrapMessage(msg);
  if (!m) return "";
  return (
    m.conversation ??
    m.extendedTextMessage?.text ??
    m.imageMessage?.caption ??
    m.videoMessage?.caption ??
    m.documentMessage?.fileName ??
    ""
  );
}

router.get("/whatsapp/status", async (_req: Request, res: Response) => {
  const status = whatsappService.getStatus();
  const qrRaw = whatsappService.getQR();
  const pairingCode = whatsappService.getPairingCode();

  let qrDataUrl: string | null = null;
  if (qrRaw) {
    try {
      qrDataUrl = await QRCode.toDataURL(qrRaw, { width: 300, margin: 2 });
    } catch {}
  }

  res.json({ status, qr: qrDataUrl, pairingCode });
});

router.post("/whatsapp/connect", async (_req: Request, res: Response) => {
  const status = whatsappService.getStatus();
  if (status === "connected" || status === "connecting") {
    res.json({ ok: true, status });
    return;
  }
  whatsappService.connect().catch(() => {});
  res.json({ ok: true, status: "connecting" });
});

/** Request a pairing code instead of scanning a QR code.
 *  Body: { phone: "14155552671" } — digits only, include country code (no +)
 */
router.post("/whatsapp/pairing-code", async (req: Request, res: Response) => {
  const { phone } = req.body as { phone?: string };
  if (!phone) {
    res.status(400).json({ error: "phone is required" });
    return;
  }

  const status = whatsappService.getStatus();
  if (status === "connected") {
    res.status(409).json({ error: "Already connected" });
    return;
  }

  try {
    await whatsappService.requestPairing(phone);
    res.json({ ok: true, message: "Pairing code request initiated. Poll /whatsapp/status for the code." });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/whatsapp/logout", async (_req: Request, res: Response) => {
  await whatsappService.logout();
  res.json({ ok: true });
});

router.get("/whatsapp/events", (req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const send = (event: any) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  send({ type: "status", data: { status: whatsappService.getStatus(), qr: null, pairingCode: whatsappService.getPairingCode() } });

  const handler = (event: any) => send(event);
  whatsappService.on("event", handler);

  req.on("close", () => {
    whatsappService.off("event", handler);
  });
});

router.get("/whatsapp/chats", (req: Request, res: Response) => {
  const chats = whatsappService.getChats();
  const serialized = chats.slice(0, 100).map((c: any) => ({
    id: c.id,
    name: whatsappService.getContactName(c.id, c.name),
    unreadCount: c.unreadCount ?? 0,
    timestamp: c.conversationTimestamp ? Number(c.conversationTimestamp) * 1000 : null,
    lastMessage: c.messages?.first ? getMessageText(c.messages.first) : null,
    isGroup: c.id.endsWith("@g.us"),
  }));
  res.json({ chats: serialized });
});

router.get("/whatsapp/chats/:chatId/messages", async (req: Request, res: Response) => {
  const { chatId } = req.params;
  const decoded = decodeURIComponent(chatId);
  // `before` = timestamp ms — return messages older than this for pagination
  const beforeTs = req.query.before ? Number(req.query.before) : null;
  const limit = Math.min(Number(req.query.limit ?? 50), 100);

  await whatsappService.loadMessages(decoded);
  let msgs = whatsappService.getMessages(decoded);

  if (beforeTs) {
    msgs = msgs.filter((m: any) => Number(m.messageTimestamp ?? 0) * 1000 < beforeTs);
  }

  // Return the most recent `limit` messages (or the window before `before`)
  const page = msgs.slice(-limit);

  const serialized = page.map((m: any) => ({
    id: m.key.id,
    fromMe: m.key.fromMe ?? false,
    text: getMessageText(m),
    mediaType: getMediaType(m),
    timestamp: m.messageTimestamp ? Number(m.messageTimestamp) * 1000 : null,
    status: m.status ?? null,
  }));

  res.json({ messages: serialized, hasMore: msgs.length > limit });
});

/** Stream the binary media for a specific message */
router.get("/whatsapp/chats/:chatId/messages/:msgId/media", async (req: Request, res: Response) => {
  const { chatId, msgId } = req.params;
  const decoded = decodeURIComponent(chatId);

  const msg = whatsappService.getMessage(decoded, msgId);
  if (!msg) {
    res.status(404).json({ error: "Message not found" });
    return;
  }

  const mediaType = getMediaType(msg);
  if (!mediaType) {
    res.status(400).json({ error: "Message has no media" });
    return;
  }

  try {
    const buffer = await downloadMediaMessage(
      msg,
      "buffer",
      {},
    ) as Buffer;

    const mime = getMediaMimetype(msg) ?? "application/octet-stream";
    res.setHeader("Content-Type", mime);
    res.setHeader("Cache-Control", "private, max-age=3600");
    if (mediaType === "document") {
      const m = unwrapMessage(msg);
      const fileName = m?.documentMessage?.fileName ?? "file";
      res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    }
    res.send(buffer);
  } catch (err: any) {
    res.status(502).json({ error: "Failed to download media: " + (err?.message ?? String(err)) });
  }
});

router.post("/whatsapp/chats/:chatId/messages", async (req: Request, res: Response) => {
  const { chatId } = req.params;
  const decoded = decodeURIComponent(chatId);
  const { text } = req.body as { text?: string };

  if (!text?.trim()) {
    res.status(400).json({ error: "text is required" });
    return;
  }

  const ok = await whatsappService.sendMessage(decoded, text.trim());
  if (!ok) {
    res.status(503).json({ error: "WhatsApp not connected or send failed" });
    return;
  }
  res.json({ ok: true });
});

export default router;
