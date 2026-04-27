import { useColors } from "@/hooks/useColors";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams, Stack } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const LI_BLUE = "#0A66C2";

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

async function getToken(): Promise<string | null> {
  try {
    if (Platform.OS === "web") {
      return typeof localStorage !== "undefined" ? localStorage.getItem("commshub_session_token") : null;
    }
    const SecureStore = await import("expo-secure-store");
    return await SecureStore.getItemAsync("commshub_session_token");
  } catch {
    return null;
  }
}

async function apiCall<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${API_BASE}/api${path}`, {
    ...opts,
    headers: {
      ...(opts.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...((opts.headers as Record<string, string>) || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

interface LIMessage {
  id: string;
  fromMe: boolean;
  senderName: string;
  text: string;
  sentAt: number | null;
}

function fmtTime(ts: number | null): string {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function LinkedInChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ convId: string; participantName?: string; participantPicture?: string }>();
  const convId = String(params.convId ?? "");
  const participantName = String(params.participantName ?? "Conversation");
  const participantPicture = String(params.participantPicture ?? "");

  const [messages, setMessages] = useState<LIMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const load = useCallback(async () => {
    if (!convId) {
      setError("Missing conversation id");
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const data = await apiCall<{ messages: LIMessage[] }>(`/linkedin/conversations/${encodeURIComponent(convId)}/messages`);
      setMessages(data.messages ?? []);
    } catch (err: any) {
      const msg = err?.message ?? "Failed to load messages";
      if (msg.includes("MESSAGING_ACCESS_REQUIRED") || msg.includes("403")) {
        setError("LinkedIn messaging requires partner API access. Profile features remain active.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [convId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      await apiCall(`/linkedin/conversations/${encodeURIComponent(convId)}/messages`, {
        method: "POST",
        body: JSON.stringify({ text }),
      });
      setInput("");
      await load();
    } catch (err: any) {
      setError(err?.message ?? "Failed to send");
    } finally {
      setSending(false);
    }
  }, [input, sending, convId, load]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Custom header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.5 }]}>
          <Feather name="chevron-left" size={26} color={colors.foreground} />
        </Pressable>
        {participantPicture ? (
          <Image source={{ uri: participantPicture }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, { backgroundColor: LI_BLUE, alignItems: "center", justifyContent: "center" }]}>
            <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 14 }}>
              {participantName.split(" ").map((w) => w[0] ?? "").join("").slice(0, 2).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
            {participantName}
          </Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>LinkedIn</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={LI_BLUE} />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Feather name="alert-triangle" size={28} color={colors.mutedForeground} />
            <Text style={[styles.errorText, { color: colors.mutedForeground }]}>{error}</Text>
          </View>
        ) : (
          <ScrollView ref={scrollRef} contentContainerStyle={{ padding: 16, gap: 8 }}>
            {messages.length === 0 ? (
              <View style={[styles.center, { paddingTop: 40 }]}>
                <Feather name="message-circle" size={32} color={colors.mutedForeground} />
                <Text style={[styles.errorText, { color: colors.mutedForeground }]}>No messages yet</Text>
              </View>
            ) : (
              messages.map((m) => (
                <View
                  key={m.id}
                  style={[
                    styles.bubble,
                    m.fromMe
                      ? { backgroundColor: LI_BLUE, alignSelf: "flex-end", borderBottomRightRadius: 4 }
                      : { backgroundColor: colors.card, alignSelf: "flex-start", borderBottomLeftRadius: 4, borderColor: colors.border, borderWidth: 1 },
                  ]}
                >
                  <Text style={{ color: m.fromMe ? "#fff" : colors.foreground, fontFamily: "Inter_400Regular", fontSize: 15, lineHeight: 20 }}>
                    {m.text}
                  </Text>
                  {m.sentAt && (
                    <Text style={{ color: m.fromMe ? "rgba(255,255,255,0.7)" : colors.mutedForeground, fontSize: 10, marginTop: 4, fontFamily: "Inter_400Regular" }}>
                      {fmtTime(m.sentAt)}
                    </Text>
                  )}
                </View>
              ))
            )}
          </ScrollView>
        )}

        <View style={[styles.inputBar, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: insets.bottom + 8 }]}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Write a message…"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]}
            multiline
            maxLength={2000}
            editable={!sending}
          />
          <Pressable
            onPress={send}
            disabled={!input.trim() || sending}
            style={({ pressed }) => [
              styles.sendBtn,
              { backgroundColor: !input.trim() || sending ? colors.mutedForeground : LI_BLUE },
              pressed && { opacity: 0.7 },
            ]}
          >
            {sending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Feather name="send" size={18} color="#fff" />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { padding: 4, marginRight: 4 },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  headerTitle: { fontFamily: "Inter_600SemiBold", fontSize: 16 },
  headerSub: { fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  errorText: { fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center" },
  bubble: { maxWidth: "82%", padding: 10, paddingHorizontal: 12, borderRadius: 16 },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
