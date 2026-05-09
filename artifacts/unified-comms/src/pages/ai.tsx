import { useState, useRef, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageSquare, Sparkles, Send, Plus, Trash2, Loader2, Crown,
  Camera, ImageIcon, FileText, X, Mail, CheckCircle, AlertCircle,
  Mic, MicOff, Settings, Search, Command,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getAuthHeaders } from "@/lib/api-client";

type Provider = "openai" | "claude" | "gemini";

const PROVIDERS: { id: Provider; label: string }[] = [
  { id: "openai", label: "GPT-4o" },
  { id: "claude", label: "Claude" },
  { id: "gemini", label: "Gemini" },
];

interface Attachment {
  name: string;
  mimeType: string;
  data: string;
  preview?: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
  limitReached?: boolean;
  attachments?: { name: string; mimeType: string; preview?: string }[];
}

interface Conversation {
  id: number;
  title: string;
  createdAt: string;
}

async function apiFetch(path: string, options?: RequestInit) {
  const authHeaders = await getAuthHeaders();
  return fetch(`/api${path}`, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
      ...(options?.headers || {}),
    },
  });
}

interface EmailDraft { to: string; subject: string; body: string }

function parseEmailDraft(text: string): { draft: EmailDraft | null; clean: string } {
  const match = text.match(/<email-draft>([\s\S]*?)<\/email-draft>/);
  if (!match) return { draft: null, clean: text };
  try {
    const draft = JSON.parse(match[1]) as EmailDraft;
    const clean = text.replace(match[0], "").trim();
    return { draft, clean };
  } catch {
    return { draft: null, clean: text };
  }
}

