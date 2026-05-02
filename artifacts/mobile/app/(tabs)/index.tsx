import { useGetContacts, useGetOverviewStats, useGetRecentMessages, type Contact } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useThemeMode } from "@/contexts/ThemeContext";
import { Feather } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";

type FeatherName = ComponentProps<typeof Feather>["name"];

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number | string;
  icon: FeatherName;
  color: string;
}) {
  const colors = useColors();
  return (
    <View style={[s.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[s.statIconWrap, { backgroundColor: color + "18" }]}>
        <Feather name={icon} size={17} color={color} />
      </View>
      <Text style={[s.statValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[s.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

function ContactAvatar({ contact, colors }: { contact: Contact; colors: any }) {
  const initials = contact.name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
  return (
    <View style={s.contactAvatarWrap}>
      <View style={[s.contactAvatar, { backgroundColor: colors.primary + "18" }]}>
        <Text style={[s.contactAvatarText, { color: colors.primary }]}>{initials}</Text>
      </View>
      {contact.unreadCount > 0 && (
        <View style={s.unreadDot}>
          <Text style={s.unreadDotText}>{contact.unreadCount > 9 ? "9+" : contact.unreadCount}</Text>
        </View>
      )}
    </View>
  );
}

function RecentMessageRow({
  msg,
  colors,
}: {
  msg: any;
  colors: any;
}) {
  const ago = formatDistanceToNow(new Date(msg.receivedAt), { addSuffix: true });
  return (
    <View style={[s.recentRow, { borderBottomColor: colors.border }]}>
      <View style={[s.recentAvatar, { backgroundColor: msg.accountColor + "20" }]}>
        <Text style={[s.recentAvatarText, { color: msg.accountColor }]}>
          {(msg.fromName || "?").substring(0, 2).toUpperCase()}
        </Text>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={s.recentTopRow}>
          <Text style={[s.recentFrom, { color: colors.foreground, fontFamily: msg.isRead ? "Inter_400Regular" : "Inter_600SemiBold" }]} numberOfLines={1}>
            {msg.fromName}
          </Text>
          <Text style={[s.recentTime, { color: colors.mutedForeground }]}>{ago}</Text>
        </View>
        <Text style={[s.recentSubject, { color: colors.foreground }]} numberOfLines={1}>{msg.subject}</Text>
        <Text style={[s.recentPreview, { color: colors.mutedForeground }]} numberOfLines={1}>
          {msg.bodyText || "No preview"}
        </Text>
      </View>
      {!msg.isRead && <View style={[s.unreadBlip, { backgroundColor: colors.primary }]} />}
    </View>
  );
}

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "https://pinn-box-io.replit.app";

async function getToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    return typeof localStorage !== "undefined" ? localStorage.getItem("commshub_session_token") : null;
  }
  const SecureStore = await import("expo-secure-store");
  return SecureStore.getItemAsync("commshub_session_token");
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const colors = useColors();
  const { mode, toggleMode } = useThemeMode();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const [syncing, setSyncing] = useState(false);

  const { data: stats, isLoading: statsLoading, isFetching: statsFetching, refetch: refetchStats } = useGetOverviewStats();
  const { data: contacts, isLoading: contactsLoading, isFetching: contactsFetching, refetch: refetchContacts } = useGetContacts({});
  const { data: recentData, isLoading: recentLoading, refetch: refetchRecent } = useGetRecentMessages({ limit: 5 });

  const topContacts = contacts
    ? [...contacts].sort((a, b) => b.messageCount - a.messageCount).filter((c) => c.messageCount > 0).slice(0, 6)
    : [];

  const isRefreshing = (statsFetching && !statsLoading) || (contactsFetching && !contactsLoading);

  function handleRefresh() {
    refetchStats();
    refetchContacts();
    refetchRecent();
  }

  async function handleSyncContacts() {
    setSyncing(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/contacts/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        refetchContacts();
        Alert.alert("Contacts Synced", data.message ?? "Your contacts have been updated.");
      } else {
        Alert.alert("Sync Failed", "Could not sync contacts. Please try again.");
      }
    } catch {
      Alert.alert("Sync Failed", "Could not sync contacts. Please try again.");
    } finally {
      setSyncing(false);
    }
  }

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const displayName = user?.firstName
    ? user.firstName
    : user?.email?.split("@")[0] ?? "there";

  const avatarInitials = ((user?.firstName?.[0] ?? "") + (user?.lastName?.[0] ?? "")).toUpperCase() || displayName[0]?.toUpperCase() || "?";

  return (
    <ScrollView
      style={[s.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topPad + 12, paddingBottom: 110 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
      }
    >
      {/* Header */}
      <View style={s.header}>
        <View style={{ gap: 2 }}>
          <Text style={[s.greeting, { color: colors.mutedForeground }]}>{greeting()}</Text>
          <Text style={[s.userName, { color: colors.foreground }]}>{displayName}</Text>
        </View>
        <View style={s.headerRight}>
          <Pressable
            onPress={toggleMode}
            style={[s.themeToggle, { backgroundColor: colors.card, borderColor: colors.border }]}
            accessibilityRole="button"
            accessibilityLabel={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            <Feather name={mode === "dark" ? "sun" : "moon"} size={16} color={colors.foreground} />
          </Pressable>
          <View style={[s.userAvatar, { backgroundColor: colors.primary + "18" }]}>
            <Text style={[s.userAvatarText, { color: colors.primary }]}>{avatarInitials}</Text>
          </View>
        </View>
      </View>

      {/* Stats */}
      <Text style={[s.sectionLabel, { color: colors.foreground }]}>Overview</Text>
      {statsLoading ? (
        <View style={s.loadingRow}>
          <ActivityIndicator color={colors.primary} size="small" />
        </View>
      ) : (
        <View style={s.statsGrid}>
          <StatCard label="Unread" value={stats?.totalUnread ?? 0} icon="mail" color="#ef4444" />
          <StatCard label="Messages" value={stats?.totalMessages ?? 0} icon="inbox" color={colors.primary} />
          <StatCard label="Accounts" value={stats?.totalAccounts ?? 0} icon="layers" color="#8b5cf6" />
          <StatCard label="Contacts" value={stats?.totalContacts ?? 0} icon="users" color="#10b981" />
        </View>
      )}

      {/* Recent messages */}
      <View style={s.sectionRow}>
        <Text style={[s.sectionLabel, { color: colors.foreground }]}>Recent Messages</Text>
      </View>
      {recentLoading ? (
        <View style={s.loadingRow}>
          <ActivityIndicator color={colors.primary} size="small" />
        </View>
      ) : !recentData?.length ? (
        <View style={[s.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="inbox" size={28} color={colors.mutedForeground} />
          <Text style={[s.emptyText, { color: colors.mutedForeground }]}>No recent messages</Text>
        </View>
      ) : (
        <View style={[s.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {(recentData as any[]).map((msg: any, i: number) => (
            <RecentMessageRow key={msg.id} msg={msg} colors={colors} />
          ))}
        </View>
      )}

      {/* Active contacts */}
      <View style={[s.sectionRow, { marginTop: 8, paddingRight: 16 }]}>
        <Text style={[s.sectionLabel, { color: colors.foreground }]}>Active Contacts</Text>
        <Pressable
          onPress={handleSyncContacts}
          disabled={syncing}
          style={({ pressed }) => [s.syncBtn, { backgroundColor: colors.primary + "15", opacity: pressed || syncing ? 0.6 : 1 }]}
        >
          {syncing ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Feather name="refresh-cw" size={13} color={colors.primary} />
          )}
          <Text style={[s.syncBtnText, { color: colors.primary }]}>Sync</Text>
        </Pressable>
      </View>
      {contactsLoading ? (
        <View style={s.loadingRow}>
          <ActivityIndicator color={colors.primary} size="small" />
        </View>
      ) : topContacts.length === 0 ? (
        <View style={[s.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="users" size={28} color={colors.mutedForeground} />
          <Text style={[s.emptyText, { color: colors.mutedForeground }]}>No contacts yet</Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.contactsRow}
        >
          {topContacts.map((c) => (
            <View key={c.id} style={[s.contactCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <ContactAvatar contact={c} colors={colors} />
              <Text style={[s.contactName, { color: colors.foreground }]} numberOfLines={1}>{c.name}</Text>
              <Text style={[s.contactSub, { color: colors.mutedForeground }]} numberOfLines={1}>
                {c.company || c.email || ""}
              </Text>
              <Text style={[s.contactMsgs, { color: colors.mutedForeground }]}>
                {c.messageCount} msg{c.messageCount !== 1 ? "s" : ""}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 22,
  },
  greeting: { fontSize: 13, fontFamily: "Inter_400Regular" },
  userName: { fontSize: 26, fontFamily: "Inter_700Bold" },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  themeToggle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  userAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  userAvatarText: { fontSize: 15, fontFamily: "Inter_700Bold" },

  sectionLabel: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 26,
  },
  statCard: {
    flex: 1,
    minWidth: "44%",
    maxWidth: "50%",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 8,
  },
  statIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: { fontSize: 26, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },

  loadingRow: { paddingVertical: 28, alignItems: "center" },

  listCard: {
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    marginBottom: 6,
  },
  recentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  recentAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  recentAvatarText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  recentTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  recentFrom: { fontSize: 13, flex: 1, marginRight: 8 },
  recentTime: { fontSize: 11, fontFamily: "Inter_400Regular" },
  recentSubject: { fontSize: 13, fontFamily: "Inter_500Medium" },
  recentPreview: { fontSize: 12, fontFamily: "Inter_400Regular" },
  unreadBlip: { width: 8, height: 8, borderRadius: 4, marginTop: 6, alignSelf: "flex-start" },

  emptyCard: {
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 28,
    alignItems: "center",
    gap: 10,
  },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },

  contactsRow: {
    paddingHorizontal: 16,
    paddingBottom: 4,
    gap: 10,
  },
  contactCard: {
    width: 120,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 4,
    alignItems: "flex-start",
  },
  contactAvatarWrap: { marginBottom: 6 },
  contactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  contactAvatarText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  unreadDot: {
    position: "absolute",
    top: -3,
    right: -3,
    backgroundColor: "#ef4444",
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadDotText: { color: "#fff", fontSize: 10, fontFamily: "Inter_700Bold" },
  contactName: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  contactSub: { fontSize: 11, fontFamily: "Inter_400Regular" },
  contactMsgs: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  syncBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  syncBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
});
