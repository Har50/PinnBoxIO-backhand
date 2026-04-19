import { useGetAccounts } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import { Feather } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { format } from "date-fns";

type Account = {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  provider: string;
  color: string;
  isActive: boolean;
  unreadCount: number;
  createdAt: string;
};

const PROVIDER_LABELS: Record<string, string> = {
  gmail: "Gmail",
  outlook: "Outlook",
  yahoo: "Yahoo Mail",
  imap: "IMAP",
  other: "Email",
  whatsapp: "WhatsApp",
  phone: "Phone",
};

type FeatherName = ComponentProps<typeof Feather>["name"];

function providerIcon(provider: string): FeatherName {
  switch (provider) {
    case "whatsapp":
      return "message-circle";
    case "phone":
      return "phone";
    default:
      return "mail";
  }
}

function AccountCard({ account }: { account: Account }) {
  const colors = useColors();
  const isWhatsApp = account.provider === "whatsapp";
  const isPhone = account.provider === "phone";

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.cardAccent, { backgroundColor: account.color }]} />
      <View style={styles.cardContent}>
        <View style={styles.cardTop}>
          <View style={styles.cardLeft}>
            <View style={[styles.providerIcon, { backgroundColor: account.color + "20" }]}>
              <Feather name={providerIcon(account.provider)} size={18} color={account.color} />
            </View>
            <View style={styles.cardTitles}>
              <Text style={[styles.accountName, { color: colors.foreground }]} numberOfLines={1}>
                {account.name}
              </Text>
              <Text style={[styles.providerName, { color: colors.mutedForeground }]}>
                {PROVIDER_LABELS[account.provider] ?? account.provider}
              </Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: account.isActive ? "#f0fdf4" : "#fffbeb" }]}>
            <View style={[styles.statusDot, { backgroundColor: account.isActive ? "#22c55e" : "#f59e0b" }]} />
            <Text style={[styles.statusText, { color: account.isActive ? "#16a34a" : "#d97706" }]}>
              {account.isActive ? "Active" : "Issue"}
            </Text>
          </View>
        </View>

        <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />

        <View style={styles.cardDetails}>
          {account.email && (
            <Text style={[styles.accountIdentifier, { color: colors.foreground }]} numberOfLines={1}>
              {account.email}
            </Text>
          )}
          {account.phone && (
            <Text style={[styles.accountIdentifier, { color: colors.foreground }]} numberOfLines={1}>
              {account.phone}
            </Text>
          )}
          <Text style={[styles.connectedDate, { color: colors.mutedForeground }]}>
            Connected {format(new Date(account.createdAt), "MMM d, yyyy")}
          </Text>
        </View>

        {!isWhatsApp && !isPhone && (
          <View style={[styles.unreadRow, { backgroundColor: colors.muted }]}>
            <Text style={[styles.unreadLabel, { color: colors.mutedForeground }]}>Unread</Text>
            <Text style={[styles.unreadCount, { color: account.unreadCount > 0 ? "#ef4444" : colors.foreground }]}>
              {account.unreadCount}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

function UserCard() {
  const { user, signOut } = useAuth();
  const colors = useColors();

  const initials = ((user?.firstName?.[0] ?? "") + (user?.lastName?.[0] ?? "")).toUpperCase();
  const displayName = user?.firstName && user?.lastName
    ? `${user.firstName} ${user.lastName}`
    : user?.email ?? "My Workspace";

  return (
    <View style={[styles.userCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.userAvatar, { backgroundColor: colors.accent }]}>
        <Text style={[styles.userAvatarText, { color: colors.primary }]}>{initials}</Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={[styles.userName, { color: colors.foreground }]} numberOfLines={1}>{displayName}</Text>
        {user?.email && (
          <Text style={[styles.userEmail, { color: colors.mutedForeground }]} numberOfLines={1}>{user.email}</Text>
        )}
      </View>
      <Pressable onPress={signOut} style={styles.signOutBtn} testID="sign-out-button">
        <Feather name="log-out" size={18} color={colors.destructive} />
      </Pressable>
    </View>
  );
}

const WEB_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "https://pinnboxio.net";

const LEGAL_LINKS = [
  { label: "Privacy Policy", icon: "shield" as const, path: "/privacy" },
  { label: "Terms of Service", icon: "file-text" as const, path: "/terms" },
  { label: "Refunds & Cancellations", icon: "refresh-cw" as const, path: "/refunds" },
  { label: "Cookie Policy", icon: "aperture" as const, path: "/cookies" },
];

function LegalSection() {
  const colors = useColors();

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Legal</Text>
      <View style={[styles.legalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {LEGAL_LINKS.map((item, idx) => (
          <View key={item.path}>
            {idx > 0 && <View style={[styles.legalDivider, { backgroundColor: colors.border }]} />}
            <Pressable
              style={({ pressed }) => [styles.legalRow, pressed && { opacity: 0.6 }]}
              onPress={() => Linking.openURL(WEB_BASE + item.path)}
            >
              <View style={[styles.legalIconWrap, { backgroundColor: colors.muted }]}>
                <Feather name={item.icon} size={15} color={colors.mutedForeground} />
              </View>
              <Text style={[styles.legalLabel, { color: colors.foreground }]}>{item.label}</Text>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </Pressable>
          </View>
        ))}
      </View>
      <Text style={[styles.copyright, { color: colors.mutedForeground }]}>
        © {new Date().getFullYear()} PinnboxIO · pinnboxio.net
      </Text>
    </View>
  );
}

export default function AccountsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data: accounts, isLoading, isFetching, refetch } = useGetAccounts();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topPad + 12, paddingBottom: 100, paddingHorizontal: 20, gap: 20 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={colors.primary} />
      }
    >
      <Text style={[styles.screenTitle, { color: colors.foreground }]}>Accounts</Text>

      <UserCard />

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Connected Accounts</Text>

        {isLoading ? (
          <View style={styles.loadingCenter}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : !accounts || accounts.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="inbox" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No accounts connected</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Add accounts from the web app
            </Text>
          </View>
        ) : (
          <View style={styles.accountList}>
            {accounts.map((acc) => (
              <AccountCard key={acc.id} account={acc} />
            ))}
          </View>
        )}
      </View>

      <LegalSection />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  screenTitle: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  userAvatarText: { fontSize: 18, fontFamily: "Inter_700Bold" },
  userInfo: { flex: 1, minWidth: 0 },
  userName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  userEmail: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  signOutBtn: { padding: 8, flexShrink: 0 },
  section: { gap: 12 },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  loadingCenter: { paddingVertical: 32, alignItems: "center" },
  emptyState: {
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    padding: 32,
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_500Medium" },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  accountList: { gap: 12 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  cardAccent: { height: 3, width: "100%" },
  cardContent: { padding: 16, gap: 12 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  providerIcon: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  cardTitles: { flex: 1, minWidth: 0 },
  accountName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  providerName: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    flexShrink: 0,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  cardDivider: { height: StyleSheet.hairlineWidth },
  cardDetails: { gap: 4 },
  accountIdentifier: { fontSize: 14, fontFamily: "Inter_400Regular" },
  connectedDate: { fontSize: 12, fontFamily: "Inter_400Regular" },
  unreadRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  unreadLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  unreadCount: { fontSize: 16, fontFamily: "Inter_700Bold" },
  legalCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  legalRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  legalIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  legalLabel: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  legalDivider: { height: StyleSheet.hairlineWidth, marginLeft: 60 },
  copyright: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center", paddingTop: 4 },
});
