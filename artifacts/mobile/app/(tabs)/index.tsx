import { useGetContacts, useGetOverviewStats } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import { Feather } from "@expo/vector-icons";
import { ActivityIndicator, FlatList, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatDistanceToNow } from "date-fns";

function StatCard({ label, value, icon, color }: { label: string; value: number | string; icon: string; color: string }) {
  const colors = useColors();
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.statIcon, { backgroundColor: color + "18" }]}>
        <Feather name={icon as any} size={18} color={color} />
      </View>
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

function ContactRow({ contact }: { contact: any }) {
  const colors = useColors();
  const initials = contact.name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <View style={[styles.contactRow, { borderBottomColor: colors.border }]}>
      <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
        <Text style={[styles.avatarText, { color: colors.primary }]}>{initials}</Text>
      </View>
      <View style={styles.contactInfo}>
        <Text style={[styles.contactName, { color: colors.foreground }]} numberOfLines={1}>
          {contact.name}
        </Text>
        <Text style={[styles.contactSub, { color: colors.mutedForeground }]} numberOfLines={1}>
          {contact.company || contact.email}
        </Text>
      </View>
      {contact.unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{contact.unreadCount > 9 ? "9+" : contact.unreadCount}</Text>
        </View>
      )}
      {contact.lastMessageAt && (
        <Text style={[styles.contactTime, { color: colors.mutedForeground }]}>
          {formatDistanceToNow(new Date(contact.lastMessageAt), { addSuffix: false })}
        </Text>
      )}
    </View>
  );
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useGetOverviewStats();
  const { data: contacts, isLoading: contactsLoading, refetch: refetchContacts } = useGetContacts({});

  const topContacts = contacts
    ? [...contacts].sort((a, b) => b.messageCount - a.messageCount).filter((c) => c.messageCount > 0).slice(0, 8)
    : [];

  const isRefreshing = false;

  function handleRefresh() {
    refetchStats();
    refetchContacts();
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

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topPad + 8, paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
      }
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.mutedForeground }]}>{greeting()}</Text>
          <Text style={[styles.userName, { color: colors.foreground }]}>{displayName}</Text>
        </View>
        <View style={[styles.avatarLarge, { backgroundColor: colors.accent }]}>
          <Text style={[styles.avatarLargeText, { color: colors.primary }]}>
            {(user?.firstName?.[0] ?? "") + (user?.lastName?.[0] ?? "")}
          </Text>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Overview</Text>

      {statsLoading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <View style={styles.statsGrid}>
          <StatCard label="Unread" value={stats?.totalUnread ?? 0} icon="mail" color="#ef4444" />
          <StatCard label="Messages" value={stats?.totalMessages ?? 0} icon="inbox" color={colors.primary} />
          <StatCard label="Accounts" value={stats?.totalAccounts ?? 0} icon="layers" color="#8b5cf6" />
          <StatCard label="Contacts" value={stats?.totalContacts ?? 0} icon="users" color="#10b981" />
        </View>
      )}

      <View style={styles.sectionRow}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Active Contacts</Text>
      </View>

      {contactsLoading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : topContacts.length === 0 ? (
        <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="users" size={32} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No contacts yet</Text>
        </View>
      ) : (
        <View style={[styles.contactList, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {topContacts.map((c, i) => (
            <ContactRow key={c.id} contact={c} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  greeting: { fontSize: 13, fontFamily: "Inter_400Regular" },
  userName: { fontSize: 24, fontFamily: "Inter_700Bold", marginTop: 2 },
  avatarLarge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLargeText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
    maxWidth: "50%",
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: { fontSize: 24, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  loadingRow: { paddingVertical: 32, alignItems: "center" },
  emptyState: {
    marginHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
    padding: 32,
    alignItems: "center",
    gap: 8,
  },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  contactList: {
    marginHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  contactInfo: { flex: 1, minWidth: 0 },
  contactName: { fontSize: 14, fontFamily: "Inter_500Medium" },
  contactSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  badge: {
    backgroundColor: "#ef4444",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  badgeText: { color: "#ffffff", fontSize: 11, fontFamily: "Inter_700Bold" },
  contactTime: { fontSize: 11, fontFamily: "Inter_400Regular", flexShrink: 0 },
});
