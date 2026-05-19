import { useState } from "react";
import { useGetAccounts } from "@workspace/api-client-react";
import { useAuth, useUser } from "@clerk/expo";
import { useColors } from "@/hooks/useColors";
import { Feather } from "@expo/vector-icons";
import { getAuthToken } from "@/lib/authToken";
import type { ComponentProps } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { format } from "date-fns";
import * as WebBrowser from "expo-web-browser";

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
  phone: "Phone",
};

type FeatherName = ComponentProps<typeof Feather>["name"];

function providerIcon(provider: string): FeatherName {
  switch (provider) {
    case "phone": return "phone";
    case "imap": return "server";
    default: return "mail";
  }
}

const API_BASE = process.env.EXPO_PUBLIC_API_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_API_DOMAIN}`
  : process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "https://pinn-box-io.replit.app";
const OAUTH_BASE = API_BASE;

function isImapVirtualId(id: number) {
  return id <= -3;
}

function credentialIdFromVirtualId(id: number): number {
  return -id - 2;
}

const PRESET_HOSTS: Record<string, { host: string; port: string; secure: boolean }> = {
  yahoo: { host: "imap.mail.yahoo.com", port: "993", secure: true },
  icloud: { host: "imap.mail.me.com", port: "993", secure: true },
  zoho: { host: "imap.zoho.com", port: "993", secure: true },
  fastmail: { host: "imap.fastmail.com", port: "993", secure: true },
  other: { host: "", port: "993", secure: true },
};

type ImapForm = {
  preset: string;
  email: string;
  displayName: string;
  host: string;
  port: string;
  secure: boolean;
  username: string;
  password: string;
};

const defaultImapForm = (): ImapForm => ({
  preset: "other",
  email: "",
  displayName: "",
  host: "",
  port: "993",
  secure: true,
  username: "",
  password: "",
});

function AccountCard({ account, onDisconnect }: { account: Account; onDisconnect: (acc: Account) => void }) {
  const colors = useColors();
  const isPhone = account.provider === "phone";
  const isImap = account.provider === "imap" && isImapVirtualId(account.id);
  const canDisconnect = account.provider === "gmail" || account.provider === "outlook" || isImap;

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
          <View style={styles.cardRight}>
            <View style={[styles.statusBadge, { backgroundColor: account.isActive ? "#f0fdf4" : "#fffbeb" }]}>
              <View style={[styles.statusDot, { backgroundColor: account.isActive ? "#22c55e" : "#f59e0b" }]} />
              <Text style={[styles.statusText, { color: account.isActive ? "#16a34a" : "#d97706" }]}>
                {account.isActive ? "Active" : "Issue"}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />

        <View style={styles.cardDetails}>
          {account.email && (
            <Text style={[styles.accountIdentifier, { color: colors.foreground }]} numberOfLines={1}>{account.email}</Text>
          )}
          {account.phone && (
            <Text style={[styles.accountIdentifier, { color: colors.foreground }]} numberOfLines={1}>{account.phone}</Text>
          )}
          <Text style={[styles.connectedDate, { color: colors.mutedForeground }]}>
            Connected {format(new Date(account.createdAt), "MMM d, yyyy")}
          </Text>
        </View>

        {canDisconnect && (
          <Pressable
            onPress={() => onDisconnect(account)}
            style={({ pressed }) => [styles.disconnectBtn, { opacity: pressed ? 0.6 : 1, borderColor: colors.destructive + "40" }]}
          >
            <Feather name="link-2" size={13} color={colors.destructive} />
            <Text style={[styles.disconnectText, { color: colors.destructive }]}>Disconnect</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function ImapModal({ visible, onClose, onSuccess, colors }: {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const [form, setForm] = useState<ImapForm>(defaultImapForm());
  const [connecting, setConnecting] = useState(false);
  const [step, setStep] = useState<"preset" | "details">("preset");

  const presets = [
    { key: "yahoo", label: "Yahoo Mail" },
    { key: "icloud", label: "Apple iCloud" },
    { key: "zoho", label: "Zoho Mail" },
    { key: "fastmail", label: "Fastmail" },
    { key: "other", label: "Other / Custom" },
  ];

  function applyPreset(key: string) {
    const cfg = PRESET_HOSTS[key] ?? PRESET_HOSTS.other;
    setForm((f) => ({ ...f, preset: key, host: cfg.host, port: cfg.port, secure: cfg.secure }));
    setStep("details");
  }

  async function handleConnect() {
    if (!form.email || !form.host || !form.password) {
      Alert.alert("Missing fields", "Please fill in email, IMAP host, and password.");
      return;
    }
    setConnecting(true);
    try {
      const token = await getAuthToken();
      const res = await fetch(`${API_BASE}/api/auth/imap/connect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          email: form.email,
          displayName: form.displayName || null,
          host: form.host,
          port: Number(form.port) || 993,
          secure: form.secure,
          username: form.username || form.email,
          password: form.password,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const errMsg = typeof err === "object" && err !== null && "error" in err && typeof (err as Record<string, unknown>).error === "string"
          ? (err as Record<string, unknown>).error as string
          : "Could not connect. Check your credentials.";
        Alert.alert("Connection failed", errMsg);
        return;
      }
      Alert.alert("Connected!", "Your IMAP account was connected successfully.");
      setForm(defaultImapForm());
      setStep("preset");
      onSuccess();
      onClose();
    } catch {
      Alert.alert("Error", "Connection failed. Please try again.");
    } finally {
      setConnecting(false);
    }
  }

  function handleClose() {
    setForm(defaultImapForm());
    setStep("preset");
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ padding: 24, gap: 16, paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <Text style={{ fontSize: 20, fontFamily: "Inter_700Bold", color: colors.foreground }}>
            {step === "preset" ? "Connect IMAP" : "Account Details"}
          </Text>
          <Pressable onPress={handleClose} hitSlop={12}>
            <Feather name="x" size={22} color={colors.mutedForeground} />
          </Pressable>
        </View>

        {step === "preset" && (
          <>
            <Text style={{ fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>
              Choose your email provider to pre-fill server settings.
            </Text>
            {presets.map((p) => (
              <Pressable
                key={p.key}
                onPress={() => applyPreset(p.key)}
                style={({ pressed }) => [
                  styles.presetRow,
                  { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Feather name="server" size={18} color={colors.primary} />
                <Text style={{ flex: 1, fontSize: 15, fontFamily: "Inter_500Medium", color: colors.foreground }}>{p.label}</Text>
                <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
              </Pressable>
            ))}
          </>
        )}

        {step === "details" && (
          <>
            <Pressable onPress={() => setStep("preset")} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <Feather name="arrow-left" size={16} color={colors.primary} />
              <Text style={{ fontSize: 14, color: colors.primary, fontFamily: "Inter_500Medium" }}>Back</Text>
            </Pressable>

            <ImapField label="Email Address *" value={form.email} onChangeText={(t) => setForm((f) => ({ ...f, email: t, username: f.username || t }))} placeholder="you@example.com" keyboardType="email-address" colors={colors} />
            <ImapField label="Display Name" value={form.displayName} onChangeText={(t) => setForm((f) => ({ ...f, displayName: t }))} placeholder="My Yahoo Mail" colors={colors} />
            <ImapField label="IMAP Server *" value={form.host} onChangeText={(t) => setForm((f) => ({ ...f, host: t }))} placeholder="imap.mail.yahoo.com" colors={colors} />
            <ImapField label="Port" value={form.port} onChangeText={(t) => setForm((f) => ({ ...f, port: t }))} placeholder="993" keyboardType="numeric" colors={colors} />

            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 }}>
              <Text style={{ fontSize: 14, fontFamily: "Inter_500Medium", color: colors.foreground }}>SSL / TLS</Text>
              <Switch
                value={form.secure}
                onValueChange={(v) => setForm((f) => ({ ...f, secure: v }))}
                trackColor={{ true: colors.primary }}
              />
            </View>

            <ImapField label="Username (usually your email)" value={form.username} onChangeText={(t) => setForm((f) => ({ ...f, username: t }))} placeholder="you@example.com" colors={colors} />
            <ImapField label="Password / App Password *" value={form.password} onChangeText={(t) => setForm((f) => ({ ...f, password: t }))} placeholder="••••••••••••" secureTextEntry colors={colors} />

            <Pressable
              onPress={handleConnect}
              disabled={connecting}
              style={({ pressed }) => [
                styles.connectImapBtn,
                { backgroundColor: colors.primary, opacity: pressed || connecting ? 0.7 : 1 },
              ]}
            >
              {connecting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Feather name="server" size={16} color="#fff" />
                  <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" }}>Connect IMAP Account</Text>
                </>
              )}
            </Pressable>
          </>
        )}
      </ScrollView>
    </Modal>
  );
}

function ImapField({ label, value, onChangeText, placeholder, keyboardType, secureTextEntry, colors }: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: import("react-native").KeyboardTypeOptions;
  secureTextEntry?: boolean;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        autoCapitalize="none"
        autoCorrect={false}
        style={{
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 10,
          paddingHorizontal: 14,
          paddingVertical: 12,
          fontSize: 15,
          fontFamily: "Inter_400Regular",
          color: colors.foreground,
        }}
      />
    </View>
  );
}