function EmailDraftCard({ draft }: { draft: EmailDraft }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<"gmail" | "outlook">("gmail");

  const handleSend = async () => {
    setSending(true);
    setError(null);
    try {
      const authHeaders = await getAuthHeaders();
      const res = await fetch("/api/messages/send", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ to: draft.to, subject: draft.subject, body: draft.body, provider }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as any).error ?? "Failed to send");
      } else {
        setSent(true);
      }
    } catch {
      setError("Network error");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mt-3 rounded-xl overflow-hidden border" style={{ borderColor: "rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)" }}>
      <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}>
        <Mail className="w-3.5 h-3.5" style={{ color: "#a5b4fc" }} />
        <span className="text-xs font-semibold text-white/80">Email Draft</span>
      </div>
      <div className="p-3 space-y-1.5 text-xs text-white/70">
        <div><span className="text-white/40">To: </span><span className="font-medium text-white/80">{draft.to}</span></div>
        <div><span className="text-white/40">Subject: </span><span className="font-medium text-white/80">{draft.subject}</span></div>
        <div className="border-t pt-1.5 mt-1.5 whitespace-pre-wrap" style={{ borderColor: "rgba(255,255,255,0.08)" }}>{draft.body}</div>
      </div>
      {sent ? (
        <div className="flex items-center gap-1.5 px-3 py-2 text-xs border-t" style={{ borderColor: "rgba(255,255,255,0.08)", color: "#86efac" }}>
          <CheckCircle className="w-3.5 h-3.5" /> Sent successfully
        </div>
      ) : (
        <div className="flex items-center gap-2 px-3 py-2 border-t flex-wrap" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <div className="flex rounded-lg overflow-hidden text-xs border" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
            {(["gmail", "outlook"] as const).map((p) => (
              <button key={p} onClick={() => setProvider(p)}
                className="px-2.5 py-1 font-medium transition-colors"
                style={provider === p ? { background: "rgba(99,102,241,0.3)", color: "#c7d2fe" } : { color: "rgba(255,255,255,0.45)" }}>
                {p === "gmail" ? "Gmail" : "Outlook"}
              </button>
            ))}
          </div>
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)", color: "white", boxShadow: "0 0 12px rgba(99,102,241,0.35)" }}
            onClick={handleSend}
            disabled={sending}
          >
            {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
            {sending ? "Sending…" : "Send Now"}
          </button>
          {error && (
            <div className="flex items-center gap-1 text-xs" style={{ color: "#f87171" }}>
              <AlertCircle className="w-3 h-3" /> {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AiPage() {
  return <AiChat />;
}

function AiChat() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [provider, setProvider] = useState<Provider>("openai");
  const [showMobileChats, setShowMobileChats] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const speechRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setVoiceSupported(!!SR);
  }, []);

  const toggleVoice = useCallback(async () => {
    if (isListening) {
      try { speechRef.current?.stop(); } catch {}
      setIsListening(false);
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Voice input isn't supported in this browser. Try Chrome, Edge, or Safari."); return; }
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
      }
    } catch (err: any) {
      const name = err?.name || "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        alert("Microphone is blocked.\n\nIf you're in the Replit preview pane: open the app in a new tab, then allow microphone in the address bar.");
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        alert("No microphone detected on this device.");
      } else {
        alert("Couldn't access the microphone: " + (err?.message || name || "unknown error"));
      }
      return;
    }
    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    let finalTranscript = "";
    recognition.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalTranscript += t;
        else interim = t;
      }
      setInput((prev) => {
        const base = prev.replace(/\u{200B}.*/u, "").trimEnd();
        return base + (base ? " " : "") + (finalTranscript || interim);
      });
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (e: any) => {
      setIsListening(false);
      if (e.error === "not-allowed" || e.error === "service-not-allowed") alert("Microphone permission was blocked.");
      else if (e.error === "network") alert("Voice input needs an internet connection.");
      else if (e.error !== "aborted" && e.error !== "no-speech") alert("Voice input error: " + e.error);
    };
    speechRef.current = recognition;
    setInput("");
    finalTranscript = "";
    try { recognition.start(); setIsListening(true); } catch (err: any) { setIsListening(false); alert("Couldn't start voice input: " + (err?.message || err)); }
  }, [isListening]);

  const fetchConversations = useCallback(async () => {
    const res = await apiFetch("/ai/conversations");
    if (res.ok) setConversations(await res.json());
  }, []);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  const newConversation = async () => {
    if (activeConvId && messages.length === 0) { setShowMobileChats(false); textareaRef.current?.focus(); return; }
    const res = await apiFetch("/ai/conversations", { method: "POST", body: JSON.stringify({ title: "New conversation" }) });
    if (res.ok) {
      const conv = await res.json();
      setConversations((prev) => [conv, ...prev]);
      setActiveConvId(conv.id);
      setMessages([]);
      setShowMobileChats(false);
    }
  };

  const loadConversation = async (id: number) => {
    setActiveConvId(id);
    setShowMobileChats(false);
    const res = await apiFetch(`/ai/conversations/${id}`);
    if (res.ok) { const data = await res.json(); setMessages(data.messages || []); }
  };

  const deleteConversation = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    await apiFetch(`/ai/conversations/${id}`, { method: "DELETE" });
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeConvId === id) { setActiveConvId(null); setMessages([]); }
  };

  const addAttachments = useCallback(async (files: FileList | null) => {
    if (!files) return;
    const MAX_BYTES = 20 * 1024 * 1024;
    const newAttachments: Attachment[] = [];
    for (const file of Array.from(files)) {
      if (file.size > MAX_BYTES) { alert(`"${file.name}" is too large. Please attach files under 20 MB.`); continue; }
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve((e.target?.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      newAttachments.push({ name: file.name, mimeType: file.type || "application/octet-stream", data, preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined });
    }
    if (newAttachments.length > 0) setAttachments((prev) => [...prev, ...newAttachments]);
    setShowAttachMenu(false);
  }, []);

  const removeAttachment = useCallback((index: number) => {
    setAttachments((prev) => {
      const updated = [...prev];
      if (updated[index].preview) URL.revokeObjectURL(updated[index].preview!);
      updated.splice(index, 1);
      return updated;
    });
  }, []);

  const sendMessage = async () => {
    if ((!input.trim() && attachments.length === 0) || streaming) return;
    let convId = activeConvId;
    if (!convId) {
      const res = await apiFetch("/ai/conversations", { method: "POST", body: JSON.stringify({ title: input.slice(0, 60) || attachments[0]?.name || "Attachment" }) });
      if (!res.ok) return;
      const conv = await res.json();
      convId = conv.id;
      setActiveConvId(conv.id);
      setConversations((prev) => [conv, ...prev]);
    }
    const userMsg = input.trim();
    const sentAttachments = attachments;
    setInput("");
    setAttachments([]);
    setMessages((prev) => [...prev, { role: "user", content: userMsg, attachments: sentAttachments.map((a) => ({ name: a.name, mimeType: a.mimeType, preview: a.preview })) }]);
    setMessages((prev) => [...prev, { role: "assistant", content: "", streaming: true }]);
    setStreaming(true);
    let assistantContent = "";
    try {
      const res = await apiFetch(`/ai/conversations/${convId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content: userMsg || "(see attached file)", provider, attachments: sentAttachments.map(({ name, mimeType, data }) => ({ name, mimeType, data })) }),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => null);
        const limitError = new Error(error?.error || "Sorry, something went wrong. Please try again.");
        if (error?.code === "AI_DAILY_LIMIT_REACHED") (limitError as Error & { code?: string }).code = error.code;
        throw limitError;
      }
      if (!res.body) throw new Error("No response body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value).split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                assistantContent += data.content;
                setMessages((prev) => { const u = [...prev]; u[u.length - 1] = { role: "assistant", content: assistantContent, streaming: true }; return u; });
              }
            } catch {}
          }
        }
      }
    } catch (err) {
      const isLimitReached = (err as Error & { code?: string })?.code === "AI_DAILY_LIMIT_REACHED";
      setMessages((prev) => { const u = [...prev]; u[u.length - 1] = { role: "assistant", content: err instanceof Error ? err.message : "Sorry, something went wrong.", streaming: false, limitReached: isLimitReached }; return u; });
    } finally {
      setMessages((prev) => { const u = [...prev]; if (u.length > 0) u[u.length - 1] = { ...u[u.length - 1], streaming: false }; return u; });
      setStreaming(false);
      setTimeout(() => fetchConversations(), 1200);
    }
  };

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const formatTitle = (conv: Conversation) => {
    const t = conv.title?.trim();
    if (t && !/^new (chat|conversation)$/i.test(t) && !/^chat (jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(t)) return t;
    return "New chat";
  };

  const getGroupLabel = (conv: Conversation) => {
    const date = new Date(conv.createdAt);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    const convDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diff = Math.floor((today.getTime() - convDay.getTime()) / 86400000);
    if (convDay.getTime() === today.getTime()) return "Today";
    if (convDay.getTime() === yesterday.getTime()) return "Yesterday";
    if (diff <= 7) return "Previous 7 Days";
    if (diff <= 30) return "This Month";
    return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  };

  const grouped = conversations
    .filter((c) => !historySearch || formatTitle(c).toLowerCase().includes(historySearch.toLowerCase()))
    .reduce<{ label: string; items: Conversation[] }[]>((acc, conv) => {
      const label = getGroupLabel(conv);
      const existing = acc.find((g) => g.label === label);
      if (existing) existing.items.push(conv);
      else acc.push({ label, items: [conv] });
      return acc;
    }, []);

  const suggestedPrompts = [
    "Summarize my unread emails",
    "Who messaged me recently?",
    "Draft a reply to my latest email",
    "Find time for a sync next week",
  ];

  return (
    <div className="flex h-full min-w-0 overflow-hidden relative" style={{ background: "#0d1117", color: "white" }}>
      {/* Decorative orbs */}
      <div className="absolute top-[-8%] left-[-5%] w-[35%] h-[40%] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)", filter: "blur(60px)", zIndex: 0 }} />
      <div className="absolute bottom-[-10%] right-[-5%] w-[30%] h-[45%] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)", filter: "blur(80px)", zIndex: 0 }} />

      {/* Sidebar */}
      <div
        className={cn(
          "flex-col w-64 shrink-0 relative z-10 border-r",
          showMobileChats ? "flex w-full md:w-64" : "hidden md:flex",
        )}
        style={{ background: "rgba(22,27,34,0.85)", borderColor: "#2d3139", backdropFilter: "blur(16px)" }}
      >
        {/* New conversation */}
        <div className="p-4 pt-5">
          <button
            onClick={newConversation}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-sm font-medium transition-colors border"
            style={{ background: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.85)" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.10)")}
            onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
          >
            <Plus className="h-4 w-4" style={{ color: "#a5b4fc" }} />
            New conversation
            <span className="ml-auto flex items-center gap-0.5 opacity-40 text-[10px]"><Command className="h-3 w-3" />N</span>
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: "rgba(255,255,255,0.3)" }} />
            <input
              type="text"
              value={historySearch}
              onChange={e => setHistorySearch(e.target.value)}
              placeholder="Search history..."
              className="w-full rounded-lg py-1.5 pl-8 pr-3 text-sm focus:outline-none transition-all border"
              style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.8)" }}
            />
          </div>
        </div>

        {/* Conversation list */}
        <ScrollArea className="flex-1 px-3 pb-2">
          <div className="space-y-0.5">
            {grouped.length === 0 && (
              <p className="px-2 py-8 text-xs text-center" style={{ color: "rgba(255,255,255,0.3)" }}>
                Start a new conversation to get help with your communications.
              </p>
            )}
            {grouped.map((group) => (
              <div key={group.label}>
                <p className="px-2 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.28)" }}>{group.label}</p>
                {group.items.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => loadConversation(conv.id)}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm transition-all group relative"
                    style={{
                      background: activeConvId === conv.id ? "rgba(99,102,241,0.15)" : "transparent",
                      borderLeft: activeConvId === conv.id ? "2px solid rgba(99,102,241,0.6)" : "2px solid transparent",
                      color: activeConvId === conv.id ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.55)",
                    }}
                  >
                    <MessageSquare className="h-3.5 w-3.5 shrink-0" style={{ color: activeConvId === conv.id ? "#818cf8" : "rgba(255,255,255,0.3)" }} />
                    <span className="truncate flex-1">{formatTitle(conv)}</span>
                    <button
                      onClick={(e) => deleteConversation(conv.id, e)}
                      className="shrink-0 opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
                      style={{ color: "#f87171" }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t" style={{ borderColor: "#2d3139" }}>
          <button
            className="flex items-center gap-3 w-full p-2 rounded-lg transition-colors"
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <div className="w-8 h-8 rounded-full p-[1.5px] shrink-0" style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
              <div className="w-full h-full rounded-full flex items-center justify-center text-xs font-semibold" style={{ background: "#161b22", color: "white" }}>AI</div>
            </div>
            <div className="flex-1 text-left">
              <div className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.9)" }}>Pinnbox AI</div>
              <div className="flex items-center gap-1 text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Connected
              </div>
            </div>
            <Settings className="h-4 w-4" style={{ color: "rgba(255,255,255,0.3)" }} />
          </button>
        </div>
      </div>

      {/* Main */}
      <div className={cn("flex-1 flex-col min-w-0 relative z-10", showMobileChats ? "hidden md:flex" : "flex")}>
        {/* Header */}
        <header
          className="h-14 flex items-center justify-between px-4 sm:px-6 border-b shrink-0"
          style={{ borderColor: "#2d3139", background: "rgba(13,17,23,0.85)", backdropFilter: "blur(12px)" }}
        >
          <div className="flex items-center gap-2.5">
            {/* Mobile: show chats button */}
            <button
              className="md:hidden flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs border transition-colors mr-1"
              style={{ background: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}
              onClick={() => setShowMobileChats(true)}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Chats
            </button>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", boxShadow: "0 0 16px rgba(99,102,241,0.4)" }}
            >
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-semibold text-white">Pinnbox Assistant</h1>
                <Badge className="text-[10px] font-bold px-1.5 py-0.5 rounded border hidden sm:inline-flex" style={{ background: "rgba(99,102,241,0.15)", borderColor: "rgba(99,102,241,0.35)", color: "#a5b4fc" }}>PRO</Badge>
              </div>
            </div>
          </div>

          {/* Model switcher */}
          <div
            className="flex items-center p-1 rounded-full border"
            style={{ background: "rgba(22,27,34,0.9)", borderColor: "#2d3139" }}
          >
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                onClick={() => setProvider(p.id)}
                className="rounded-full px-3 sm:px-4 py-1 text-xs font-medium transition-all"
                style={provider === p.id ? {
                  background: "rgba(99,102,241,0.22)",
                  color: "#c7d2fe",
                  border: "1px solid rgba(99,102,241,0.35)",
                  boxShadow: "0 0 12px rgba(99,102,241,0.2)",
                } : {
                  background: "transparent",
                  color: "rgba(255,255,255,0.4)",
                  border: "1px solid transparent",
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </header>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6 pb-44 space-y-6" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.08) transparent" }}>
          {messages.length === 0 && (
            <div className="flex flex-col items-center text-center mt-8 mb-6">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3 border"
                style={{ background: "rgba(99,102,241,0.12)", borderColor: "rgba(99,102,241,0.25)", boxShadow: "0 0 30px rgba(99,102,241,0.1)" }}
              >
                <Sparkles className="h-7 w-7" style={{ color: "#a5b4fc" }} />
              </div>
              <h2 className="text-lg font-light tracking-tight mb-1" style={{ color: "rgba(255,255,255,0.9)" }}>
                Hello, I'm your AI assistant
              </h2>
              <p className="text-sm max-w-sm mb-6" style={{ color: "rgba(255,255,255,0.4)" }}>
                I've synced with your inbox and calendar. What would you like to work on today?
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full">
                {suggestedPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => { setInput(prompt); textareaRef.current?.focus(); }}
                    className="text-left p-3 rounded-xl border text-sm transition-all"
                    style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.65)" }}
                    onMouseEnter={e => { (e.currentTarget.style.background = "rgba(255,255,255,0.08)"); (e.currentTarget.style.color = "white"); }}
                    onMouseLeave={e => { (e.currentTarget.style.background = "rgba(255,255,255,0.04)"); (e.currentTarget.style.color = "rgba(255,255,255,0.65)"); }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start gap-3")}>
              {msg.role === "assistant" && (
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 border"
                  style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", borderColor: "rgba(255,255,255,0.15)", boxShadow: "0 0 10px rgba(99,102,241,0.3)" }}
                >
                  <Sparkles className="h-3.5 w-3.5 text-white" />
                </div>
              )}
              <div
                className={cn("max-w-[88%] sm:max-w-[75%] rounded-2xl px-4 sm:px-5 py-3.5 text-sm leading-relaxed relative", msg.role === "user" ? "rounded-br-sm" : "rounded-tl-sm")}
                style={msg.role === "user" ? {
                  background: "linear-gradient(135deg, #3b4fd1, #6366f1)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "white",
                } : {
                  background: "rgba(255,255,255,0.04)",
                  backdropFilter: "blur(20px)",
                  borderColor: "rgba(255,255,255,0.12)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.88)",
                }}
              >
                {msg.role === "assistant" && (
                  <div className="absolute inset-0 rounded-2xl rounded-tl-sm pointer-events-none" style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, transparent 60%)" }} />
                )}
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {msg.attachments.map((a, ai) => (
                      a.preview ? (
                        <img key={ai} src={a.preview} alt={a.name} className="max-h-40 max-w-full rounded-lg object-cover" />
                      ) : (
                        <div key={ai} className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs" style={{ background: "rgba(255,255,255,0.1)" }}>
                          <FileText className="w-3 h-3 shrink-0" />
                          <span className="truncate max-w-[150px]">{a.name}</span>
                        </div>
                      )
                    ))}
                  </div>
                )}
                <div className="relative z-10">
                  {(() => {
                    const { draft, clean } = parseEmailDraft(msg.content);
                    return (
                      <>
                        <div className="whitespace-pre-wrap">{clean || (msg.streaming ? <span className="inline-block w-2 h-4 bg-current animate-pulse rounded-sm" /> : "")}</div>
                        {draft && !msg.streaming && <EmailDraftCard draft={draft} />}
                      </>
                    );
                  })()}
                  {msg.limitReached && (
                    <button
                      className="mt-3 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                      style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)", color: "white", boxShadow: "0 0 16px rgba(99,102,241,0.4)" }}
                      onClick={() => window.location.assign(`${import.meta.env.BASE_URL}storage`)}
                    >
                      <Crown className="w-4 h-4" />
                      Upgrade to Pro
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Input area — floating with gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 pt-12 pointer-events-none" style={{ background: "linear-gradient(to top, #0d1117 55%, transparent)", zIndex: 20 }}>
          <div className="max-w-3xl mx-auto pointer-events-auto">
            {/* Hidden file inputs */}
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => addAttachments(e.target.files)} />
            <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => addAttachments(e.target.files)} />
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => addAttachments(e.target.files)} />

            {/* Attach menu popover */}
            {showAttachMenu && (
              <div className="mb-3 rounded-2xl border overflow-hidden shadow-2xl" style={{ background: "rgba(22,27,34,0.95)", borderColor: "rgba(255,255,255,0.12)", backdropFilter: "blur(20px)" }}>
                <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                  <span className="font-semibold text-sm text-white/80">Add to Chat</span>
                  <button onClick={() => setShowAttachMenu(false)} style={{ color: "rgba(255,255,255,0.4)" }} className="hover:text-white transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-3 p-4">
                  {[
                    { icon: Camera, label: "Camera", ref: cameraInputRef },
                    { icon: ImageIcon, label: "Photos", ref: photoInputRef },
                    { icon: FileText, label: "Files", ref: fileInputRef },
                  ].map(({ icon: Icon, label, ref }) => (
                    <button key={label} onClick={() => ref.current?.click()}
                      className="flex flex-col items-center gap-2 p-3 rounded-xl text-sm font-medium transition-colors"
                      style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.7)" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.10)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                    >
                      <Icon className="w-5 h-5" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Attachment chips */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {attachments.map((a, i) => (
                  <div key={i} className="relative group">
                    {a.preview ? (
                      <div className="relative">
                        <img src={a.preview} alt={a.name} className="h-14 w-14 rounded-lg object-cover border" style={{ borderColor: "rgba(255,255,255,0.15)" }} />
                        <button onClick={() => removeAttachment(i)}
                          className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ background: "#ef4444", color: "white" }}>
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border" style={{ background: "rgba(255,255,255,0.07)", borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}>
                        <FileText className="w-3 h-3 shrink-0" style={{ color: "#a5b4fc" }} />
                        <span className="truncate max-w-[120px]">{a.name}</span>
                        <button onClick={() => removeAttachment(i)} className="ml-1 hover:text-red-400 transition-colors"><X className="w-3 h-3" /></button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Input box */}
            <div
              className="rounded-[22px] p-2 border flex flex-col transition-all"
              style={{ background: "rgba(255,255,255,0.07)", backdropFilter: "blur(24px)", borderColor: "rgba(255,255,255,0.14)", boxShadow: "0 10px 40px rgba(0,0,0,0.35), inset 0 1px 1px rgba(255,255,255,0.09)" }}
            >
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isListening ? "🎙️ Listening… speak now" : "Ask about your emails, schedule, or contacts..."}
                className="w-full bg-transparent resize-none text-sm px-3 pt-2 pb-1 focus:outline-none min-h-[44px] max-h-32"
                style={{ color: isListening ? "#fbbf24" : "rgba(255,255,255,0.9)", caretColor: "#a5b4fc" }}
                rows={1}
              />
              <div className="flex items-center justify-between px-2 pb-1">
                <div className="flex items-center gap-1">
                  <button
                    className="p-2 rounded-full transition-colors"
                    style={{ color: "rgba(255,255,255,0.45)" }}
                    onClick={() => setShowAttachMenu((v) => !v)}
                    onMouseEnter={e => { (e.currentTarget.style.background = "rgba(255,255,255,0.08)"); (e.currentTarget.style.color = "white"); }}
                    onMouseLeave={e => { (e.currentTarget.style.background = "transparent"); (e.currentTarget.style.color = "rgba(255,255,255,0.45)"); }}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                  {voiceSupported && (
                    <button
                      className="p-2 rounded-full transition-all"
                      style={isListening ? { background: "rgba(239,68,68,0.2)", color: "#f87171" } : { color: "rgba(255,255,255,0.45)" }}
                      onClick={toggleVoice}
                      onMouseEnter={e => { if (!isListening) { (e.currentTarget.style.background = "rgba(255,255,255,0.08)"); (e.currentTarget.style.color = "white"); } }}
                      onMouseLeave={e => { if (!isListening) { (e.currentTarget.style.background = "transparent"); (e.currentTarget.style.color = "rgba(255,255,255,0.45)"); } }}
                    >
                      {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </button>
                  )}
                </div>
                <button
                  disabled={(!input.trim() && attachments.length === 0) || streaming}
                  onClick={sendMessage}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white transition-all disabled:opacity-40"
                  style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)", boxShadow: "0 0 16px rgba(99,102,241,0.45)" }}
                >
                  {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 ml-0.5" />}
                </button>
              </div>
            </div>
            <p className="text-center mt-2 text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>
              Press Enter to send · Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
