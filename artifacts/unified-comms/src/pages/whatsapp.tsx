import { useState, useEffect, useRef, useCallback } from "react";
import {
  MessageCircle, Phone, Video, MoreVertical, Search,
  Send, Smile, Paperclip, ChevronLeft, LogOut, Loader2,
  QrCode, Smartphone, RefreshCw, AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiFetch, getAuthHeaders } from "@/lib/api-client";

const WA_GREEN = "#25D366";
const WA_DARK_HEADER = "#128C7E";

type WAStatus = "disconnected" | "connecting" | "qr" | "pairing" | "connected";
type ConnectMode = "qr" | "phone";

type Chat = {
  id: string;
  name: string;
  unreadCount: number;
  timestamp: number | null;
  lastMessage: string | null;
  isGroup: boolean;
};

type MediaType = "image" | "video" | "audio" | "document" | "sticker" | null;

type Message = {
  id: string;
  fromMe: boolean;
  text: string;
  mediaType: MediaType;
  timestamp: number | null;
  status: number | null;
};

async function apiGet<T>(path: string): Promise<T> {
  return apiFetch<T>(`/api${path}`);
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(`/api${path}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function formatTime(ts: number | null): string {
  if (!ts) return "";
  const date = new Date(ts);
  const diff = Date.now() - ts;
  if (diff < 24 * 60 * 60 * 1000) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diff < 7 * 24 * 60 * 60 * 1000) return date.toLocaleDateString([], { weekday: "short" });
  return date.toLocaleDateString([], { day: "2-digit", month: "2-digit" });
}

/** Fetches media from the authenticated API and renders it as an <img>, <video>, <audio>, or download link */
function useMediaBlobUrl(chatId: string, msgId: string, enabled: boolean) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let url: string | null = null;
    (async () => {
      try {
        const headers = await getAuthHeaders();
        const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
        const res = await fetch(
          `${base}/api/whatsapp/chats/${encodeURIComponent(chatId)}/messages/${msgId}/media`,
          { credentials: "include", headers: headers as HeadersInit },
        );
        if (!res.ok) { setFailed(true); return; }
        const blob = await res.blob();
        url = URL.createObjectURL(blob);
        setBlobUrl(url);
      } catch { setFailed(true); }
    })();
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [chatId, msgId, enabled]);

  return { blobUrl, failed };
}

function MediaImage({ chatId, msgId, caption }: { chatId: string; msgId: string; caption?: string }) {
  const { blobUrl, failed } = useMediaBlobUrl(chatId, msgId, true);
  if (failed) return <p className="text-sm italic text-gray-400 dark:text-[#8696a0]">📷 Image unavailable</p>;
  if (!blobUrl) return <div className="w-48 h-28 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />;
  return (
    <div>
      <img
        src={blobUrl}
        alt={caption ?? ""}
        className="max-w-[260px] rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
        onClick={() => window.open(blobUrl)}
      />
      {caption && <p className="text-sm text-gray-800 dark:text-[#e9edef] mt-1 leading-relaxed">{caption}</p>}
    </div>
  );
}

function MediaVideo({ chatId, msgId, caption }: { chatId: string; msgId: string; caption?: string }) {
  const { blobUrl, failed } = useMediaBlobUrl(chatId, msgId, true);
  if (failed) return <p className="text-sm italic text-gray-400 dark:text-[#8696a0]">🎥 Video unavailable</p>;
  if (!blobUrl) return <div className="w-48 h-28 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />;
  return (
    <div>
      <video src={blobUrl} controls className="max-w-[260px] rounded-lg" />
      {caption && <p className="text-sm text-gray-800 dark:text-[#e9edef] mt-1 leading-relaxed">{caption}</p>}
    </div>
  );
}

function MediaAudio({ chatId, msgId }: { chatId: string; msgId: string }) {
  const { blobUrl, failed } = useMediaBlobUrl(chatId, msgId, true);
  if (failed) return <p className="text-sm italic text-gray-400 dark:text-[#8696a0]">🎵 Audio unavailable</p>;
  if (!blobUrl) return <div className="w-48 h-10 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />;
  return <audio src={blobUrl} controls className="max-w-[260px]" />;
}

function MediaDocument({ chatId, msgId, fileName }: { chatId: string; msgId: string; fileName?: string }) {
  const { blobUrl, failed } = useMediaBlobUrl(chatId, msgId, true);
  const label = fileName ?? "Document";
  if (failed) return <p className="text-sm italic text-gray-400 dark:text-[#8696a0]">📄 {label} — unavailable</p>;
  if (!blobUrl) return <div className="w-48 h-10 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />;
  return (
    <a href={blobUrl} download={label} className="flex items-center gap-2 text-sm underline text-blue-600 dark:text-blue-400">
      📄 {label}
    </a>
  );
}

function MessageContent({ msg, chatId }: { msg: Message; chatId: string }) {
  switch (msg.mediaType) {
    case "image":
    case "sticker":
      return <MediaImage chatId={chatId} msgId={msg.id} caption={msg.text || undefined} />;
    case "video":
      return <MediaVideo chatId={chatId} msgId={msg.id} caption={msg.text || undefined} />;
    case "audio":
      return <MediaAudio chatId={chatId} msgId={msg.id} />;
    case "document":
      return <MediaDocument chatId={chatId} msgId={msg.id} fileName={msg.text || undefined} />;
    default:
      if (!msg.text) return <p className="text-sm italic text-gray-400 dark:text-[#8696a0]">Message</p>;
      return <p className="text-sm text-gray-800 dark:text-[#e9edef] leading-relaxed whitespace-pre-wrap">{msg.text}</p>;
  }
}

function ConnectPanel({
  status, qr, pairingCode,
  onConnect, onPairing, onRefresh,
}: {
  status: WAStatus;
  qr: string | null;
  pairingCode: string | null;
  onConnect: () => void;
  onPairing: (phone: string) => Promise<void>;
  onRefresh: () => void;
}) {
  const [mode, setMode] = useState<ConnectMode>("qr");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);

  const handlePairing = async () => {
    const clean = phone.replace(/\D/g, "");
    if (clean.length < 7) {
      setPhoneError("Enter a valid phone number with country code, e.g. 14155552671");
      return;
    }
    setPhoneError(null);
    setRequesting(true);
    try {
      await onPairing(clean);
    } catch (e: any) {
      setPhoneError(e.message ?? "Failed to request code");
    } finally {
      setRequesting(false);
    }
  };

  const isBusy = status === "connecting" || status === "pairing" || requesting;
  const isIdle = status === "disconnected";

  const formattedCode = pairingCode
    ? (pairingCode.length === 8 ? `${pairingCode.slice(0, 4)}-${pairingCode.slice(4)}` : pairingCode)
    : null;

  return (
    <div className="flex h-full items-center justify-center bg-gray-100 dark:bg-[#111b21]">
      <div className="bg-white dark:bg-[#1f2c34] rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 max-w-sm w-full mx-4 text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: WA_GREEN + "20" }}>
          <MessageCircle size={30} style={{ color: WA_GREEN }} />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-[#e9edef] mb-1">Connect WhatsApp</h2>
        <p className="text-sm text-gray-500 dark:text-[#8696a0] mb-5">Link your account to send and receive messages.</p>

        {isIdle && (
          <div className="flex rounded-lg bg-gray-100 dark:bg-[#2a3942] p-1 mb-5 gap-1">
            {(["qr", "phone"] as ConnectMode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setPhoneError(null); }}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition-all",
                  mode === m
                    ? "bg-white dark:bg-[#111b21] shadow-sm text-gray-900 dark:text-[#e9edef]"
                    : "text-gray-500 dark:text-[#8696a0] hover:text-gray-700 dark:hover:text-[#e9edef]"
                )}
              >
                {m === "qr" ? <QrCode size={14} /> : <Smartphone size={14} />}
                {m === "qr" ? "Scan QR" : "Phone Number"}
              </button>
            ))}
          </div>
        )}

        {isIdle && mode === "qr" && (
          <>
            <p className="text-xs text-gray-400 dark:text-[#8696a0] mb-4">
              Open WhatsApp → <strong>Settings → Linked Devices → Link a Device</strong> and scan the QR code.
            </p>
            <button
              onClick={onConnect}
              className="w-full py-2.5 rounded-lg text-white font-medium text-sm hover:opacity-90 transition-opacity"
              style={{ backgroundColor: WA_GREEN }}
            >
              Get QR Code
            </button>
          </>
        )}

        {isIdle && mode === "phone" && (
          <>
            <p className="text-xs text-gray-400 dark:text-[#8696a0] mb-3">
              Enter your WhatsApp number with country code (no +). You'll get an 8-digit code to enter in WhatsApp.
            </p>
            <div className={cn(
              "flex items-center gap-2 border rounded-lg px-3 py-2.5 mb-1 bg-gray-50 dark:bg-[#2a3942] text-left",
              phoneError ? "border-red-400" : "border-gray-200 dark:border-gray-600"
            )}>
              <Smartphone size={15} className="text-gray-400 dark:text-[#8696a0] shrink-0" />
              <input
                type="tel"
                placeholder="14155552671"
                className="flex-1 text-sm bg-transparent outline-none text-gray-800 dark:text-[#e9edef] placeholder-gray-400 dark:placeholder-[#8696a0]"
                value={phone}
                onChange={(e) => { setPhone(e.target.value); setPhoneError(null); }}
                onKeyDown={(e) => e.key === "Enter" && handlePairing()}
              />
            </div>
            {phoneError && (
              <p className="flex items-center gap-1 text-xs text-red-500 mb-2 text-left">
                <AlertCircle size={12} /> {phoneError}
              </p>
            )}
            <button
              onClick={handlePairing}
              disabled={isBusy || !phone.trim()}
              className="w-full py-2.5 rounded-lg text-white font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2 hover:opacity-90 transition-opacity mt-2"
              style={{ backgroundColor: WA_GREEN }}
            >
              {requesting ? <><Loader2 size={16} className="animate-spin" /> Requesting…</> : "Request Code"}
            </button>
          </>
        )}

        {status === "connecting" && (
          <div className="flex flex-col items-center gap-3 mt-2">
            <Loader2 className="animate-spin text-gray-400 dark:text-[#8696a0]" size={28} />
            <p className="text-sm text-gray-500 dark:text-[#8696a0]">Starting connection…</p>
          </div>
        )}

        {status === "qr" && (
          <>
            {qr ? (
              <>
                <p className="text-xs text-gray-500 dark:text-[#8696a0] mb-3">
                  Open WhatsApp → <strong>Settings → Linked Devices → Link a Device</strong>
                </p>
                <div className="flex justify-center mb-3">
                  <img src={qr} alt="WhatsApp QR Code" className="w-52 h-52 rounded-xl border border-gray-100 dark:border-gray-700" />
                </div>
                <p className="text-xs text-gray-400 dark:text-[#8696a0] mb-3">QR code refreshes automatically</p>
                <button
                  onClick={onRefresh}
                  className="flex items-center gap-1.5 mx-auto text-sm text-gray-400 dark:text-[#8696a0] hover:text-gray-600 dark:hover:text-[#e9edef]"
                >
                  <RefreshCw size={13} /> Refresh
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 mt-2">
                <Loader2 className="animate-spin text-gray-400 dark:text-[#8696a0]" size={28} />
                <p className="text-sm text-gray-500 dark:text-[#8696a0]">Generating QR code…</p>
              </div>
            )}
          </>
        )}

        {status === "pairing" && (
          <>
            {formattedCode ? (
              <>
                <p className="text-xs text-gray-500 dark:text-[#8696a0] mb-4">
                  Open WhatsApp → <strong>Settings → Linked Devices → Link with Phone Number</strong> and enter this code:
                </p>
                <div
                  className="rounded-xl border-2 py-5 px-6 mb-3 mx-auto inline-block"
                  style={{ borderColor: WA_GREEN, backgroundColor: WA_GREEN + "12" }}
                >
                  <span className="text-4xl font-bold tracking-[0.25em] dark:text-[#e9edef]" style={{ color: WA_DARK_HEADER, fontFamily: "monospace" }}>
                    {formattedCode}
                  </span>
                </div>
                <p className="text-xs text-gray-400 dark:text-[#8696a0]">Code expires — enter it quickly in WhatsApp</p>
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 mt-2">
                <Loader2 className="animate-spin text-gray-400 dark:text-[#8696a0]" size={28} />
                <p className="text-sm text-gray-500 dark:text-[#8696a0]">Requesting pairing code…</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function WhatsApp() {
  const [status, setStatus] = useState<WAStatus>("disconnected");
  const [qr, setQr] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingChats, setLoadingChats] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sseRef = useRef<EventSource | null>(null);

  const loadChats = useCallback(async () => {
    setLoadingChats(true);
    try {
      const data = await apiGet<{ chats: Chat[] }>("/whatsapp/chats");
      setChats(data.chats);
    } catch {} finally {
      setLoadingChats(false);
    }
  }, []);

  const loadMessages = useCallback(async (chatId: string) => {
    setLoadingMessages(true);
    try {
      const data = await apiGet<{ messages: Message[] }>(`/whatsapp/chats/${encodeURIComponent(chatId)}/messages`);
      setMessages(data.messages);
    } catch {} finally {
      setLoadingMessages(false);
    }
  }, []);

  const pollStatus = useCallback(async () => {
    try {
      const data = await apiGet<{ status: WAStatus; qr: string | null; pairingCode: string | null }>("/whatsapp/status");
      setStatus(data.status);
      setQr(data.qr);
      setPairingCode(data.pairingCode);
      if (data.status === "connected") loadChats();
    } catch {}
  }, [loadChats]);

  const connect = useCallback(async () => {
    try {
      await apiPost("/whatsapp/connect", {});
      setStatus("connecting");
      setTimeout(pollStatus, 2000);
    } catch {}
  }, [pollStatus]);

  const requestPairing = useCallback(async (phone: string) => {
    await apiPost("/whatsapp/pairing-code", { phone });
    setStatus("pairing");
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiPost("/whatsapp/logout", {});
      setStatus("disconnected");
      setQr(null);
      setPairingCode(null);
      setChats([]);
      setSelectedChat(null);
      setMessages([]);
    } catch {}
  }, []);

  useEffect(() => {
    pollStatus();
    const interval = setInterval(() => {
      if (status !== "connected") pollStatus();
    }, 3000);
    return () => clearInterval(interval);
  }, [pollStatus, status]);

  useEffect(() => {
    if (status !== "connected") return;
    loadChats();
    const interval = setInterval(loadChats, 5000);
    return () => clearInterval(interval);
  }, [status, loadChats]);

  useEffect(() => {
    const es = new EventSource("/api/whatsapp/events", { withCredentials: true });
    sseRef.current = es;
    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        if (event.type === "status") {
          setStatus(event.data.status);
          if (event.data.qr) setQr(event.data.qr);
          if (event.data.pairingCode) setPairingCode(event.data.pairingCode);
          if (event.data.status === "connected") {
            setQr(null);
            setPairingCode(null);
            loadChats();
          }
        } else if (event.type === "pairing_code") {
          setPairingCode(event.data.code);
        } else if (event.type === "qr") {
          pollStatus();
        } else if (event.type === "chats") {
          loadChats();
        } else if (event.type === "message") {
          if (selectedChat && event.data?.chatId === selectedChat.id) {
            loadMessages(selectedChat.id);
          }
          loadChats();
        }
      } catch {}
    };
    return () => es.close();
  }, [loadChats, loadMessages, pollStatus, selectedChat]);

  useEffect(() => {
    if (selectedChat) loadMessages(selectedChat.id);
  }, [selectedChat, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!inputText.trim() || !selectedChat || sending) return;
    const text = inputText.trim();
    setInputText("");
    setSending(true);
    try {
      await apiPost(`/whatsapp/chats/${encodeURIComponent(selectedChat.id)}/messages`, { text });
      await loadMessages(selectedChat.id);
    } catch {} finally {
      setSending(false);
    }
  };

  const filteredChats = chats.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (status !== "connected") {
    return (
      <ConnectPanel
        status={status}
        qr={qr}
        pairingCode={pairingCode}
        onConnect={connect}
        onPairing={requestPairing}
        onRefresh={pollStatus}
      />
    );
  }

  return (
    <div className="flex h-full overflow-hidden bg-gray-100 dark:bg-[#0b141a]">
      {/* Sidebar */}
      <div className={cn(
        "flex flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-[#111b21]",
        selectedChat ? "hidden md:flex md:w-80 lg:w-96" : "flex w-full md:w-80 lg:w-96"
      )}>
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ backgroundColor: WA_DARK_HEADER }}
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white" style={{ backgroundColor: WA_GREEN }}>
              Me
            </div>
            <span className="text-white font-semibold">WhatsApp</span>
          </div>
          <div className="flex items-center gap-3">
            {loadingChats && <Loader2 size={16} className="text-white/70 animate-spin" />}
            <button onClick={logout} className="text-white/70 hover:text-white transition-colors" title="Disconnect">
              <LogOut size={18} />
            </button>
          </div>
        </div>

        {/* Connected badge */}
        <div className="flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 border-b border-green-100 dark:border-green-800/30">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <p className="text-xs text-green-700 dark:text-green-400 font-medium">Connected</p>
        </div>

        {/* Search */}
        <div className="px-3 py-2 bg-white dark:bg-[#111b21] border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-[#2a3942] rounded-full px-3 py-1.5">
            <Search size={14} className="text-gray-400 dark:text-[#8696a0]" />
            <input
              type="text"
              placeholder="Search chats"
              className="flex-1 bg-transparent text-sm outline-none text-gray-700 dark:text-[#e9edef] placeholder-gray-400 dark:placeholder-[#8696a0]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Chat list */}
        <div className="flex-1 overflow-y-auto">
          {filteredChats.length === 0 && !loadingChats && (
            <div className="flex flex-col items-center justify-center h-48 gap-3 px-5 text-center">
              <MessageCircle size={28} className="text-gray-300 dark:text-[#8696a0]" />
              <p className="text-sm font-medium text-gray-500 dark:text-[#e9edef]">No chats yet</p>
              <p className="text-xs text-gray-400 dark:text-[#8696a0] leading-relaxed">
                Chats appear here as messages arrive. Send or receive a message on your phone and it will show up automatically.
              </p>
            </div>
          )}
          {filteredChats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => setSelectedChat(chat)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-700/50 transition-colors text-left",
                selectedChat?.id === chat.id
                  ? "bg-gray-100 dark:bg-[#2a3942]"
                  : "hover:bg-gray-50 dark:hover:bg-[#2a3942]"
              )}
            >
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-semibold text-white shrink-0"
                style={{ backgroundColor: WA_DARK_HEADER }}
              >
                {chat.name.substring(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-0.5">
                  <span className="font-medium text-sm text-gray-900 dark:text-[#e9edef] truncate">{chat.name}</span>
                  <span
                    className="text-xs shrink-0 ml-2"
                    style={{ color: chat.unreadCount > 0 ? WA_GREEN : undefined }}
                    data-dim={chat.unreadCount === 0 ? "true" : undefined}
                  >
                    <span className={chat.unreadCount > 0 ? "" : "text-gray-400 dark:text-[#8696a0]"}>
                      {formatTime(chat.timestamp)}
                    </span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-[#8696a0] truncate">{chat.lastMessage ?? ""}</span>
                  {chat.unreadCount > 0 && (
                    <span
                      className="ml-2 text-xs text-white font-medium rounded-full px-1.5 py-0.5 min-w-[20px] text-center shrink-0"
                      style={{ backgroundColor: WA_GREEN }}
                    >
                      {chat.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Conversation pane */}
      {selectedChat ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Conversation header */}
          <div className="flex items-center gap-3 px-4 py-2.5" style={{ backgroundColor: WA_DARK_HEADER }}>
            <button className="md:hidden text-white mr-1" onClick={() => setSelectedChat(null)}>
              <ChevronLeft size={22} />
            </button>
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0"
              style={{ backgroundColor: WA_GREEN }}
            >
              {selectedChat.name.substring(0, 2).toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="text-white font-semibold text-sm">{selectedChat.name}</p>
            </div>
            <div className="flex items-center gap-4">
              <button className="text-white/80 hover:text-white"><Video size={19} /></button>
              <button className="text-white/80 hover:text-white"><Phone size={19} /></button>
              <button className="text-white/80 hover:text-white"><MoreVertical size={19} /></button>
            </div>
          </div>

          {/* Messages */}
          <div
            className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-1 bg-[#e5ddd5] dark:bg-[#0b141a]"
          >
            {loadingMessages && (
              <div className="flex justify-center py-8">
                <Loader2 className="animate-spin text-gray-400 dark:text-[#8696a0]" size={22} />
              </div>
            )}
            {!loadingMessages && messages.length === 0 && (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-sm text-gray-500 dark:text-[#8696a0]">No messages yet</p>
              </div>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className={cn("flex", msg.fromMe ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[65%] rounded-lg px-3 py-2 shadow-sm",
                    msg.fromMe ? "rounded-tr-sm" : "rounded-tl-sm"
                  )}
                  style={{
                    backgroundColor: msg.fromMe
                      ? "var(--wa-bubble-me, #dcf8c6)"
                      : "var(--wa-bubble-them, #ffffff)",
                  }}
                >
                  <style>{`
                    .dark { --wa-bubble-me: #005c4b; --wa-bubble-them: #202c33; }
                  `}</style>
                  <MessageContent msg={msg} chatId={selectedChat.id} />
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <span className="text-[11px] text-gray-400 dark:text-[#8696a0]">
                      {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                    </span>
                    {msg.fromMe && (
                      <svg width="14" height="9" viewBox="0 0 16 11" fill="none">
                        <path d="M1 5.5L5.5 10L15 1" stroke={msg.status === 4 ? "#34B7F1" : "#aaa"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        {(msg.status ?? 0) >= 3 && <path d="M5 5.5L9.5 10L19 1" stroke={msg.status === 4 ? "#34B7F1" : "#aaa"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />}
                      </svg>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="flex items-end gap-2 px-4 py-2 bg-gray-100 dark:bg-[#202c33] border-t border-gray-200 dark:border-gray-700">
            <button className="text-gray-500 dark:text-[#8696a0] hover:text-gray-700 dark:hover:text-[#e9edef] mb-2"><Smile size={22} /></button>
            <button className="text-gray-500 dark:text-[#8696a0] hover:text-gray-700 dark:hover:text-[#e9edef] mb-2"><Paperclip size={22} /></button>
            <div className="flex-1 bg-white dark:bg-[#2a3942] rounded-full px-4 py-2.5 flex items-center">
              <input
                type="text"
                placeholder="Type a message"
                className="flex-1 text-sm outline-none text-gray-800 dark:text-[#e9edef] placeholder-gray-400 dark:placeholder-[#8696a0] bg-transparent"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              />
            </div>
            <button
              onClick={sendMessage}
              disabled={!inputText.trim() || sending}
              className="w-10 h-10 rounded-full flex items-center justify-center text-white transition-colors disabled:opacity-50"
              style={{ backgroundColor: inputText.trim() ? WA_GREEN : WA_DARK_HEADER }}
            >
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={17} />}
            </button>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 flex-col items-center justify-center gap-4 bg-[#f0f2f5] dark:bg-[#0b141a]">
          <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: WA_GREEN + "20" }}>
            <MessageCircle size={36} style={{ color: WA_GREEN }} />
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-light text-gray-700 dark:text-[#e9edef] mb-2">WhatsApp</h2>
            <p className="text-sm text-gray-500 dark:text-[#8696a0] max-w-xs">Select a conversation from the left to start messaging.</p>
          </div>
        </div>
      )}
    </div>
  );
}
