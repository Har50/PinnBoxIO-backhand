import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Send, Plus, Trash2, Loader2 } from "lucide-react";
import { useGetStripeSubscription, useGetStripeProducts } from "@/hooks/useStripe";
import { cn } from "@/lib/utils";

type Provider = "openai" | "claude" | "gemini";

const PROVIDERS: { id: Provider; label: string; model: string }[] = [
  { id: "openai", label: "GPT-4o", model: "OpenAI" },
  { id: "claude", label: "Claude", model: "Anthropic" },
  { id: "gemini", label: "Gemini", model: "Google" },
];

interface Message {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

interface Conversation {
  id: number;
  title: string;
  createdAt: string;
}

async function apiFetch(path: string, options?: RequestInit) {
  return fetch(`/api${path}`, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });
}

export default function AiPage() {
  const { data: subData, isLoading: subLoading } = useGetStripeSubscription();
  const isPro = subData?.isPro;

  if (subLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isPro) {
    return <PricingPage />;
  }

  return <AiChat />;
}

function AiChat() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [provider, setProvider] = useState<Provider>("openai");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    const res = await apiFetch("/ai/conversations", {
      method: "POST",
      body: JSON.stringify({ title: "New conversation" }),
    });
    if (res.ok) {
      const conv = await res.json();
      setConversations((prev) => [conv, ...prev]);
      setActiveConvId(conv.id);
      setMessages([]);
    }
  };

  const loadConversation = async (id: number) => {
    setActiveConvId(id);
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

  const sendMessage = async () => {
    if (!input.trim() || streaming) return;

    let convId = activeConvId;
    if (!convId) {
      const res = await apiFetch("/ai/conversations", {
        method: "POST",
        body: JSON.stringify({ title: input.slice(0, 60) }),
      });
      if (!res.ok) return;
      const conv = await res.json();
      convId = conv.id;
      setActiveConvId(conv.id);
      setConversations((prev) => [conv, ...prev]);
    }

    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setMessages((prev) => [...prev, { role: "assistant", content: "", streaming: true }]);
    setStreaming(true);

    let assistantContent = "";
    try {
      const res = await fetch(`/api/ai/conversations/${convId}/messages`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: userMsg, provider }),
      });

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
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
          streaming: false,
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

  return (
    <div className="flex h-full">
      <div className="w-64 border-r bg-sidebar flex flex-col">
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
                <span className="truncate flex-1">{conv.title}</span>
                <button
                  onClick={(e) => deleteConversation(conv.id, e)}
                  className={cn(
                    "ml-2 opacity-0 group-hover:opacity-100 transition-opacity",
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

      <div className="flex-1 flex flex-col">
        <div className="px-6 py-4 border-b flex items-center gap-3 flex-wrap">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h1 className="font-semibold text-foreground">AI Assistant</h1>
            <p className="text-xs text-muted-foreground">Context-aware help for your inbox</p>
          </div>
          <div className="ml-auto flex items-center gap-2 flex-wrap">
            <div className="flex rounded-lg border overflow-hidden text-xs">
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

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
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
              <div className="grid grid-cols-2 gap-2 max-w-md w-full mt-2">
                {[
                  "Summarize my unread emails",
                  "Who messaged me recently?",
                  "Draft a reply to my latest email",
                  "Find emails from a contact",
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
                  "max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-card border text-foreground rounded-bl-sm",
                )}
              >
                {msg.content || (msg.streaming ? <span className="inline-block w-2 h-4 bg-current animate-pulse rounded-sm" /> : "")}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t">
          <div className="flex gap-2 items-end">
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
              disabled={!input.trim() || streaming}
              size="icon"
              className="h-11 w-11 shrink-0"
            >
              {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">Press Enter to send, Shift+Enter for new line</p>
        </div>
      </div>
    </div>
  );
}

function PricingPage() {
  const { data: productsData, isLoading } = useGetStripeProducts();
  const [loading, setLoading] = useState<string | null>(null);

  const products = productsData?.data || [];
  const proProduct = products[0];
  const prices = proProduct?.prices || [];
  const monthlyPrice = prices.find((p: any) => p.recurring?.interval === "month");
  const yearlyPrice = prices.find((p: any) => p.recurring?.interval === "year");

  const handleCheckout = async (priceId: string) => {
    setLoading(priceId);
    try {
      const res = await apiFetch("/stripe/checkout", {
        method: "POST",
        body: JSON.stringify({ priceId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.url) window.location.href = data.url;
      }
    } finally {
      setLoading(null);
    }
  };

  const features = [
    { icon: "🤖", title: "AI Communications Assistant", desc: "Summarize emails, draft replies, get smart insights" },
    { icon: "⚡", title: "Priority Inbox", desc: "AI surfaces your most important messages automatically" },
    { icon: "📊", title: "Advanced Analytics", desc: "Deep insights into communication patterns" },
    { icon: "🔗", title: "Unlimited Accounts", desc: "Connect as many accounts as you need" },
    { icon: "🔒", title: "Priority Support", desc: "Get help faster with dedicated support" },
    { icon: "🌐", title: "All Platforms", desc: "Web, iOS, and Android included" },
  ];

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto py-16 px-6">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            CommsHub Pro
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Unlock AI-powered communications
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Get your AI assistant and premium features to manage all your communications smarter — on web and mobile.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {[
            monthlyPrice && {
              priceId: monthlyPrice.id,
              label: "Monthly",
              price: `$${(monthlyPrice.unitAmount / 100).toFixed(2)}`,
              period: "/month",
              desc: "Billed monthly",
              featured: false,
            },
            yearlyPrice && {
              priceId: yearlyPrice.id,
              label: "Annual",
              price: `$${(yearlyPrice.unitAmount / 100).toFixed(2)}`,
              period: "/year",
              desc: "Save 25% vs monthly",
              featured: true,
            },
          ]
            .filter(Boolean)
            .map((plan: any) => (
              <div
                key={plan.priceId}
                className={cn(
                  "rounded-2xl border p-8 flex flex-col",
                  plan.featured ? "border-primary shadow-lg shadow-primary/10 bg-primary/5" : "bg-card",
                )}
              >
                {plan.featured && (
                  <Badge className="self-start mb-4">Best value</Badge>
                )}
                <p className="text-sm font-medium text-muted-foreground mb-1">{plan.label}</p>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
                <p className="text-sm text-muted-foreground mb-6">{plan.desc}</p>
                <Button
                  onClick={() => handleCheckout(plan.priceId)}
                  disabled={loading === plan.priceId || isLoading}
                  className="w-full"
                  variant={plan.featured ? "default" : "outline"}
                >
                  {loading === plan.priceId ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Get started
                </Button>
              </div>
            ))}

          {products.length === 0 && !isLoading && (
            <div className="md:col-span-2 rounded-2xl border bg-card p-8 text-center">
              <p className="text-muted-foreground">Pricing will be available soon.</p>
            </div>
          )}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => (
            <div key={f.title} className="flex gap-3 p-4 rounded-xl border bg-card">
              <span className="text-2xl">{f.icon}</span>
              <div>
                <h3 className="font-semibold text-sm text-foreground mb-1">{f.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
