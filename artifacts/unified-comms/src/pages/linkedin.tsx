import { useState, useEffect, useRef, useCallback } from "react";
import {
  Linkedin, CheckCircle2, XCircle, Shield, ShieldCheck,
  Send, ChevronLeft, Loader2, LogOut, RefreshCw, Star, AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { useLocation } from "wouter";
import { apiFetch } from "@/lib/api-client";

const LI_BLUE = "#0A66C2";

type LIStatus = "disconnected" | "connected" | "error";

interface LIProfile {
  id: string;
  firstName: string;
  lastName: string;
  headline: string;
  profilePicture: string | null;
  email: string | null;
  vanityName: string | null;
  isVerified: boolean;
  isPremium: boolean;
  connectionCount: number | null;
}

interface Conversation {
  id: string;
  participantName: string;
  participantPicture: string | null;
  lastMessage: string | null;
  lastActivityAt: number | null;
  unreadCount: number;
}

interface Message {
  id: string;
  fromMe: boolean;
  senderName: string;
  text: string;
  sentAt: number | null;
}

async function apiGet<T>(path: string): Promise<T> {
  return apiFetch<T>(`/api${path}`);
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(`/api${path}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function Avatar({ src, name, size = 40 }: { src: string | null; name: string; size?: number }) {
  const initials = name.split(" ").map((w) => w[0] ?? "").join("").slice(0, 2).toUpperCase();
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        style={{ width: size, height: size }}
        className="rounded-full object-cover flex-shrink-0"
        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size, background: LI_BLUE }}
      className="rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 text-sm"
    >
      {initials || "?"}
    </div>
  );
}

function VerifiedBadge({ isVerified, isPremium }: { isVerified: boolean; isPremium: boolean }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className={cn(
        "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
        isVerified ? "bg-green-100 text-green-700 border border-green-200" : "bg-gray-100 text-gray-500 border border-gray-200"
      )}>
        {isVerified ? <ShieldCheck className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
        {isVerified ? "Verified LinkedIn Member" : "Unverified"}
      </div>
      {isPremium && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">
          <Star className="w-3.5 h-3.5 fill-amber-500 stroke-amber-500" />
          LinkedIn Premium
        </div>
      )}
    </div>
  );
}

export default function LinkedInPage() {
  const [location] = useLocation();
  const [status, setStatus] = useState<LIStatus>("disconnected");
  const [configured, setConfigured] = useState(true);
  const [profile, setProfile] = useState<LIProfile | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [loadingConvs, setLoadingConvs] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [messagingBlocked, setMessagingBlocked] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const data = await apiGet<{ status: LIStatus; profile: LIProfile | null; configured: boolean }>("/linkedin/status");
      setStatus(data.status);
      setConfigured(data.configured);
      if (data.profile) setProfile(data.profile);
    } catch {
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  const loadConversations = useCallback(async () => {
    setLoadingConvs(true);
    setMessagingBlocked(false);
    try {
      const data = await apiGet<{ conversations: Conversation[] }>("/linkedin/conversations");
      setConversations(data.conversations);
    } catch (err: any) {
      if (err.code === "MESSAGING_ACCESS_REQUIRED") {
        setMessagingBlocked(true);
      }
    } finally {
      setLoadingConvs(false);
    }
  }, []);

  const loadMessages = useCallback(async (convId: string) => {
    setLoadingMessages(true);
    try {
      const data = await apiGet<{ messages: Message[] }>(`/linkedin/conversations/${encodeURIComponent(convId)}/messages`);
      setMessages(data.messages);
    } catch (err: any) {
      if (err.code === "MESSAGING_ACCESS_REQUIRED") setMessagingBlocked(true);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
    const params = new URLSearchParams(window.location.search);
    if (params.get("error")) setErrorMsg(params.get("error"));
    if (params.get("connected")) loadStatus();
    window.history.replaceState({}, "", window.location.pathname);
  }, []);

  useEffect(() => {
    if (status === "connected") loadConversations();
  }, [status]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleConnect() {
    const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
    window.location.href = `${base}/api/linkedin/connect`;
  }

  async function handleDisconnect() {
    await apiPost("/linkedin/disconnect", {});
    setStatus("disconnected");
    setProfile(null);
    setConversations([]);
    setSelectedConv(null);
    setMessages([]);
  }

  async function handleSelectConv(conv: Conversation) {
    setSelectedConv(conv);
    setMessages([]);
    await loadMessages(conv.id);
  }

  async function handleSend() {
    if (!inputText.trim() || !selectedConv || sending) return;
    const text = inputText.trim();
    setInputText("");
    setSending(true);
    try {
      await apiPost(`/linkedin/conversations/${encodeURIComponent(selectedConv.id)}/messages`, { text });
      const optimistic: Message = { id: `opt-${Date.now()}`, fromMe: true, senderName: "You", text, sentAt: Date.now() };
      setMessages((prev) => [...prev, optimistic]);
    } catch (err: any) {
      if (err.code === "MESSAGING_ACCESS_REQUIRED") setMessagingBlocked(true);
      setInputText(text);
    } finally {
      setSending(false);
    }
  }

  if (loadingStatus) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (status !== "connected") {
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <div className="w-full max-w-sm mx-auto px-6">
          <div className="text-center mb-8">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg"
              style={{ background: LI_BLUE }}
            >
              <Linkedin className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">LinkedIn</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Connect your LinkedIn account to view your profile, messages, and member status.
            </p>
          </div>

          {errorMsg && (
            <div className="mb-4 flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              <XCircle className="w-4 h-4 flex-shrink-0" />
              {errorMsg === "not_configured"
                ? "LinkedIn credentials are not yet configured. Add your Client ID and Secret to enable this feature."
                : errorMsg === "cancelled"
                ? "LinkedIn sign-in was cancelled."
                : errorMsg === "auth_failed"
                ? "Authentication failed. Please try again."
                : `Error: ${errorMsg}`}
            </div>
          )}

          {!configured ? (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
              <div className="flex items-center gap-2 font-semibold mb-1">
                <AlertTriangle className="w-4 h-4" />
                Credentials pending
              </div>
              <p className="text-amber-700 leading-relaxed">
                LinkedIn integration is ready. Once your LinkedIn app credentials
                (<code className="bg-amber-100 px-1 rounded">LINKEDIN_CLIENT_ID</code> and{" "}
                <code className="bg-amber-100 px-1 rounded">LINKEDIN_CLIENT_SECRET</code>) are added,
                this button will activate automatically.
              </p>
            </div>
          ) : (
            <button
              onClick={handleConnect}
              className="w-full flex items-center justify-center gap-3 py-3 px-6 rounded-xl text-white font-semibold text-base shadow-md hover:opacity-90 active:scale-95 transition-all"
              style={{ background: LI_BLUE }}
            >
              <Linkedin className="w-5 h-5" />
              Sign in with LinkedIn
            </button>
          )}

          <p className="text-center text-xs text-muted-foreground mt-4">
            You'll be redirected to LinkedIn to grant access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      <div className="w-72 flex-shrink-0 border-r flex flex-col bg-background">
        <div className="p-4 border-b" style={{ borderTopColor: LI_BLUE }}>
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: LI_BLUE }}
            >
              <Linkedin className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-base">LinkedIn</span>
            <div className="ml-auto">
              <button
                onClick={handleDisconnect}
                title="Disconnect LinkedIn"
                className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {profile && (
            <div className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50">
              <Avatar src={profile.profilePicture} name={`${profile.firstName} ${profile.lastName}`} size={36} />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">
                  {profile.firstName} {profile.lastName}
                </div>
                <div className="text-xs text-muted-foreground truncate">{profile.headline}</div>
              </div>
            </div>
          )}

          {profile && (
            <div className="mt-2">
              <VerifiedBadge isVerified={profile.isVerified} isPremium={profile.isPremium} />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-4 py-2.5 border-b">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Messages</span>
          <button onClick={loadConversations} className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground">
            <RefreshCw className={cn("w-3.5 h-3.5", loadingConvs && "animate-spin")} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {messagingBlocked ? (
            <div className="p-4 text-center">
              <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                Messaging API access requires LinkedIn partner approval.
                Profile and verification features are fully active.
              </p>
            </div>
          ) : loadingConvs ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground">
              No conversations yet
            </div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => handleSelectConv(conv)}
                className={cn(
                  "w-full flex items-start gap-3 px-4 py-3 border-b border-border/40 text-left transition-colors hover:bg-muted/50",
                  selectedConv?.id === conv.id && "bg-blue-50 dark:bg-blue-950/30"
                )}
              >
                <Avatar src={conv.participantPicture} name={conv.participantName} size={38} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-medium text-sm truncate">{conv.participantName}</span>
                    {conv.lastActivityAt && (
                      <span className="text-[10px] text-muted-foreground flex-shrink-0">
                        {formatDistanceToNow(new Date(conv.lastActivityAt), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                  {conv.lastMessage && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{conv.lastMessage}</p>
                  )}
                </div>
                {conv.unreadCount > 0 && (
                  <span
                    className="flex-shrink-0 w-5 h-5 rounded-full text-[10px] font-bold text-white flex items-center justify-center mt-0.5"
                    style={{ background: LI_BLUE }}
                  >
                    {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-900/20">
        {!selectedConv ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4 opacity-20"
              style={{ background: LI_BLUE }}
            >
              <Linkedin className="w-10 h-10 text-white" />
            </div>
            <p className="text-muted-foreground text-sm">
              {messagingBlocked
                ? "Messaging requires LinkedIn partner API access."
                : "Select a conversation to start messaging"}
            </p>
            {profile && (
              <div className="mt-6 p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border max-w-xs w-full text-left">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar src={profile.profilePicture} name={`${profile.firstName} ${profile.lastName}`} size={48} />
                  <div>
                    <div className="font-semibold text-sm">{profile.firstName} {profile.lastName}</div>
                    {profile.vanityName && (
                      <div className="text-xs text-muted-foreground">linkedin.com/in/{profile.vanityName}</div>
                    )}
                  </div>
                </div>
                {profile.headline && (
                  <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{profile.headline}</p>
                )}
                <VerifiedBadge isVerified={profile.isVerified} isPremium={profile.isPremium} />
                {profile.email && (
                  <div className="mt-2 text-xs text-muted-foreground">{profile.email}</div>
                )}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-800 border-b shadow-sm flex-shrink-0">
              <button
                onClick={() => { setSelectedConv(null); setMessages([]); }}
                className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <Avatar src={selectedConv.participantPicture} name={selectedConv.participantName} size={36} />
              <div>
                <div className="font-semibold text-sm">{selectedConv.participantName}</div>
                <div className="text-xs text-muted-foreground">LinkedIn connection</div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2">
              {loadingMessages ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-xs text-muted-foreground py-8">No messages yet</div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn("flex", msg.fromMe ? "justify-end" : "justify-start")}
                  >
                    <div
                      className={cn(
                        "max-w-[72%] px-3.5 py-2 rounded-2xl text-sm leading-relaxed shadow-sm",
                        msg.fromMe
                          ? "text-white rounded-br-sm"
                          : "bg-white dark:bg-slate-700 text-foreground rounded-bl-sm border"
                      )}
                      style={msg.fromMe ? { background: LI_BLUE } : undefined}
                    >
                      {msg.text}
                      {msg.sentAt && (
                        <div className={cn("text-[10px] mt-1", msg.fromMe ? "text-blue-200" : "text-muted-foreground")}>
                          {new Date(msg.sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="bg-white dark:bg-slate-800 border-t px-4 py-3 flex-shrink-0">
              {messagingBlocked ? (
                <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  Sending messages requires LinkedIn partner API access.
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder="Write a message…"
                    className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!inputText.trim() || sending}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white disabled:opacity-40 transition-all hover:opacity-90 active:scale-95 flex-shrink-0"
                    style={{ background: LI_BLUE }}
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
