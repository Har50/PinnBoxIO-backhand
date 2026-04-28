import { useColors } from "@/hooks/useColors";
import { Feather } from "@expo/vector-icons";
import { SymbolView } from "expo-symbols";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
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

const WA_GREEN = "#25D366";
const WA_DARK = "#128C7E";

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

async function apiGet<T>(path: string): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${API_BASE}/api${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const token = await getToken();
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

type WAStatus = "disconnected" | "connecting" | "qr" | "pairing" | "connected";
type ConnectMode = "qr" | "phone";

type Chat = {
  id: string;
  name: string;
  unreadCount: number;
  timestamp: number | null;
  lastMessage: string | null;
  isGroup: boolean;
};

type MediaType = "image" | "video" | "audio" | "document" | "sticker" | null;

type Message = {
  id: string;
  fromMe: boolean;
  text: string;
  mediaType: MediaType;
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

function MobileMediaContent({ msg, chatId }: { msg: Message; chatId: string }) {
  const [blobUri, setBlobUri] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const hasMedia = !!msg.mediaType;

  useEffect(() => {
    if (!hasMedia) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch(
          `${API_BASE}/api/whatsapp/chats/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(msg.id)}/media`,
          { headers: token ? { Authorization: `Bearer ${token}` } : {} },
        );
        if (!res.ok || cancelled) { setFailed(true); return; }
        const blob = await res.blob();
        const reader = new FileReader();
        reader.onload = () => { if (!cancelled) setBlobUri(reader.result as string); };
        reader.readAsDataURL(blob);
      } catch { setFailed(true); }
    })();
    return () => { cancelled = true; };
  }, [chatId, msg.id, hasMedia]);

  if (!hasMedia) {
    if (!msg.text) return <Text style={{ color: "#999", fontStyle: "italic", fontSize: 14 }}>Message</Text>;
    return <Text style={{ fontSize: 14, color: "#111", lineHeight: 20 }}>{msg.text}</Text>;
  }

  if (failed) {
    const label = msg.mediaType === "image" ? "📷 Image" : msg.mediaType === "video" ? "🎥 Video" : msg.mediaType === "audio" ? "🎵 Audio" : "📄 " + (msg.text || "Document");
    return <Text style={{ color: "#999", fontStyle: "italic", fontSize: 14 }}>{label} — unavailable</Text>;
  }

  if (!blobUri) {
    const h = msg.mediaType === "audio" ? 36 : 150;
    return <View style={{ width: 200, height: h, borderRadius: 8, backgroundColor: "#ddd" }} />;
  }

  if (msg.mediaType === "image" || msg.mediaType === "sticker") {
    return (
      <View>
        <Image source={{ uri: blobUri }} style={{ width: 220, height: 160, borderRadius: 8 }} resizeMode="cover" />
        {!!msg.text && <Text style={{ fontSize: 13, color: "#111", marginTop: 4 }}>{msg.text}</Text>}
      </View>
    );
  }

  if (msg.mediaType === "video") {
    return <Text style={{ fontSize: 14, color: "#444", fontStyle: "italic" }}>🎥 {msg.text || "Video"} (tap to play)</Text>;
  }

  if (msg.mediaType === "audio") {
    return <Text style={{ fontSize: 14, color: "#444", fontStyle: "italic" }}>🎵 Voice message</Text>;
  }

  return <Text style={{ fontSize: 14, color: "#0070f3" }}>📄 {msg.text || "Document"}</Text>;
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
    <KeyboardAvoidingView style={[styles.fill, { backgroundColor: colors.background }]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
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
              <MobileMediaContent msg={msg} chatId={chat.id} />
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
    </KeyboardAvoidingView>
  );
}

