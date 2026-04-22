import { useColors } from "@/hooks/useColors";
import { Feather } from "@expo/vector-icons";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState, useEffect, useRef } from "react";
import { formatDistanceToNow } from "date-fns";
import { getApiBaseUrl } from "@workspace/api-client-react";

async function getAuthToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    return typeof localStorage !== "undefined" ? localStorage.getItem("commshub_session_token") : null;
  }
  const SecureStore = await import("expo-secure-store");
  return SecureStore.getItemAsync("commshub_session_token");
}

interface SearchResults {
  query: string;
  messages: any[];
  contacts: any[];
  whatsappMessages: any[];
  totalMessages: number;
  totalContacts: number;
  totalWhatsapp: number;
}

function useUnifiedSearch(q: string) {
  const [data, setData] = useState<SearchResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const baseUrl = getApiBaseUrl ? getApiBaseUrl() : "";
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (q.length < 2) { setData(null); return; }
    timerRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const token = await getAuthToken();
        const res = await fetch(`${baseUrl}/api/search?q=${encodeURIComponent(q)}&type=all`, {
          credentials: "include",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) setData(await res.json());
      } catch {}
      setIsLoading(false);
    }, 350);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [q, baseUrl]);

  return { data, isLoading };
}

function SectionHeader({ icon, label, color }: { icon: string; label: string; color: string }) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
      <Feather name={icon as any} size={14} color={color} />
      <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.foreground }}>{label}</Text>
    </View>
  );
}

export default function SearchScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [query, setQuery] = useState("");
  const { data, isLoading } = useUnifiedSearch(query);

  const enabled = query.trim().length >= 2;
  const hasResults = data && (data.messages.length > 0 || data.contacts.length > 0 || data.whatsappMessages.length > 0);
  const openGoogleSearch = () => {
    Linking.openURL(`https://www.google.com/search?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Text style={[styles.screenTitle, { color: colors.foreground }]}>Search</Text>
        <View style={[styles.searchBar, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search emails, messages, WhatsApp, contacts..."
            placeholderTextColor={colors.mutedForeground}
            style={[styles.searchInput, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
            returnKeyType="search"
            autoFocus={false}
            testID="search-input"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")}>
              <Feather name="x-circle" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {!enabled ? (
        <View style={styles.emptyState}>
          <Feather name="search" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Search everything</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Enter at least 2 characters to search database records, emails, messages, WhatsApp, and contacts
          </Text>
        </View>
      ) : isLoading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : !hasResults ? (
        <View style={styles.emptyState}>
          <Feather name="file-text" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No results</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Nothing local found for "{query}". I checked stored messages, live connected emails, contacts, and WhatsApp.
          </Text>
          <TouchableOpacity
            onPress={openGoogleSearch}
            style={[styles.googleButton, { backgroundColor: colors.primary }]}
            activeOpacity={0.85}
          >
            <Feather name="external-link" size={15} color={colors.primaryForeground} />
            <Text style={[styles.googleButtonText, { color: colors.primaryForeground }]}>Search Google instead</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100, gap: 24, paddingTop: 8 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {data!.messages.length > 0 && (
            <View>
              <SectionHeader icon="mail" label={`Messages (${data!.totalMessages})`} color={colors.primary} />
              {data!.messages.map((msg: any) => (
                <View key={msg.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.cardHeader}>
                    <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={2}>{msg.subject}</Text>
                    {msg.receivedAt && (
                      <Text style={[styles.cardTime, { color: colors.mutedForeground }]}>
                        {formatDistanceToNow(new Date(msg.receivedAt), { addSuffix: false })} ago
                      </Text>
                    )}
                  </View>
                  <Text style={[styles.cardSub, { color: colors.mutedForeground }]} numberOfLines={1}>
                    {msg.fromName} &lt;{msg.fromEmail}&gt;
                  </Text>
                  {msg.bodyText && (
                    <Text style={[styles.cardPreview, { color: colors.mutedForeground }]} numberOfLines={2}>
                      {msg.bodyText}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {data!.whatsappMessages.length > 0 && (
            <View>
              <SectionHeader icon="message-circle" label={`WhatsApp (${data!.totalWhatsapp})`} color="#25D366" />
              {data!.whatsappMessages.map((m: any) => (
                <View key={m.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: "#25D366", borderLeftWidth: 3 }]}>
                  <View style={styles.cardHeader}>
                    <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={1}>{m.chatName}</Text>
                    {m.timestamp && (
                      <Text style={[styles.cardTime, { color: colors.mutedForeground }]}>
                        {formatDistanceToNow(new Date(m.timestamp), { addSuffix: false })} ago
                      </Text>
                    )}
                  </View>
                  {m.fromMe && <Text style={[styles.cardSub, { color: "#25D366" }]}>You</Text>}
                  <Text style={[styles.cardPreview, { color: colors.mutedForeground }]} numberOfLines={2}>{m.text}</Text>
                </View>
              ))}
            </View>
          )}

          {data!.contacts.length > 0 && (
            <View>
              <SectionHeader icon="users" label={`Contacts (${data!.totalContacts})`} color="#10b981" />
              {data!.contacts.map((c: any) => (
                <View key={c.id} style={[styles.contactCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
                    <Text style={[styles.avatarText, { color: colors.primary }]}>{c.name.substring(0, 2).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={1}>{c.name}</Text>
                    <Text style={[styles.cardSub, { color: colors.mutedForeground }]} numberOfLines={1}>{c.email}</Text>
                    {c.company && <Text style={[styles.cardSub, { color: colors.mutedForeground }]} numberOfLines={1}>{c.company}</Text>}
                  </View>
                  <View style={{ alignItems: "center" }}>
                    <Text style={[{ fontSize: 18, fontFamily: "Inter_700Bold", color: colors.primary }]}>{c.messageCount}</Text>
                    <Text style={[{ fontSize: 10, fontFamily: "Inter_400Regular", color: colors.mutedForeground }]}>msgs</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12, gap: 12 },
  screenTitle: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15, height: 22 },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingBottom: 80,
    gap: 8,
  },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", marginTop: 8 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  googleButton: {
    marginTop: 12,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  googleButtonText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  loadingCenter: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 4,
    marginBottom: 10,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  cardTitle: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  cardTime: { fontSize: 11, fontFamily: "Inter_400Regular", flexShrink: 0 },
  cardSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  cardPreview: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  contactCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  avatarText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
