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
import { useColors } from "@/hooks/useColors";
import { useSubscription } from "@/lib/revenuecat";
import { getApiBaseUrl } from "@workspace/api-client-react";
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
  const baseUrl = getApiBaseUrl ? getApiBaseUrl() : "";

  const apiUrl = `${baseUrl}/api`;

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
    if (isSubscribed && !conversation) {
      startConversation();
    }
  }, [isSubscribed, conversation, startConversation]);

  const sendMessage = async () => {
    if (!input.trim() || !conversation || streaming) return;

    const userMsg = input.trim();
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
                  updated[updated.length - 1] = {
                    role: "assistant",
                    content: assistantContent,
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
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: { fontSize: 18, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold" },
    headerSub: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    newBtn: {
      backgroundColor: colors.primary + "20",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
    },
    newBtnText: { fontSize: 13, color: colors.primary, fontFamily: "Inter_600SemiBold" },
    providerRow: { flexDirection: "row", gap: 6, marginTop: 6 },
    providerBtn: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
      borderWidth: 1,
    },
    providerBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
    scrollContent: { padding: 16, paddingBottom: 8 },
    bubble: {
      maxWidth: "85%",
      marginBottom: 12,
      padding: 12,
      borderRadius: 16,
    },
    userBubble: { alignSelf: "flex-end", backgroundColor: colors.primary, borderBottomRightRadius: 4 },
    assistantBubble: { alignSelf: "flex-start", backgroundColor: colors.card, borderBottomLeftRadius: 4 },
    userText: { color: "#fff", fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22 },
    assistantText: { color: colors.foreground, fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22 },
    upgradeBtn: {
      marginTop: 12,
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      alignItems: "center",
    },
    upgradeBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold" },
    inputRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      padding: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: 8,
    },
    textInput: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 10,
      color: colors.foreground,
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      maxHeight: 120,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sendBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    sendBtnDisabled: { backgroundColor: colors.muted },
    emptyState: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
    emptyTitle: { fontSize: 20, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold", marginBottom: 8 },
    emptyText: { fontSize: 15, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
  });

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

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>AI Assistant</Text>
          <View style={[styles.providerRow]}>
            {PROVIDERS.map((p) => (
              <TouchableOpacity
                key={p.id}
                onPress={() => setProvider(p.id)}
                style={[
                  styles.providerBtn,
                  { borderColor: colors.border, backgroundColor: provider === p.id ? colors.primary : colors.card }
                ]}
              >
                <Text style={[
                  styles.providerBtnText,
                  { color: provider === p.id ? "#fff" : colors.mutedForeground }
                ]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {!isSubscribed && (
            <TouchableOpacity style={styles.newBtn} onPress={() => setShowPaywall(true)}>
              <Text style={styles.newBtnText}>Pro</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.newBtn} onPress={startConversation}>
            <Text style={styles.newBtnText}>New</Text>
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={[styles.scrollContent, messages.length === 0 && { flex: 1 }]}
          keyboardShouldPersistTaps="handled"
        >
          {messages.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Hello! I'm your AI assistant.</Text>
              <Text style={styles.emptyText}>
                Ask me to summarize emails, search contacts and stored files, or write a tailored email draft from your instructions.
              </Text>
            </View>
          ) : (
            messages.map((msg, i) => (
              <View
                key={i}
                style={[styles.bubble, msg.role === "user" ? styles.userBubble : styles.assistantBubble]}
              >
                <Text style={msg.role === "user" ? styles.userText : styles.assistantText}>
                  {msg.content || (streaming && i === messages.length - 1 ? "..." : "")}
                </Text>
                {msg.limitReached && !isSubscribed && (
                  <TouchableOpacity style={styles.upgradeBtn} onPress={() => setShowPaywall(true)} activeOpacity={0.85}>
                    <Text style={styles.upgradeBtnText}>Upgrade to Pro</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </ScrollView>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            value={input}
            onChangeText={setInput}
            placeholder="Ask anything about your comms..."
            placeholderTextColor={colors.mutedForeground}
            multiline
            onSubmitEditing={sendMessage}
            returnKeyType="send"
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || streaming) && styles.sendBtnDisabled]}
            onPress={sendMessage}
            disabled={!input.trim() || streaming}
          >
            {streaming ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={{ color: "#fff", fontSize: 18 }}>↑</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
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

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    inner: { flex: 1, padding: 32, alignItems: "center", justifyContent: "center" },
    badge: {
      backgroundColor: colors.primary + "20",
      paddingHorizontal: 16,
      paddingVertical: 6,
      borderRadius: 20,
      marginBottom: 24,
    },
    badgeText: { fontSize: 13, fontWeight: "600", color: colors.primary, fontFamily: "Inter_600SemiBold" },
    title: { fontSize: 28, fontWeight: "800", color: colors.foreground, fontFamily: "Inter_700Bold", textAlign: "center", marginBottom: 12 },
    subtitle: { fontSize: 16, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 24, marginBottom: 32 },
    features: { width: "100%", marginBottom: 32, gap: 16 },
    feature: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
    featureIcon: { fontSize: 20, marginTop: 2 },
    featureText: { flex: 1 },
    featureTitle: { fontSize: 15, fontWeight: "600", color: colors.foreground, fontFamily: "Inter_600SemiBold" },
    featureDesc: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular", lineHeight: 19 },
    cta: {
      width: "100%",
      backgroundColor: colors.primary,
      paddingVertical: 16,
      borderRadius: 14,
      alignItems: "center",
      marginBottom: 12,
    },
    ctaText: { fontSize: 17, fontWeight: "700", color: "#fff", fontFamily: "Inter_700Bold" },
    ctaSub: { fontSize: 13, color: "#fff", opacity: 0.85, fontFamily: "Inter_400Regular", marginTop: 2 },
    restoreBtn: { paddingVertical: 8 },
    restoreText: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textDecorationLine: "underline" },
    error: { color: "#dc2626", fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 12, textAlign: "center" },
    modalOverlay: {
      position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "rgba(0,0,0,0.5)",
      alignItems: "center", justifyContent: "center",
      padding: 32,
    },
    modal: {
      backgroundColor: colors.card, borderRadius: 20, padding: 24, width: "100%",
    },
    modalTitle: { fontSize: 18, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold", marginBottom: 8 },
    modalText: { fontSize: 15, color: colors.mutedForeground, fontFamily: "Inter_400Regular", lineHeight: 22, marginBottom: 20 },
    modalButtons: { flexDirection: "row", gap: 12 },
    modalCancel: {
      flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1,
      borderColor: colors.border, alignItems: "center",
    },
    modalCancelText: { fontSize: 15, color: colors.foreground, fontFamily: "Inter_600SemiBold" },
    modalConfirm: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: colors.primary, alignItems: "center" },
    modalConfirmText: { fontSize: 15, color: "#fff", fontFamily: "Inter_600SemiBold" },
  });

  const FEATURES = [
    { icon: "🤖", title: "AI Communications Assistant", desc: "Summarize emails, draft replies, and get smart insights about your inbox" },
    { icon: "⚡", title: "Priority Inbox", desc: "AI-powered sorting to surface the most important messages first" },
    { icon: "📊", title: "Advanced Analytics", desc: "Deep insights into your communication patterns and productivity" },
    { icon: "🔗", title: "Unlimited Accounts", desc: "Connect unlimited email, WhatsApp, and phone accounts" },
  ];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.inner}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>PinnboxIO Pro</Text>
        </View>
        <Text style={styles.title}>Unlock AI-powered communications</Text>
        <Text style={styles.subtitle}>
          Get your AI assistant and premium features to manage all your communications smarter.
        </Text>

        <View style={styles.features}>
          {FEATURES.map((f, i) => (
            <View key={i} style={styles.feature}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {purchaseError && <Text style={styles.error}>{purchaseError}</Text>}

        <TouchableOpacity
          style={styles.cta}
          onPress={handlePurchase}
          disabled={isPurchasing || isLoading || !currentPackage}
        >
          {isPurchasing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.ctaText}>Start Pro — {price}</Text>
              <Text style={styles.ctaSub}>Cancel anytime</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.restoreBtn} onPress={() => restore()} disabled={isRestoring}>
          <Text style={styles.restoreText}>{isRestoring ? "Restoring..." : "Restore purchases"}</Text>
        </TouchableOpacity>
        {onClose && (
          <TouchableOpacity style={styles.restoreBtn} onPress={onClose}>
            <Text style={styles.restoreText}>Continue with 1 free AI request today</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {showConfirm && (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Confirm Purchase</Text>
            <Text style={styles.modalText}>
              Subscribe to PinnboxIO Pro for {price}? You can cancel anytime from your account settings.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowConfirm(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={confirmPurchase}>
                <Text style={styles.modalConfirmText}>Subscribe</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