function UserCard() {
  const { signOut } = useAuth();
  const { user } = useUser();
  const colors = useColors();
  const initials = ((user?.firstName?.[0] ?? "") + (user?.lastName?.[0] ?? "")).toUpperCase();
  const displayName = user?.firstName && user?.lastName
    ? `${user.firstName} ${user.lastName}`
    : user?.primaryEmailAddress?.emailAddress ?? "My Workspace";

  return (
    <View style={[styles.userCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.userAvatar, { backgroundColor: colors.accent }]}>
        <Text style={[styles.userAvatarText, { color: colors.primary }]}>{initials}</Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={[styles.userName, { color: colors.foreground }]} numberOfLines={1}>{displayName}</Text>
        {user?.primaryEmailAddress?.emailAddress && (
          <Text style={[styles.userEmail, { color: colors.mutedForeground }]} numberOfLines={1}>{user.primaryEmailAddress.emailAddress}</Text>
        )}
      </View>
      <Pressable onPress={() => signOut()} style={styles.signOutBtn} testID="sign-out-button">
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

function ConnectSection({ onRefetch }: { onRefetch: () => void }) {
  const { getToken } = useAuth();
  const colors = useColors();
  const [gmailLoading, setGmailLoading] = useState(false);
  const [outlookLoading, setOutlookLoading] = useState(false);
  const [imapVisible, setImapVisible] = useState(false);

  const connectOAuth = async (provider: "gmail" | "outlook") => {
    const token = await getToken();
    if (!token) return;
    if (provider === "gmail") setGmailLoading(true);
    else setOutlookLoading(true);
    try {
      const url = `${OAUTH_BASE}/api/auth/${provider}/connect?mobileToken=${encodeURIComponent(token)}`;
      const completeUrl = "pinnboxio://auth-complete";
      await WebBrowser.openAuthSessionAsync(url, completeUrl);
      onRefetch();
    } finally {
      if (provider === "gmail") setGmailLoading(false);
      else setOutlookLoading(false);
    }
  };

  return (
    <View style={[styles.connectSection]}>
      <Text style={[styles.connectTitle, { color: colors.mutedForeground }]}>Connect Accounts</Text>
      <View style={styles.connectButtons}>
        <Pressable
          onPress={() => connectOAuth("gmail")}
          disabled={gmailLoading}
          style={({ pressed }) => [
            styles.connectBtn,
            { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed || gmailLoading ? 0.6 : 1 },
          ]}
        >
          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "#EA433520", alignItems: "center", justifyContent: "center" }}>
            <Feather name="mail" size={18} color="#EA4335" />
          </View>
          <Text style={[styles.connectBtnText, { color: colors.foreground }]}>Connect Gmail</Text>
          {gmailLoading ? <ActivityIndicator size="small" color={colors.primary} /> : <Feather name="chevron-right" size={16} color={colors.mutedForeground} />}
        </Pressable>

        <Pressable
          onPress={() => connectOAuth("outlook")}
          disabled={outlookLoading}
          style={({ pressed }) => [
            styles.connectBtn,
            { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed || outlookLoading ? 0.6 : 1 },
          ]}
        >
          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "#0078D420", alignItems: "center", justifyContent: "center" }}>
            <Feather name="mail" size={18} color="#0078D4" />
          </View>
          <Text style={[styles.connectBtnText, { color: colors.foreground }]}>Connect Outlook</Text>
          {outlookLoading ? <ActivityIndicator size="small" color={colors.primary} /> : <Feather name="chevron-right" size={16} color={colors.mutedForeground} />}
        </Pressable>

        <Pressable
          onPress={() => setImapVisible(true)}
          style={({ pressed }) => [
            styles.connectBtn,
            { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.6 : 1 },
          ]}
        >
          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primary + "20", alignItems: "center", justifyContent: "center" }}>
            <Feather name="server" size={18} color={colors.primary} />
          </View>
          <Text style={[styles.connectBtnText, { color: colors.foreground }]}>Connect IMAP</Text>
          <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
        </Pressable>
      </View>
      <ImapModal visible={imapVisible} onClose={() => setImapVisible(false)} onSuccess={onRefetch} colors={colors} />
    </View>
  );
}

