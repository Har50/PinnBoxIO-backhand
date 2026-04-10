import { useState, useEffect, useRef, useCallback } from "react";
import {
  MessageCircle, Phone, Video, MoreVertical, Search,
  Send, Smile, Paperclip, ChevronLeft, Wifi, RefreshCw, LogOut, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

const WA_GREEN = "#25D366";
const WA_DARK = "#128C7E";

type WAStatus = "disconnected" | "connecting" | "qr" | "connected";

type Chat = {
  id: string;
  name: string;
  unreadCount: number;
  timestamp: number | null;
  lastMessage: string | null;
  isGroup: boolean;
};

type Message = {
  id: string;
  fromMe: boolean;
  text: string;
  timestamp: number | null;
  status: number | null;
};

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`/api${path}`, { credentials: "include" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function formatTime(ts: number | null): string {
  if (!ts) return "";
  const date = new Date(ts);
  const diff = Date.now() - ts;
  if (diff < 24 * 60 * 60 * 1000) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diff < 7 * 24 * 60 * 60 * 1000) return date.toLocaleDateString([], { weekday: "short" });
  return date.toLocaleDateString([], { day: "2-digit", month: "2-digit" });
}

export default function WhatsApp() {
  const [status, setStatus] = useState<WAStatus>("disconnected");
  const [qr, setQr] = useState<string | null>(null);
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
      const data = await apiGet<{ status: WAStatus; qr: string | null }>("/whatsapp/status");
      setStatus(data.status);
      setQr(data.qr);
      if (data.status === "connected") {
        loadChats();
      }
    } catch {}
  }, [loadChats]);

  const connect = useCallback(async () => {
    try {
      await apiPost("/whatsapp/connect", {});
      setStatus("connecting");
      setTimeout(pollStatus, 2000);
    } catch {}
  }, [pollStatus]);

  const logout = useCallback(async () => {
    try {
      await apiPost("/whatsapp/logout", {});
      setStatus("disconnected");
      setQr(null);
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
    const es = new EventSource("/api/whatsapp/events", { withCredentials: true });
    sseRef.current = es;
    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        if (event.type === "status") {
          setStatus(event.data.status);
          if (event.data.qr) setQr(event.data.qr);
          if (event.data.status === "connected") {
            setQr(null);
            loadChats();
          }
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
      <div className="flex h-full items-center justify-center" style={{ backgroundColor: "#f0f2f5" }}>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-sm w-full mx-4 text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: WA_GREEN + "20" }}
          >
            <MessageCircle size={30} style={{ color: WA_GREEN }} />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Connect WhatsApp</h2>

          {status === "disconnected" && (
            <>
              <p className="text-sm text-gray-500 mb-6">
                Scan your WhatsApp QR code to sync your real messages.
              </p>
              <button
                onClick={connect}
                className="w-full py-2.5 rounded-lg text-white font-medium text-sm transition-opacity hover:opacity-90"
                style={{ backgroundColor: WA_GREEN }}
              >
                Connect WhatsApp
              </button>
            </>
          )}

          {status === "connecting" && (
            <>
              <p className="text-sm text-gray-500 mb-6">Starting connection...</p>
              <div className="flex justify-center">
                <Loader2 className="animate-spin text-gray-400" size={28} />
              </div>
            </>
          )}

          {status === "qr" && qr && (
            <>
              <p className="text-sm text-gray-500 mb-4">
                Open WhatsApp on your phone, go to <strong>Settings → Linked Devices → Link a Device</strong>, and scan this code.
              </p>
              <div className="flex justify-center mb-4">
                <img src={qr} alt="WhatsApp QR Code" className="w-56 h-56 rounded-lg" />
              </div>
              <p className="text-xs text-gray-400 mb-3">QR code refreshes automatically</p>
              <button
                onClick={pollStatus}
                className="flex items-center gap-2 mx-auto text-sm text-gray-500 hover:text-gray-700"
              >
                <RefreshCw size={14} /> Refresh
              </button>
            </>
          )}

          {status === "qr" && !qr && (
            <div className="flex justify-center mt-4">
              <Loader2 className="animate-spin text-gray-400" size={28} />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden" style={{ background: "#f0f2f5" }}>
      {/* Sidebar */}
      <div
        className={cn(
          "flex flex-col border-r border-gray-200 bg-white",
          selectedChat ? "hidden md:flex md:w-80 lg:w-96" : "flex w-full md:w-80 lg:w-96"
        )}
      >
        <div className="flex items-center justify-between px-4 py-3" style={{ backgroundColor: WA_DARK }}>
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white"
              style={{ backgroundColor: WA_GREEN }}
            >
              Me
            </div>
            <span className="text-white font-semibold">WhatsApp</span>
          </div>
          <div className="flex items-center gap-3">
            {loadingChats && <Loader2 size={16} className="text-white/70 animate-spin" />}
            <button
              onClick={logout}
              className="text-white/70 hover:text-white transition-colors"
              title="Disconnect"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border-b border-green-100">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <p className="text-xs text-green-700 font-medium">Connected</p>
        </div>

        <div className="px-3 py-2 bg-white border-b border-gray-100">
          <div className="flex items-center gap-2 bg-gray-100 rounded-full px-3 py-1.5">
            <Search size={14} className="text-gray-400" />
            <input
              type="text"
              placeholder="Search chats"
              className="flex-1 bg-transparent text-sm outline-none text-gray-700 placeholder-gray-400"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredChats.length === 0 && !loadingChats && (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400 gap-2">
              <MessageCircle size={24} />
              <p className="text-sm">No chats yet</p>
            </div>
          )}
          {filteredChats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => setSelectedChat(chat)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 border-b border-gray-100 transition-colors text-left",
                selectedChat?.id === chat.id && "bg-gray-100"
              )}
            >
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-semibold text-white shrink-0"
                style={{ backgroundColor: WA_DARK }}
              >
                {chat.name.substring(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-0.5">
                  <span className="font-medium text-sm text-gray-900 truncate">{chat.name}</span>
                  <span className="text-xs shrink-0 ml-2" style={{ color: chat.unreadCount > 0 ? WA_GREEN : "#aaa" }}>
                    {formatTime(chat.timestamp)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 truncate">{chat.lastMessage ?? ""}</span>
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
          <div className="flex items-center gap-3 px-4 py-2.5" style={{ backgroundColor: WA_DARK }}>
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

          <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-1" style={{ backgroundColor: "#e5ddd5" }}>
            {loadingMessages && (
              <div className="flex justify-center py-8"><Loader2 className="animate-spin text-gray-400" size={22} /></div>
            )}
            {!loadingMessages && messages.length === 0 && (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-sm text-gray-500">No messages yet</p>
              </div>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className={cn("flex", msg.fromMe ? "justify-end" : "justify-start")}>
                <div
                  className={cn("max-w-[65%] rounded-lg px-3 py-2 shadow-sm", msg.fromMe ? "rounded-tr-sm" : "rounded-tl-sm bg-white")}
                  style={msg.fromMe ? { backgroundColor: "#dcf8c6" } : {}}
                >
                  <p className="text-sm text-gray-800 leading-relaxed">{msg.text || <span className="italic text-gray-400">[media]</span>}</p>
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <span className="text-[11px] text-gray-400">
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

          <div className="flex items-end gap-2 px-4 py-2 bg-gray-100 border-t border-gray-200">
            <button className="text-gray-500 hover:text-gray-700 mb-2"><Smile size={22} /></button>
            <button className="text-gray-500 hover:text-gray-700 mb-2"><Paperclip size={22} /></button>
            <div className="flex-1 bg-white rounded-full px-4 py-2.5 flex items-center">
              <input
                type="text"
                placeholder="Type a message"
                className="flex-1 text-sm outline-none text-gray-800 placeholder-gray-400 bg-transparent"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              />
            </div>
            <button
              onClick={sendMessage}
              disabled={!inputText.trim() || sending}
              className="w-10 h-10 rounded-full flex items-center justify-center text-white transition-colors disabled:opacity-50"
              style={{ backgroundColor: inputText.trim() ? WA_GREEN : WA_DARK }}
            >
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={17} />}
            </button>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 flex-col items-center justify-center gap-4" style={{ backgroundColor: "#f0f2f5" }}>
          <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: WA_GREEN + "20" }}>
            <MessageCircle size={36} style={{ color: WA_GREEN }} />
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-light text-gray-700 mb-2">WhatsApp</h2>
            <p className="text-sm text-gray-500 max-w-xs">Select a conversation from the left to start messaging.</p>
          </div>
        </div>
      )}
    </div>
  );
}
