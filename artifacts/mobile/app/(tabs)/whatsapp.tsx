import { useColors } from "@/hooks/useColors";
import { Feather } from "@expo/vector-icons";
import { SymbolView } from "expo-symbols";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";

const WA_GREEN = "#25D366";
const WA_DARK = "#128C7E";

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

async function apiGet<T>(path: string): Promise<T> {
  let token: string | null = null;
  try {
    token = Platform.OS === "web"
      ? localStorage.getItem("commshub_session_token")
      : await SecureStore.getItemAsync("commshub_session_token");
  } catch {}

  const res = await fetch(`${API_BASE}/api${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  let token: string | null = null;
  try {
    token = Platform.OS === "web"
      ? localStorage.getItem("commshub_session_token")
      : await SecureStore.getItemAsync("commshub_session_token");
  } catch {}

  const res = await fetch(`${API_BASE}/api${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

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

function formatTime(ts: number | null): string {
  if (!ts) return "";
  const date = new Date(ts);
  const diff = Date.now() - ts;
  if (diff < 24 * 60 * 60 * 1000) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diff < 7 * 24 * 60 * 60 * 1000) return date.toLocaleDateString([], { weekday: "short" });
  return date.toLocaleDateString([], { day: "2-digit", month: "2-digit" });
}

function ChatRow({ chat, onPress }: { chat: Chat; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chatRow,
        { borderBottomColor: colors.border, backgroundColor: pressed ? colors.muted : colors.background },
      ]}
    >
      <View style={[styles.avatar, { backgroundColor: WA_DARK }]}>
        <Text style={styles.avatarText}>{chat.name.substring(0, 2).toUpperCase()}</Text>
      </View>
      <View style={styles.chatContent}>
        <View style={styles.chatTopRow}>
          <Text style={[styles.chatName, { color: colors.foreground }]} numberOfLines={1}>{chat.name}</Text>
          <Text style={[styles.chatTime, { color: chat.unreadCount > 0 ? WA_GREEN : colors.mutedForeground }]}>
            {formatTime(chat.timestamp)}
          </Text>
        </View>
        <View style={styles.chatBottomRow}>
          <Text style={[styles.lastMessage, { color: colors.mutedForeground }]} numberOfLines={1}>
            {chat.lastMessage ?? ""}
          </Text>
          {chat.unreadCount > 0 && (
            <View style={[styles.badge, { backgroundColor: WA_GREEN }]}>
              <Text style={styles.badgeText}>{chat.unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

function ConversationView({ chat, onBack }: { chat: Chat; onBack: () => void }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const loadMessages = useCallback(async () => {
    try {
      const data = await apiGet<{ messages: Message[] }>(`/whatsapp/chats/${encodeURIComponent(chat.id)}/messages`);
      setMessages(data.messages);
    } catch {} finally {
      setLoading(false);
    }
  }, [chat.id]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  useEffect(() => {
    const t = setInterval(loadMessages, 5000);
    return () => clearInterval(t);
  }, [loadMessages]);

  const send = async () => {
    if (!inputText.trim() || sending) return;
    const text = inputText.trim();
    setInputText("");
    setSending(true);
    try {
      await apiPost(`/whatsapp/chats/${encodeURIComponent(chat.id)}/messages`, { text });
      await loadMessages();
    } catch {} finally {
      setSending(false);
    }
  };

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <View style={[styles.convHeader, { paddingTop: insets.top, backgroundColor: WA_DARK }]}>
        <Pressable onPress={onBack} style={styles.backBtn} hitSlop={12}>
          {Platform.OS === "ios"
            ? <SymbolView name="chevron.left" tintColor="#fff" size={20} />
            : <Feather name="arrow-left" size={20} color="#fff" />}
        </Pressable>
        <View style={[styles.convAvatar, { backgroundColor: WA_GREEN }]}>
          <Text style={styles.convAvatarText}>{chat.name.substring(0, 2).toUpperCase()}</Text>
        </View>
        <Text style={styles.convName}>{chat.name}</Text>
      </View>

      {loading ? (
        <View style={[styles.fill, { alignItems: "center", justifyContent: "center", backgroundColor: "#E5DDD5" }]}>
          <ActivityIndicator color={WA_DARK} />
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1, backgroundColor: "#E5DDD5" }}
          contentContainerStyle={{ padding: 12, gap: 4 }}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.length === 0 && (
            <View style={{ padding: 32, alignItems: "center" }}>
              <Text style={{ color: "#666" }}>No messages yet</Text>
            </View>
          )}
          {messages.map((msg) => (
            <View
              key={msg.id}
              style={[
                styles.bubble,
                msg.fromMe
                  ? [styles.bubbleMe, { backgroundColor: "#DCF8C6" }]
                  : [styles.bubbleThem, { backgroundColor: "#fff" }],
              ]}
            >
              <Text style={{ fontSize: 14, color: "#111", lineHeight: 20 }}>
                {msg.text || <Text style={{ color: "#aaa", fontStyle: "italic" }}>[media]</Text>}
              </Text>
              <View style={styles.bubbleMeta}>
                <Text style={styles.bubbleTime}>
                  {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8, backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <TextInput
          style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground }]}
          placeholder="Message"
          placeholderTextColor={colors.mutedForeground}
          value={inputText}
          onChangeText={setInputText}
          multiline
        />
        <Pressable
          onPress={send}
          disabled={!inputText.trim() || sending}
          style={[styles.sendBtn, { backgroundColor: inputText.trim() ? WA_GREEN : colors.muted }]}
        >
          {sending
            ? <ActivityIndicator size="small" color="#fff" />
            : Platform.OS === "ios"
              ? <SymbolView name="arrow.up" tintColor="#fff" size={18} />
              : <Feather name="send" size={18} color="#fff" />}
        </Pressable>
      </View>
    </View>
  );
}

export default function WhatsAppScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState<WAStatus>("disconnected");
  const [qr, setQr] = useState<string | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [loadingChats, setLoadingChats] = useState(false);

  const pollStatus = useCallback(async () => {
    try {
      const data = await apiGet<{ status: WAStatus; qr: string | null }>("/whatsapp/status");
      setStatus(data.status);
      setQr(data.qr);
      if (data.status === "connected") loadChats();
    } catch {}
  }, []);

  const loadChats = useCallback(async () => {
    setLoadingChats(true);
    try {
      const data = await apiGet<{ chats: Chat[] }>("/whatsapp/chats");
      setChats(data.chats);
    } catch {} finally {
      setLoadingChats(false);
    }
  }, []);

  const connect = useCallback(async () => {
    try {
      await apiPost("/whatsapp/connect", {});
      setStatus("connecting");
    } catch {}
  }, []);

  useEffect(() => {
    pollStatus();
    const interval = setInterval(pollStatus, status !== "connected" ? 3000 : 30000);
    return () => clearInterval(interval);
  }, [pollStatus, status]);

  if (selectedChat) {
    return <ConversationView chat={selectedChat} onBack={() => setSelectedChat(null)} />;
  }

  if (status !== "connected") {
    return (
      <View style={[styles.fill, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top, backgroundColor: WA_DARK }]}>
          <Text style={styles.headerTitle}>WhatsApp</Text>
        </View>
        <View style={[styles.fill, { alignItems: "center", justifyContent: "center", padding: 32 }]}>
          <View style={[styles.connectIcon, { backgroundColor: WA_GREEN + "20", width: 64, height: 64, borderRadius: 32, marginBottom: 16 }]}>
            <Feather name="message-circle" size={28} color={WA_GREEN} />
          </View>
          <Text style={[styles.connectTitle, { color: colors.foreground }]}>Connect WhatsApp</Text>

          {status === "disconnected" && (
            <>
              <Text style={[styles.connectSubtitle, { color: colors.mutedForeground }]}>
                Scan a QR code with your phone to sync your real messages.
              </Text>
              <Pressable
                onPress={connect}
                style={({ pressed }) => [styles.connectBtn, { backgroundColor: WA_GREEN, opacity: pressed ? 0.85 : 1 }]}
              >
                <Text style={styles.connectBtnText}>Connect WhatsApp</Text>
              </Pressable>
            </>
          )}

          {(status === "connecting" || (status === "qr" && !qr)) && (
            <>
              <Text style={[styles.connectSubtitle, { color: colors.mutedForeground }]}>
                {status === "connecting" ? "Starting connection…" : "Generating QR code…"}
              </Text>
              <ActivityIndicator color={WA_DARK} style={{ marginTop: 16 }} />
            </>
          )}

          {status === "qr" && qr && (
            <>
              <Text style={[styles.connectSubtitle, { color: colors.mutedForeground, textAlign: "center" }]}>
                Open WhatsApp → Settings → Linked Devices → Link a Device
              </Text>
              <Image
                source={{ uri: qr }}
                style={{ width: 220, height: 220, marginTop: 16, borderRadius: 12 }}
              />
              <Text style={[styles.qrHint, { color: colors.mutedForeground }]}>QR code refreshes automatically</Text>
            </>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top, backgroundColor: WA_DARK }]}>
        <Text style={styles.headerTitle}>WhatsApp</Text>
        {loadingChats && <ActivityIndicator color="rgba(255,255,255,0.7)" size="small" />}
      </View>

      <View style={[styles.connectedBanner, { borderBottomColor: colors.border }]}>
        <View style={styles.onlineDotSmall} />
        <Text style={[styles.connectedText, { color: colors.foreground }]}>Connected</Text>
      </View>

      <FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ChatRow chat={item} onPress={() => setSelectedChat(item)} />
        )}
        ListEmptyComponent={
          <View style={{ padding: 40, alignItems: "center" }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>No chats yet — messages will appear as they come in</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  headerTitle: {
    flex: 1,
    color: "#fff",
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  connectedBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  onlineDotSmall: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: WA_GREEN,
  },
  connectedText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  chatRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  chatContent: { flex: 1 },
  chatTopRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  chatName: { flex: 1, fontSize: 15, fontFamily: "Inter_600SemiBold", marginRight: 8 },
  chatTime: { fontSize: 12 },
  chatBottomRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  lastMessage: { flex: 1, fontSize: 13, marginRight: 8 },
  badge: { minWidth: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
  badgeText: { color: "#fff", fontSize: 11, fontFamily: "Inter_700Bold" },
  convHeader: { flexDirection: "row", alignItems: "flex-end", paddingHorizontal: 12, paddingBottom: 12, gap: 10 },
  backBtn: { paddingRight: 4 },
  convAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  convAvatarText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 13 },
  convName: { flex: 1, color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 16 },
  bubble: { maxWidth: "75%", borderRadius: 8, padding: 8, marginVertical: 2, elevation: 1 },
  bubbleMe: { alignSelf: "flex-end", borderTopRightRadius: 2 },
  bubbleThem: { alignSelf: "flex-start", borderTopLeftRadius: 2 },
  bubbleMeta: { flexDirection: "row", justifyContent: "flex-end", marginTop: 3 },
  bubbleTime: { fontSize: 11, color: "#999" },
  inputBar: { flexDirection: "row", alignItems: "flex-end", paddingHorizontal: 12, paddingTop: 8, gap: 8, borderTopWidth: StyleSheet.hairlineWidth },
  input: { flex: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, fontSize: 15, maxHeight: 100 },
  sendBtn: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  connectIcon: { alignItems: "center", justifyContent: "center" },
  connectTitle: { fontSize: 20, fontFamily: "Inter_700Bold", marginBottom: 8 },
  connectSubtitle: { fontSize: 14, textAlign: "center", lineHeight: 20, marginBottom: 16 },
  connectBtn: { paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12, marginTop: 8 },
  connectBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 16 },
  qrHint: { fontSize: 12, marginTop: 8 },
});
