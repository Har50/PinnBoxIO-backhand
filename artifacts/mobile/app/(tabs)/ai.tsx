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
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [provider, setProvider] = useState<Provider>("openai");
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
        throw new Error(error?.error || "Sorry, something went wrong. Please try again.");
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
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: err instanceof Error ? err.message : "Sorry, something went wrong. Please try again.",
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
    newBtn: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: colors.primary + "15",
      alignItems: "center",
      justifyContent: "center",
    },

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

    scrollContent: { padding: 16, paddingBottom: 12 },
    scrollEmpty: { flexGrow: 1 },

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
