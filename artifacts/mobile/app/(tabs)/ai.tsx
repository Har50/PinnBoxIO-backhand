import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useSubscription } from "@/lib/revenuecat";

interface Message {
  role: "user" | "assistant";
  content: string;
  limitReached?: boolean;
}

interface Conversation {
  id: number;
  title: string;
  createdAt: string;
}

async function getAuthToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    return typeof localStorage !== "undefined" ? localStorage.getItem("commshub_session_token") : null;
  }
  const SecureStore = await import("expo-secure-store");
  return SecureStore.getItemAsync("commshub_session_token");
}

type Provider = "openai" | "claude" | "gemini";
const PROVIDERS: { id: Provider; label: string }[] = [
  { id: "openai", label: "GPT-4o" },
  { id: "claude", label: "Claude" },
  { id: "gemini", label: "Gemini" },
];

const SUGGESTIONS = [
  "Summarize my unread emails",
  "Who messaged me recently?",
  "Draft a reply to my latest email",
  "Any important messages today?",
];

export default function AiScreen() {
  const colors = useColors();
  const { isSubscribed, isLoading: subLoading } = useSubscription();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [provider, setProvider] = useState<Provider>("openai");
  const [showPaywall, setShowPaywall] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const apiUrl = process.env.EXPO_PUBLIC_DOMAIN
    ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
    : "/api";

  const startConversation = useCallback(async () => {
    const token = await getAuthToken();
    const res = await fetch(`${apiUrl}/ai/conversations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: "include",
      body: JSON.stringify({ title: "New chat" }),
    });
    if (res.ok) {
      const conv = await res.json();
      setConversation(conv);
      setMessages([]);
    }
  }, [apiUrl]);

  useEffect(() => {
    if (!conversation) {
      startConversation();
    }
  }, [conversation, startConversation]);

  const sendMessage = async (text?: string) => {
    const userMsg = (text ?? input).trim();
    if (!userMsg || !conversation || streaming) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setStreaming(true);

    let assistantContent = "";
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const token = await getAuthToken();
      const res = await fetch(`${apiUrl}/ai/conversations/${conversation.id}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ content: userMsg, provider }),
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
                  updated[updated.length - 1] = { role: "assistant", content: assistantContent };
                  return updated;
                });
              }
            } catch {}
          }
        }
      }
    } catch (err) {
      const isLimitReached = (err as Error & { code?: string })?.code === "AI_DAILY_LIMIT_REACHED";
      if (isLimitReached && !isSubscribed) {
        setShowPaywall(true);
      }
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: err instanceof Error ? err.message : "Sorry, something went wrong. Please try again.",
          limitReached: isLimitReached,
        };
        return updated;
      });
    } finally {
      setStreaming(false);
    }
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);

  if (subLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!isSubscribed && showPaywall) {
    return <PaywallScreen colors={colors} onClose={() => setShowPaywall(false)} />;
  }

  const s = makeStyles(colors);

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerIcon}>
          <Feather name="zap" size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>AI Assistant</Text>
          <Text style={s.headerSub}>Context-aware help for your inbox</Text>
        </View>
        <View style={s.headerActions}>
          {!isSubscribed && (
            <TouchableOpacity style={s.proBadge} onPress={() => setShowPaywall(true)} activeOpacity={0.8}>
              <Feather name="star" size={11} color="#fff" />
              <Text style={s.proBadgeText}>Pro</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={s.newBtn} onPress={startConversation} activeOpacity={0.8}>
            <Feather name="plus" size={15} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Provider pills */}
      <View style={s.providerBar}>
        {PROVIDERS.map((p) => (
          <TouchableOpacity
            key={p.id}
            onPress={() => setProvider(p.id)}
            style={[s.providerPill, provider === p.id && s.providerPillActive]}
            activeOpacity={0.75}
          >
            <Text style={[s.providerPillText, provider === p.id && s.providerPillTextActive]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={[s.scrollContent, messages.length === 0 && s.scrollEmpty]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 ? (
            <View style={s.emptyState}>
              <View style={s.emptyIconWrap}>
                <Feather name="zap" size={30} color={colors.primary} />
              </View>
              <Text style={s.emptyTitle}>Hello! I'm your AI assistant.</Text>
              <Text style={s.emptyText}>
                I can summarize emails, draft replies, find contacts, and help you manage all your communications smarter.
              </Text>
              <View style={s.suggestionsGrid}>
                {SUGGESTIONS.map((suggestion) => (
                  <TouchableOpacity
                    key={suggestion}
                    style={s.suggestion}
                    onPress={() => sendMessage(suggestion)}
                    activeOpacity={0.75}
                  >
                    <Text style={s.suggestionText}>{suggestion}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            messages.map((msg, i) => (
              <View
                key={i}
                style={[s.bubbleWrap, msg.role === "user" ? s.bubbleWrapUser : s.bubbleWrapAssistant]}
              >
                {msg.role === "assistant" && (
                  <View style={s.aiBubbleAvatar}>
                    <Feather name="zap" size={11} color={colors.primary} />
                  </View>
                )}
                <View style={[s.bubble, msg.role === "user" ? s.userBubble : s.assistantBubble]}>
                  <Text style={msg.role === "user" ? s.userText : s.assistantText}>
                    {msg.content || (streaming && i === messages.length - 1 ? "..." : "")}
                  </Text>
                  {msg.limitReached && !isSubscribed && (
                    <TouchableOpacity
                      style={s.upgradeBtn}
                      onPress={() => setShowPaywall(true)}
                      activeOpacity={0.85}
                    >
                      <Feather name="star" size={13} color="#fff" />
                      <Text style={s.upgradeBtnText}>Upgrade to Pro</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))
          )}
        </ScrollView>

        {/* Input bar */}
        <View style={s.inputBar}>
          <TextInput
            ref={inputRef}
            style={s.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask anything about your communications…"
            placeholderTextColor={colors.mutedForeground}
            multiline
            returnKeyType="send"
            onSubmitEditing={() => sendMessage()}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[s.sendBtn, (!input.trim() || streaming) && s.sendBtnDisabled]}
            onPress={() => sendMessage()}
            disabled={!input.trim() || streaming}
            activeOpacity={0.8}
          >
            {streaming ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Feather name="send" size={16} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    // Header
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 18,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    headerIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.primary + "15",
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: colors.foreground },
    headerSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 1 },
    headerActions: { flexDirection: "row", gap: 8, alignItems: "center" },
    proBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: "#f59e0b",
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 20,
    },
    proBadgeText: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#fff" },
    newBtn: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: colors.primary + "15",
      alignItems: "center",
      justifyContent: "center",
    },

    // Provider bar
    providerBar: {
      flexDirection: "row",
      paddingHorizontal: 16,
      paddingVertical: 10,
      gap: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    providerPill: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: colors.muted,
    },
    providerPillActive: { backgroundColor: colors.primary },
    providerPillText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground },
    providerPillTextActive: { color: "#fff" },

    // Scroll
    scrollContent: { padding: 16, paddingBottom: 12 },
    scrollEmpty: { flexGrow: 1 },

    // Empty state
    emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
    emptyIconWrap: {
      width: 60,
      height: 60,
      borderRadius: 18,
      backgroundColor: colors.primary + "15",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
    },
    emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: colors.foreground, textAlign: "center", marginBottom: 8 },
    emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.mutedForeground, textAlign: "center", lineHeight: 21, marginBottom: 24 },
    suggestionsGrid: { width: "100%", gap: 10 },
    suggestion: {
      backgroundColor: colors.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 13,
    },
    suggestionText: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.foreground },

    // Bubbles
    bubbleWrap: { flexDirection: "row", marginBottom: 14, gap: 8 },
    bubbleWrapUser: { justifyContent: "flex-end" },
    bubbleWrapAssistant: { justifyContent: "flex-start", alignItems: "flex-start" },
    aiBubbleAvatar: {
      width: 24,
      height: 24,
      borderRadius: 8,
      backgroundColor: colors.primary + "15",
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
    },
    bubble: { maxWidth: "82%", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
    userBubble: { backgroundColor: colors.primary, borderBottomRightRadius: 5 },
    assistantBubble: {
      backgroundColor: colors.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      borderBottomLeftRadius: 5,
    },
    userText: { color: "#fff", fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22 },
    assistantText: { color: colors.foreground, fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22 },

    // Upgrade button inside bubble
    upgradeBtn: {
      marginTop: 10,
      flexDirection: "row",
      gap: 6,
      alignItems: "center",
      backgroundColor: "#f59e0b",
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 9,
      alignSelf: "flex-start",
    },
    upgradeBtnText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#fff" },

    // Input bar
    inputBar: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    input: {
      flex: 1,
      backgroundColor: colors.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      borderRadius: 22,
      paddingHorizontal: 16,
      paddingTop: 11,
      paddingBottom: 11,
      color: colors.foreground,
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      maxHeight: 120,
    },
    sendBtn: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    sendBtnDisabled: { backgroundColor: colors.muted },
  });
}

function PaywallScreen({ colors, onClose }: { colors: any; onClose?: () => void }) {
  const { offerings, purchase, isPurchasing, isLoading, restore, isRestoring } = useSubscription();
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const currentPackage = offerings?.current?.availablePackages.find((pkg: any) => {
    const packageIdentifier = pkg.identifier?.toLowerCase() ?? "";
    const productIdentifier = pkg.product?.identifier?.toLowerCase() ?? "";
    return !packageIdentifier.includes("storage") && !productIdentifier.includes("storage");
  });
  const price = currentPackage?.product.priceString || "$7.99/mo";

  const handlePurchase = async () => {
    if (!currentPackage) return;
    setShowConfirm(true);
  };

  const confirmPurchase = async () => {
    if (!currentPackage) return;
    setShowConfirm(false);
    try {
      setPurchaseError(null);
      await purchase(currentPackage);
    } catch (err: any) {
      if (!err.userCancelled) {
        setPurchaseError(err.message || "Purchase failed");
      }
    }
  };

  const FEATURES = [
    { icon: "zap", label: "Unlimited AI requests", desc: "No daily limits on AI assistance" },
    { icon: "mail", label: "Email context", desc: "AI reads your live inbox for smarter answers" },
    { icon: "users", label: "Contact insights", desc: "Pull up contact history instantly" },
    { icon: "hard-drive", label: "Storage context", desc: "AI searches your stored files" },
  ];

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { flex: 1 },
    inner: { padding: 28, alignItems: "center", paddingTop: 32 },
    badge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: "#f59e0b" + "20",
      paddingHorizontal: 16,
      paddingVertical: 7,
      borderRadius: 20,
      marginBottom: 22,
    },
    badgeText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#f59e0b" },
    title: { fontSize: 26, fontFamily: "Inter_700Bold", color: colors.foreground, textAlign: "center", marginBottom: 10 },
    subtitle: { fontSize: 15, fontFamily: "Inter_400Regular", color: colors.mutedForeground, textAlign: "center", lineHeight: 23, marginBottom: 32 },
    features: { width: "100%", marginBottom: 28, gap: 16 },
    feature: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
    featureIcon: {
      width: 38,
      height: 38,
      borderRadius: 11,
      backgroundColor: colors.primary + "15",
      alignItems: "center",
      justifyContent: "center",
    },
    featureText: { flex: 1, paddingTop: 2 },
    featureTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    featureDesc: { fontSize: 13, fontFamily: "Inter_400Regular", color: colors.mutedForeground, lineHeight: 19, marginTop: 2 },
    cta: {
      width: "100%",
      backgroundColor: colors.primary,
      paddingVertical: 16,
      borderRadius: 16,
      alignItems: "center",
      marginBottom: 12,
    },
    ctaText: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#fff" },
    ctaSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#fff", opacity: 0.85, marginTop: 2 },
    secondaryBtn: { paddingVertical: 10 },
    secondaryText: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.mutedForeground, textDecorationLine: "underline" },
    error: { color: "#dc2626", fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 14, textAlign: "center" },
    overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", padding: 28 },
    modal: { backgroundColor: colors.card, borderRadius: 20, padding: 24, width: "100%" },
    modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: colors.foreground, marginBottom: 8 },
    modalText: { fontSize: 15, fontFamily: "Inter_400Regular", color: colors.mutedForeground, lineHeight: 22, marginBottom: 20 },
    modalBtns: { flexDirection: "row", gap: 12 },
    modalCancel: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: "center" },
    modalCancelText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    modalConfirm: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center" },
    modalConfirmText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },
  });

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <ScrollView style={s.scroll} contentContainerStyle={s.inner} showsVerticalScrollIndicator={false}>
        <View style={s.badge}>
          <Feather name="star" size={13} color="#f59e0b" />
          <Text style={s.badgeText}>PinnboxIO Pro</Text>
        </View>
        <Text style={s.title}>Unlock unlimited AI assistance</Text>
        <Text style={s.subtitle}>
          Get unlimited AI requests and premium features to manage all your communications smarter.
        </Text>

        <View style={s.features}>
          {FEATURES.map((f) => (
            <View key={f.label} style={s.feature}>
              <View style={s.featureIcon}>
                <Feather name={f.icon as any} size={18} color={colors.primary} />
              </View>
              <View style={s.featureText}>
                <Text style={s.featureTitle}>{f.label}</Text>
                <Text style={s.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {purchaseError && <Text style={s.error}>{purchaseError}</Text>}

        <TouchableOpacity
          style={s.cta}
          onPress={handlePurchase}
          disabled={isPurchasing || isLoading || !currentPackage}
          activeOpacity={0.87}
        >
          {isPurchasing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={s.ctaText}>Start Pro — {price}</Text>
              <Text style={s.ctaSub}>Cancel anytime</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={s.secondaryBtn} onPress={() => restore()} disabled={isRestoring}>
          <Text style={s.secondaryText}>{isRestoring ? "Restoring…" : "Restore purchases"}</Text>
        </TouchableOpacity>
        {onClose && (
          <TouchableOpacity style={s.secondaryBtn} onPress={onClose}>
            <Text style={s.secondaryText}>Continue with 1 free AI request today</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {showConfirm && (
        <View style={s.overlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>Confirm Purchase</Text>
            <Text style={s.modalText}>
              Subscribe to PinnboxIO Pro for {price}? You can cancel anytime from your account settings.
            </Text>
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.modalCancel} onPress={() => setShowConfirm(false)}>
                <Text style={s.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.modalConfirm} onPress={confirmPurchase}>
                <Text style={s.modalConfirmText}>Subscribe</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