export default function AccountsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const [disconnecting, setDisconnecting] = useState<number | null>(null);

  const { data: accounts, isLoading, isFetching, refetch } = useGetAccounts();

  async function handleDisconnect(account: Account) {
    Alert.alert(
      "Disconnect Account",
      `Are you sure you want to disconnect ${account.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: async () => {
            setDisconnecting(account.id);
            try {
              const token = await getAuthToken();
              const isImap = account.provider === "imap" && isImapVirtualId(account.id);
              const url = isImap
                ? `${API_BASE}/api/auth/imap/${credentialIdFromVirtualId(account.id)}/disconnect`
                : `${API_BASE}/api/auth/${account.provider}/disconnect`;
              const res = await fetch(url, {
                method: "DELETE",
                headers: token ? { Authorization: `Bearer ${token}` } : {},
                credentials: "include",
              });
              if (res.ok) {
                refetch();
              } else {
                Alert.alert("Error", "Failed to disconnect account.");
              }
            } catch {
              Alert.alert("Error", "Failed to disconnect account.");
            } finally {
              setDisconnecting(null);
            }
          },
        },
      ]
    );
  }

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
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Connect Gmail, Outlook, or IMAP below</Text>
          </View>
        ) : (
          <View style={styles.accountList}>
            {accounts.map((acc) => (
              <View key={acc.id} style={{ opacity: disconnecting === acc.id ? 0.5 : 1 }}>
                <AccountCard account={acc} onDisconnect={handleDisconnect} />
              </View>
            ))}
          </View>
        )}
      </View>

      <ConnectSection onRefetch={refetch} />

      <LegalSection />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  screenTitle: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  userCard: { flexDirection: "row", alignItems: "center", borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  userAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  userAvatarText: { fontSize: 18, fontFamily: "Inter_700Bold" },
  userInfo: { flex: 1, minWidth: 0 },
  userName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  userEmail: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  signOutBtn: { padding: 8, flexShrink: 0 },
  section: { gap: 12 },
  sectionTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.8 },
  loadingCenter: { paddingVertical: 32, alignItems: "center" },
  emptyState: { borderRadius: 16, borderWidth: 1, borderStyle: "dashed", padding: 32, alignItems: "center", gap: 8 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_500Medium" },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  accountList: { gap: 12 },
  card: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  cardAccent: { height: 3, width: "100%" },
  cardContent: { padding: 16, gap: 12 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  cardRight: { flexShrink: 0 },
  providerIcon: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  cardTitles: { flex: 1, minWidth: 0 },
  accountName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  providerName: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  cardDivider: { height: StyleSheet.hairlineWidth },
  cardDetails: { gap: 4 },
  accountIdentifier: { fontSize: 14, fontFamily: "Inter_400Regular" },
  connectedDate: { fontSize: 12, fontFamily: "Inter_400Regular" },
  disconnectBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, alignSelf: "flex-start" },
  disconnectText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  connectSection: { gap: 12 },
  connectTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.8 },
  connectButtons: { gap: 10 },
  connectBtn: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1, padding: 16 },
  connectBtnText: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium" },
  presetRow: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 12, borderWidth: 1, padding: 16 },
  connectImapBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderRadius: 12, padding: 16, marginTop: 8 },
  legalCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  legalRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  legalIconWrap: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  legalLabel: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  legalDivider: { height: StyleSheet.hairlineWidth, marginLeft: 60 },
  copyright: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center", paddingTop: 4 },
});
