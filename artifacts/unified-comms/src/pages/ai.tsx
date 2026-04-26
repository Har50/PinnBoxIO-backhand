import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Sparkles, Send, Plus, Trash2, Loader2, Crown, Camera, ImageIcon, FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAuthHeaders } from "@/lib/api-client";

type Provider = "openai" | "claude" | "gemini";

const PROVIDERS: { id: Provider; label: string; model: string }[] = [
  { id: "openai", label: "GPT-4o", model: "OpenAI" },
  { id: "claude", label: "Claude", model: "Anthropic" },
  { id: "gemini", label: "Gemini", model: "Google" },
];

interface Attachment {
  name: string;
  mimeType: string;
  data: string; // base64
  preview?: string; // object URL for images
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const fetchConversations = useCallback(async () => {
    const res = await apiFetch("/ai/conversations");
    if (res.ok) {
      const data = await res.json();
      setConversations(data);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const newConversation = async () => {
    if (activeConvId && messages.length === 0) {
      setShowMobileChats(false);
      textareaRef.current?.focus();
      return;
    }

    const res = await apiFetch("/ai/conversations", {
      method: "POST",
      body: JSON.stringify({ title: "New conversation" }),
    });
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
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages || []);
    }
  };

  const deleteConversation = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    await apiFetch(`/ai/conversations/${id}`, { method: "DELETE" });
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeConvId === id) {
      setActiveConvId(null);
      setMessages([]);
    }
  };

  const addAttachments = useCallback(async (files: FileList | null) => {
    if (!files) return;
    const newAttachments: Attachment[] = [];
    for (const file of Array.from(files)) {
      const data = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve((e.target?.result as string).split(",")[1]);
        reader.readAsDataURL(file);
      });
      newAttachments.push({
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        data,
        preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
      });
    }
    setAttachments((prev) => [...prev, ...newAttachments]);
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
      const res = await apiFetch("/ai/conversations", {
        method: "POST",
        body: JSON.stringify({ title: input.slice(0, 60) || attachments[0]?.name || "Attachment" }),
      });
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
    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: userMsg,
        attachments: sentAttachments.map((a) => ({ name: a.name, mimeType: a.mimeType, preview: a.preview })),
      },
    ]);
    setMessages((prev) => [...prev, { role: "assistant", content: "", streaming: true }]);
    setStreaming(true);

    let assistantContent = "";
    try {
      const res = await apiFetch(`/ai/conversations/${convId}/messages`, {
        method: "POST",
        body: JSON.stringify({
          content: userMsg || "(see attached file)",
          provider,
          attachments: sentAttachments.map(({ name, mimeType, data }) => ({ name, mimeType, data })),
        }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => null);
        const limitError = new Error(error?.error || "Sorry, something went wrong. Please try again.");
        if (error?.code === "AI_DAILY_LIMIT_REACHED") {
          (limitError as Error & { code?: string }).code = error.code;
        }
        throw limitError;
      }

      if (!res.body) throw new Error("No response body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                assistantContent += data.content;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: "assistant",
                    content: assistantContent,
                    streaming: true,
                  };
                  return updated;
                });
              }
            } catch {}
          }
        }
      }
    } catch (err) {
      const isLimitReached = (err as Error & { code?: string })?.code === "AI_DAILY_LIMIT_REACHED";
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: err instanceof Error ? err.message : "Sorry, something went wrong. Please try again.",
          streaming: false,
          limitReached: isLimitReached,
        };
        return updated;
      });
    } finally {
      setMessages((prev) => {
        const updated = [...prev];
        if (updated.length > 0) {
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            streaming: false,
          };
        }
        return updated;
      });
      setStreaming(false);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatConversationTitle = (conv: Conversation) => {
    const title = conv.title?.trim();
    if (title && !/^new (chat|conversation)$/i.test(title)) return title;
    return `Chat ${new Date(conv.createdAt).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    })}`;
  };

  const activeConversation = conversations.find((conv) => conv.id === activeConvId);

  return (
    <div className="flex h-full min-w-0 overflow-hidden">
      <div className={cn(
        "border-r bg-sidebar flex-col min-w-0",
        showMobileChats ? "flex w-full" : "hidden",
        "md:flex md:w-64 md:shrink-0",
      )}>
        <div className="p-4 border-b">
          <Button onClick={newConversation} className="w-full gap-2" size="sm">
            <Plus className="w-4 h-4" />
            New conversation
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 flex flex-col gap-1">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => loadConversation(conv.id)}
                className={cn(
                  "w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center justify-between group transition-colors",
                  activeConvId === conv.id
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent text-foreground",
                )}
              >
                <span className="truncate flex-1">{formatConversationTitle(conv)}</span>
                <button
                  onClick={(e) => deleteConversation(conv.id, e)}
                  className={cn(
                    "ml-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity",
                    activeConvId === conv.id ? "text-primary-foreground/70 hover:text-primary-foreground" : "text-muted-foreground hover:text-destructive",
                  )}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </button>
            ))}
            {conversations.length === 0 && (
              <p className="text-center text-xs text-muted-foreground py-8 px-4">
                Start a new conversation to get AI help with your communications.
              </p>
            )}
          </div>
        </ScrollArea>
      </div>

      <div className={cn("flex-1 flex-col min-w-0", showMobileChats ? "hidden md:flex" : "flex")}>
        <div className="px-3 sm:px-6 py-3 sm:py-4 border-b flex items-center gap-3 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="md:hidden gap-2"
            onClick={() => setShowMobileChats(true)}
          >
            <MessageSquare className="w-4 h-4" />
            Chats
          </Button>
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="font-semibold text-foreground">AI Assistant</h1>
            <p className="text-xs text-muted-foreground truncate">
              {activeConversation ? formatConversationTitle(activeConversation) : "Context-aware help for your inbox"}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2 min-w-0">
            <div className="flex rounded-lg border overflow-x-auto text-xs max-w-[52vw] sm:max-w-none">
              {PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setProvider(p.id)}
                  className={cn(
                    "px-3 py-1.5 font-medium transition-colors",
                    provider === p.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-muted-foreground"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <Badge variant="secondary">Pro</Badge>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 sm:p-6 flex flex-col gap-4">
          {messages.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-2">Hello! I'm your AI assistant.</h2>
                <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
                  I can summarize your emails, draft replies, find contacts, and help you manage all your communications smarter.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-md w-full mt-2">
                {[
                  "Summarize my unread emails",
                  "Who messaged me recently?",
                  "Write a recovery email to a customer",
                  "Draft a tailored reply to my latest email",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      setInput(suggestion);
                      textareaRef.current?.focus();
                    }}
                    className="text-left p-3 rounded-lg border text-sm hover:bg-accent transition-colors text-foreground"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[92%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-card border text-foreground rounded-bl-sm",
                )}
              >
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {msg.attachments.map((a, ai) => (
                      a.preview ? (
                        <img key={ai} src={a.preview} alt={a.name} className="max-h-40 max-w-full rounded-lg object-cover" />
                      ) : (
                        <div key={ai} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-primary-foreground/10 text-xs">
                          <FileText className="w-3 h-3 shrink-0" />
                          <span className="truncate max-w-[150px]">{a.name}</span>
                        </div>
                      )
                    ))}
                  </div>
                )}
                <div className="whitespace-pre-wrap">{msg.content || (msg.streaming ? <span className="inline-block w-2 h-4 bg-current animate-pulse rounded-sm" /> : "")}</div>
                {msg.limitReached && (
                  <Button
                    size="sm"
                    className="mt-3 gap-2"
                    onClick={() => window.location.assign(`${import.meta.env.BASE_URL}storage`)}
                  >
                    <Crown className="w-4 h-4" />
                    Upgrade to Pro
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="p-3 sm:p-4 border-t">
          {/* Hidden file inputs */}
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden"
            onChange={(e) => addAttachments(e.target.files)} />
          <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden"
            onChange={(e) => addAttachments(e.target.files)} />
          <input ref={fileInputRef} type="file" multiple className="hidden"
            onChange={(e) => addAttachments(e.target.files)} />

          {/* Attachment chips */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {attachments.map((a, i) => (
                <div key={i} className="relative group">
                  {a.preview ? (
                    <div className="relative">
                      <img src={a.preview} alt={a.name} className="h-14 w-14 rounded-lg object-cover border" />
                      <button onClick={() => removeAttachment(i)}
                        className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted text-xs border">
                      <FileText className="w-3 h-3 text-muted-foreground shrink-0" />
                      <span className="truncate max-w-[120px]">{a.name}</span>
                      <button onClick={() => removeAttachment(i)} className="ml-1 text-muted-foreground hover:text-destructive">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Attach menu popover */}
          {showAttachMenu && (
            <div className="mb-2 rounded-xl border bg-card shadow-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b">
                <span className="font-semibold text-sm">Add to Chat</span>
                <button onClick={() => setShowAttachMenu(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3 p-4">
                <button onClick={() => cameraInputRef.current?.click()}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl bg-muted hover:bg-accent transition-colors text-sm font-medium">
                  <Camera className="w-6 h-6" />
                  Camera
                </button>
                <button onClick={() => photoInputRef.current?.click()}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl bg-muted hover:bg-accent transition-colors text-sm font-medium">
                  <ImageIcon className="w-6 h-6" />
                  Photos
                </button>
                <button onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl bg-muted hover:bg-accent transition-colors text-sm font-medium">
                  <FileText className="w-6 h-6" />
                  Files
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-2 items-end">
            <Button
              variant="outline"
              size="icon"
              className="h-11 w-11 shrink-0"
              onClick={() => setShowAttachMenu((v) => !v)}
            >
              <Plus className="w-4 h-4" />
            </Button>
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your communications..."
              className="resize-none min-h-[44px] max-h-32 flex-1"
              rows={1}
            />
            <Button
              onClick={sendMessage}
              disabled={(!input.trim() && attachments.length === 0) || streaming}
              size="icon"
              className="h-11 w-11 shrink-0"
            >
              {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">Press Enter to send · Shift+Enter for new line</p>
        </div>
      </div>
    </div>
  );
}

