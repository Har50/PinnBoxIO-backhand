import { useColors } from "@/hooks/useColors";
import { Feather } from "@expo/vector-icons";
import { SymbolView } from "expo-symbols";
import * as WebBrowser from "expo-web-browser";
import { useState, useEffect, useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const LI_BLUE = "#0A66C2";
const LI_DARK = "#004182";

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

function formatTime(ts: number | null): string {
  if (!ts) return "";
  const date = new Date(ts);
  const diff = Date.now() - ts;
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 24 * 60 * 60 * 1000) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diff < 7 * 24 * 60 * 60 * 1000) return date.toLocaleDateString([], { weekday: "short" });
  return date.toLocaleDateString([], { day: "2-digit", month: "2-digit" });
}

function ProfileAvatar({ src, name, size = 48 }: { src: string | null; name: string; size?: number }) {
  const initials = name.split(" ").map((w) => w[0] ?? "").join("").slice(0, 2).toUpperCase();
  if (src) {
    return (
      <Image
        source={{ uri: src }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }
  return (
    <View
      style={{
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: LI_BLUE,
        alignItems: "center", justifyContent: "center",
      }}
    >
      <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: size * 0.3 }}>
        {initials || "?"}
      </Text>
    </View>
  );
}

function ConnectedView({
  profile,
  conversations,
  loading,
  onRefresh,
  onDisconnect,
}: {
  profile: LIProfile;
  conversations: Conversation[];
  loading: boolean;
  onRefresh: () => void;
  onDisconnect: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const fullName = `${profile.firstName} ${profile.lastName}`.trim();

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad, backgroundColor: LI_DARK }]}>
        <View style={[styles.linkedinIcon, { backgroundColor: LI_BLUE }]}>
          <Text style={styles.linkedinIconText}>in</Text>
        </View>
        <Text style={styles.headerTitle}>LinkedIn</Text>
        <Pressable onPress={onRefresh} hitSlop={12} style={styles.headerAction}>
          {loading
            ? <ActivityIndicator color="rgba(255,255,255,0.7)" size="small" />
            : Platform.OS === "ios"
              ? <SymbolView name="arrow.clockwise" tintColor="rgba(255,255,255,0.8)" size={18} />
              : <Feather name="refresh-cw" size={18} color="rgba(255,255,255,0.8)" />}
        </Pressable>
      </View>

      <ScrollView
        style={[styles.fill, { backgroundColor: colors.background }]}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile card */}
        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.profileTop}>
            <ProfileAvatar src={profile.profilePicture} name={fullName} size={56} />
            <View style={styles.profileInfo}>
              <View style={styles.profileNameRow}>
                <Text style={[styles.profileName, { color: colors.foreground }]}>{fullName}</Text>
                {profile.isPremium && (
                  <View style={styles.premiumBadge}>
                    <Text style={styles.premiumText}>★ Premium</Text>
                  </View>
                )}
              </View>
              {profile.headline ? (
                <Text style={[styles.profileHeadline, { color: colors.mutedForeground }]} numberOfLines={2}>
                  {profile.headline}
                </Text>
              ) : null}
              {profile.vanityName ? (
                <Text style={[styles.profileUrl, { color: LI_BLUE }]} numberOfLines={1}>
                  linkedin.com/in/{profile.vanityName}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={[styles.profileStats, { borderTopColor: colors.border }]}>
            {profile.connectionCount != null && (
              <View style={styles.profileStat}>
                <Text style={[styles.profileStatValue, { color: colors.foreground }]}>
                  {profile.connectionCount.toLocaleString()}
                </Text>
                <Text style={[styles.profileStatLabel, { color: colors.mutedForeground }]}>Connections</Text>
              </View>
            )}
            <View style={styles.profileStat}>
              <View style={[styles.verifiedDot, { backgroundColor: profile.isVerified ? "#10b981" : colors.mutedForeground }]} />
              <Text style={[styles.profileStatLabel, { color: colors.mutedForeground }]}>
                {profile.isVerified ? "Verified" : "Unverified"}
              </Text>
            </View>
            <Pressable
              onPress={() => Alert.alert(
                "Disconnect LinkedIn",
                "This will remove your LinkedIn connection. You can reconnect at any time.",
                [
                  { text: "Cancel", style: "cancel" },
                  { text: "Disconnect", style: "destructive", onPress: onDisconnect },
                ]
              )}
              style={styles.disconnectBtn}
            >
              {Platform.OS === "ios"
                ? <SymbolView name="rectangle.portrait.and.arrow.right" tintColor={colors.mutedForeground} size={14} />
                : <Feather name="log-out" size={14} color={colors.mutedForeground} />}
              <Text style={[styles.disconnectText, { color: colors.mutedForeground }]}>Disconnect</Text>
            </Pressable>
          </View>
        </View>

        {/* Conversations */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Messages</Text>

        {loading && conversations.length === 0 ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={LI_BLUE} />
          </View>
        ) : conversations.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="message-square" size={28} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No conversations</Text>
            <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
              LinkedIn messaging requires partner API access. Conversations will appear here when available.
            </Text>
          </View>
        ) : (
          <View style={[styles.convList, { borderColor: colors.border }]}>
            {conversations.map((conv, i) => (
              <View
                key={conv.id}
                style={[
                  styles.convRow,
                  { borderBottomColor: colors.border },
                  i === conversations.length - 1 && { borderBottomWidth: 0 },
                ]}
              >
                <ProfileAvatar src={conv.participantPicture} name={conv.participantName} size={44} />
                <View style={styles.convContent}>
                  <View style={styles.convTopRow}>
                    <Text style={[styles.convName, { color: colors.foreground }]} numberOfLines={1}>
                      {conv.participantName}
                    </Text>
                    <Text style={[styles.convTime, { color: colors.mutedForeground }]}>
                      {formatTime(conv.lastActivityAt)}
                    </Text>
                  </View>
                  <Text style={[styles.convPreview, { color: colors.mutedForeground }]} numberOfLines={1}>
                    {conv.lastMessage ?? "No messages"}
                  </Text>
                </View>
                {conv.unreadCount > 0 && (
                  <View style={[styles.badge, { backgroundColor: LI_BLUE }]}>
                    <Text style={styles.badgeText}>{conv.unreadCount}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

export default function LinkedInScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [status, setStatus] = useState<LIStatus>("disconnected");
  const [profile, setProfile] = useState<LIProfile | null>(null);
  const [configured, setConfigured] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const data = await apiGet<{ status: LIStatus; profile: LIProfile | null; configured: boolean }>("/linkedin/status");
      setStatus(data.status);
      setProfile(data.profile);
      setConfigured(data.configured);
      if (data.status === "connected") loadConversations();
    } catch {
      setStatus("error");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadConversations = useCallback(async () => {
    try {
      const data = await apiGet<{ conversations: Conversation[] }>("/linkedin/conversations");
      setConversations(data.conversations);
    } catch {}
  }, []);

  const handleConnect = useCallback(async () => {
    setConnecting(true);
    try {
      const connectUrl = `${API_BASE}/api/linkedin/connect`;
      await WebBrowser.openBrowserAsync(connectUrl);
      // After browser closes, refresh status
      await loadStatus();
    } catch {
      Alert.alert("Error", "Could not open LinkedIn sign-in. Please try again.");
    } finally {
      setConnecting(false);
    }
  }, [loadStatus]);

  const handleDisconnect = useCallback(async () => {
    try {
      await apiPost("/linkedin/disconnect", {});
      setStatus("disconnected");
      setProfile(null);
      setConversations([]);
    } catch {
      Alert.alert("Error", "Could not disconnect LinkedIn. Please try again.");
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setLoading(true);
    await loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  if (loading && status === "disconnected") {
    return (
      <View style={[styles.fill, { backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={LI_BLUE} size="large" />
      </View>
    );
  }

  if (status === "connected" && profile) {
    return (
      <ConnectedView
        profile={profile}
        conversations={conversations}
        loading={loading}
        onRefresh={handleRefresh}
        onDisconnect={handleDisconnect}
      />
    );
  }

  // Disconnected / connect screen
  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad, backgroundColor: LI_DARK }]}>
        <View style={[styles.linkedinIcon, { backgroundColor: LI_BLUE }]}>
          <Text style={styles.linkedinIconText}>in</Text>
        </View>
        <Text style={styles.headerTitle}>LinkedIn</Text>
      </View>

      <View style={[styles.fill, { alignItems: "center", justifyContent: "center", padding: 32 }]}>
        <View style={[styles.connectIconWrap, { backgroundColor: LI_BLUE + "15" }]}>
          <Text style={[styles.linkedinIconText, { color: LI_BLUE, fontSize: 36, fontFamily: "Inter_700Bold" }]}>in</Text>
        </View>

        <Text style={[styles.connectTitle, { color: colors.foreground }]}>Connect LinkedIn</Text>

        {!configured ? (
          <>
            <Text style={[styles.connectSubtitle, { color: colors.mutedForeground }]}>
              LinkedIn credentials haven't been configured yet. Ask your workspace admin to add the Client ID and Secret.
            </Text>
            <View style={[styles.warningBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Feather name="alert-triangle" size={14} color={colors.mutedForeground} />
              <Text style={[styles.warningText, { color: colors.mutedForeground }]}>Awaiting configuration</Text>
            </View>
          </>
        ) : status === "error" ? (
          <>
            <Text style={[styles.connectSubtitle, { color: colors.mutedForeground }]}>
              Something went wrong with your LinkedIn connection. Try signing in again.
            </Text>
            <Pressable
              onPress={handleConnect}
              disabled={connecting}
              style={({ pressed }) => [styles.connectBtn, { backgroundColor: LI_BLUE, opacity: pressed || connecting ? 0.8 : 1 }]}
            >
              {connecting
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.connectBtnText}>Reconnect LinkedIn</Text>}
            </Pressable>
          </>
        ) : (
          <>
            <Text style={[styles.connectSubtitle, { color: colors.mutedForeground }]}>
              Sign in with LinkedIn to view your profile, connection count, and messages in one place.
            </Text>
            <Pressable
              onPress={handleConnect}
              disabled={connecting}
              style={({ pressed }) => [styles.connectBtn, { backgroundColor: LI_BLUE, opacity: pressed || connecting ? 0.8 : 1 }]}
            >
              {connecting
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.connectBtnText}>Sign in with LinkedIn</Text>}
            </Pressable>
            <Text style={[styles.connectHint, { color: colors.mutedForeground }]}>
              You'll be taken to LinkedIn to grant access
            </Text>
          </>
        )}
      </View>
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
    gap: 10,
  },
  linkedinIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  linkedinIconText: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    lineHeight: 20,
  },
  headerTitle: {
    flex: 1,
    color: "#fff",
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  headerAction: { padding: 4 },
  connectIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  connectTitle: { fontSize: 22, fontFamily: "Inter_700Bold", marginBottom: 10, textAlign: "center" },
  connectSubtitle: { fontSize: 14, textAlign: "center", lineHeight: 21, marginBottom: 24, maxWidth: 300 },
  connectBtn: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 220,
  },
  connectBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 16 },
  connectHint: { fontSize: 12, marginTop: 12, textAlign: "center" },
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 8,
  },
  warningText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  profileCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  profileTop: {
    flexDirection: "row",
    gap: 14,
    padding: 16,
  },
  profileInfo: { flex: 1, gap: 3 },
  profileNameRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  profileName: { fontSize: 16, fontFamily: "Inter_700Bold" },
  premiumBadge: {
    backgroundColor: "#f59e0b20",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  premiumText: { color: "#d97706", fontSize: 11, fontFamily: "Inter_600SemiBold" },
  profileHeadline: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  profileUrl: { fontSize: 12, fontFamily: "Inter_400Regular" },
  profileStats: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 16,
  },
  profileStat: { alignItems: "center", gap: 2 },
  profileStatValue: { fontSize: 17, fontFamily: "Inter_700Bold" },
  profileStatLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  verifiedDot: { width: 10, height: 10, borderRadius: 5 },
  disconnectBtn: {
    marginLeft: "auto",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  disconnectText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 10,
  },
  loadingRow: { paddingVertical: 32, alignItems: "center" },
  emptyCard: {
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    padding: 28,
    alignItems: "center",
    gap: 10,
  },
  emptyTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  emptySubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 19 },
  convList: {
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  convRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  convContent: { flex: 1 },
  convTopRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  convName: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold", marginRight: 8 },
  convTime: { fontSize: 11, fontFamily: "Inter_400Regular" },
  convPreview: { fontSize: 13, fontFamily: "Inter_400Regular" },
  badge: {
    minWidth: 20, height: 20, borderRadius: 10,
    alignItems: "center", justifyContent: "center", paddingHorizontal: 5,
  },
  badgeText: { color: "#fff", fontSize: 11, fontFamily: "Inter_700Bold" },
});