function ConnectScreen({
  status, qr, pairingCode,
  onConnect, onPairingRequest,
}: {
  status: WAStatus;
  qr: string | null;
  pairingCode: string | null;
  onConnect: () => void;
  onPairingRequest: (phone: string) => Promise<void>;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<ConnectMode>("qr");
  const [phone, setPhone] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const handlePairingRequest = async () => {
    const clean = phone.replace(/\D/g, "");
    if (clean.length < 7) {
      setPhoneError("Enter a valid phone number with country code, e.g. 14155552671");
      return;
    }
    setPhoneError(null);
    setRequesting(true);
    try {
      await onPairingRequest(clean);
    } catch (e: any) {
      setPhoneError(e.message ?? "Failed to request code");
    } finally {
      setRequesting(false);
    }
  };

  const isBusy = status === "connecting" || status === "pairing" || requesting;
  const showQRContent = mode === "qr";

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top, backgroundColor: WA_DARK }]}>
        <Text style={styles.headerTitle}>WhatsApp</Text>
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
        {/* Icon */}
        <View style={[styles.connectIcon, { backgroundColor: WA_GREEN + "20" }]}>
          <Feather name="message-circle" size={28} color={WA_GREEN} />
        </View>
        <Text style={[styles.connectTitle, { color: colors.foreground }]}>Connect WhatsApp</Text>
        <Text style={[styles.connectSubtitle, { color: colors.mutedForeground }]}>
          Link your WhatsApp account to send and receive messages.
        </Text>

        {/* Tab switcher — only show when disconnected & idle */}
        {(status === "disconnected") && (
          <View style={[styles.tabRow, { backgroundColor: colors.muted }]}>
            {(["qr", "phone"] as ConnectMode[]).map((m) => (
              <Pressable
                key={m}
                onPress={() => { setMode(m); setPhoneError(null); }}
                style={[
                  styles.tab,
                  mode === m && { backgroundColor: colors.background, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
                ]}
              >
                <Feather
                  name={m === "qr" ? "camera" : "smartphone"}
                  size={14}
                  color={mode === m ? WA_GREEN : colors.mutedForeground}
                />
                <Text style={[styles.tabText, { color: mode === m ? WA_GREEN : colors.mutedForeground }]}>
                  {m === "qr" ? "Scan QR Code" : "Phone Number"}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* QR Mode */}
        {(showQRContent || status === "qr") && status === "disconnected" && (
          <>
            <Text style={[styles.modeHint, { color: colors.mutedForeground }]}>
              Open WhatsApp → Settings → Linked Devices → Link a Device, then scan the QR code.
            </Text>
            <Pressable
              onPress={onConnect}
              style={({ pressed }) => [styles.connectBtn, { backgroundColor: WA_GREEN, opacity: pressed ? 0.85 : 1 }]}
            >
              <Text style={styles.connectBtnText}>Get QR Code</Text>
            </Pressable>
          </>
        )}

        {/* Phone Number Mode */}
        {mode === "phone" && status === "disconnected" && (
          <>
            <Text style={[styles.modeHint, { color: colors.mutedForeground }]}>
              Enter your WhatsApp phone number with country code (no +). We'll give you an 8-digit code to enter in WhatsApp.
            </Text>
            <View style={[styles.phoneRow, { borderColor: phoneError ? "#ef4444" : colors.border, backgroundColor: colors.muted }]}>
              <Feather name="phone" size={16} color={colors.mutedForeground} />
              <TextInput
                style={[styles.phoneInput, { color: colors.foreground }]}
                placeholder="14155552671"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={(t) => { setPhone(t); setPhoneError(null); }}
                returnKeyType="done"
                onSubmitEditing={handlePairingRequest}
              />
            </View>
            {phoneError && (
              <Text style={styles.errorText}>{phoneError}</Text>
            )}
            <Pressable
              onPress={handlePairingRequest}
              disabled={isBusy || !phone.trim()}
              style={({ pressed }) => [
                styles.connectBtn,
                { backgroundColor: WA_GREEN, opacity: (pressed || isBusy || !phone.trim()) ? 0.6 : 1 },
              ]}
            >
              {isBusy
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.connectBtnText}>Request Code</Text>}
            </Pressable>
          </>
        )}

        {/* Connecting / generating QR spinner */}
        {(status === "connecting") && (
          <>
            <Text style={[styles.connectSubtitle, { color: colors.mutedForeground, marginTop: 16 }]}>
              Starting connection…
            </Text>
            <ActivityIndicator color={WA_DARK} style={{ marginTop: 12 }} />
          </>
        )}

        {/* QR code shown */}
        {status === "qr" && qr && (
          <>
            <Text style={[styles.modeHint, { color: colors.mutedForeground, marginTop: 8 }]}>
              Open WhatsApp → Settings → Linked Devices → Link a Device
            </Text>
            <Image
              source={{ uri: qr }}
              style={styles.qrImage}
            />
            <Text style={[styles.qrHint, { color: colors.mutedForeground }]}>QR code refreshes automatically</Text>
          </>
        )}

        {status === "qr" && !qr && (
          <ActivityIndicator color={WA_DARK} style={{ marginTop: 16 }} />
        )}

        {/* Pairing code shown */}
        {(status === "pairing") && (
          <>
            {pairingCode ? (
              <>
                <Text style={[styles.modeHint, { color: colors.mutedForeground, marginTop: 8 }]}>
                  Open WhatsApp → Settings → Linked Devices → Link with Phone Number, then enter this code:
                </Text>
                <View style={[styles.codeBox, { borderColor: WA_GREEN, backgroundColor: WA_GREEN + "12" }]}>
                  <Text style={[styles.codeText, { color: WA_DARK }]}>
                    {pairingCode.length === 8
                      ? `${pairingCode.slice(0, 4)}-${pairingCode.slice(4)}`
                      : pairingCode}
                  </Text>
                </View>
                <Text style={[styles.qrHint, { color: colors.mutedForeground }]}>Code expires — enter it quickly</Text>
              </>
            ) : (
              <>
                <Text style={[styles.connectSubtitle, { color: colors.mutedForeground, marginTop: 16 }]}>
                  Requesting pairing code…
                </Text>
                <ActivityIndicator color={WA_DARK} style={{ marginTop: 12 }} />
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

export default function WhatsAppScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState<WAStatus>("disconnected");
  const [qr, setQr] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [loadingChats, setLoadingChats] = useState(false);

  const pollStatus = useCallback(async () => {
    try {
      const data = await apiGet<{ status: WAStatus; qr: string | null; pairingCode: string | null }>("/whatsapp/status");
      setStatus(data.status);
      setQr(data.qr);
      setPairingCode(data.pairingCode);
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

  const requestPairingCode = useCallback(async (phone: string) => {
    const res = await apiPost<{ ok: boolean }>("/whatsapp/pairing-code", { phone });
    setStatus("pairing");
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
      <ConnectScreen
        status={status}
        qr={qr}
        pairingCode={pairingCode}
        onConnect={connect}
        onPairingRequest={requestPairingCode}
      />
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
  onlineDotSmall: { width: 8, height: 8, borderRadius: 4, backgroundColor: WA_GREEN },
  connectedText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  chatRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  avatarText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 15 },
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
  // Connect screen
  connectIcon: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  connectTitle: { fontSize: 22, fontFamily: "Inter_700Bold", marginBottom: 6 },
  connectSubtitle: { fontSize: 14, textAlign: "center", lineHeight: 20, marginBottom: 16 },
  tabRow: { flexDirection: "row", borderRadius: 10, padding: 4, gap: 4, marginBottom: 20, alignSelf: "stretch", marginHorizontal: 0 },
  tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 8 },
  tabText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  modeHint: { fontSize: 13, textAlign: "center", lineHeight: 19, marginBottom: 16 },
  connectBtn: { paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12, marginTop: 4, alignItems: "center", minWidth: 200 },
  connectBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 16 },
  phoneRow: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, alignSelf: "stretch", marginBottom: 4 },
  phoneInput: { flex: 1, fontSize: 16, fontFamily: "Inter_400Regular" },
  errorText: { color: "#ef4444", fontSize: 12, marginBottom: 8, textAlign: "center" },
  qrImage: { width: 220, height: 220, marginTop: 8, borderRadius: 12 },
  qrHint: { fontSize: 12, marginTop: 8 },
  codeBox: { borderWidth: 2, borderRadius: 14, paddingVertical: 20, paddingHorizontal: 32, marginTop: 16, marginBottom: 8, alignItems: "center" },
  codeText: { fontSize: 36, fontFamily: "Inter_700Bold", letterSpacing: 6 },
});
