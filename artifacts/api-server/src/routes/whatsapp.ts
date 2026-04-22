import { Router, type Request, type Response } from "express";
import QRCode from "qrcode";
import { whatsappService } from "../services/whatsapp";

const router = Router();

function jidToPhone(jid: string): string {
  return jid.split("@")[0] ?? jid;
}

function getMessageText(msg: any): string {
  return (
    msg?.message?.conversation ??
    msg?.message?.extendedTextMessage?.text ??
    msg?.message?.imageMessage?.caption ??
    msg?.message?.videoMessage?.caption ??
    msg?.message?.documentMessage?.fileName ??
    (msg?.message?.imageMessage ? "[Image]" : null) ??
    (msg?.message?.videoMessage ? "[Video]" : null) ??
    (msg?.message?.audioMessage ? "[Audio]" : null) ??
    (msg?.message?.stickerMessage ? "[Sticker]" : null) ??
    (msg?.message?.documentMessage ? "[Document]" : null) ??
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
  const serialized = chats.slice(0, 50).map((c: any) => ({
    id: c.id,
    name: c.name ?? jidToPhone(c.id),
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

  await whatsappService.loadMessages(decoded);
  const msgs = whatsappService.getMessages(decoded);

  const serialized = msgs.map((m: any) => ({
    id: m.key.id,
    fromMe: m.key.fromMe ?? false,
    text: getMessageText(m),
    timestamp: m.messageTimestamp ? Number(m.messageTimestamp) * 1000 : null,
    status: m.status ?? null,
  }));

  res.json({ messages: serialized });
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
