import { useSearchAll } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { Feather } from "@expo/vector-icons";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";

type SearchMessage = {
  id: number;
  accountName: string;
  accountColor: string;
  subject: string;
  fromName: string;
  fromEmail: string;
  bodyText?: string | null;
  receivedAt: string;
  isRead: boolean;
};

type SearchContact = {
  id: number;
  name: string;
  email: string;
  company?: string | null;
  messageCount: number;
};

function MessageResult({ message }: { message: SearchMessage }) {
  const colors = useColors();
  return (
    <View style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.resultHeader}>
        <Text style={[styles.resultSubject, { color: colors.foreground }]} numberOfLines={2}>
          {message.subject}
        </Text>
        <Text style={[styles.resultTime, { color: colors.mutedForeground }]}>
          {formatDistanceToNow(new Date(message.receivedAt), { addSuffix: false })} ago
        </Text>
      </View>
      <View style={styles.resultMeta}>
        <Text style={[styles.resultFrom, { color: colors.foreground }]}>{message.fromName}</Text>
        <View style={[styles.accountBadge, { backgroundColor: message.accountColor + "20" }]}>
          <Text style={[styles.accountBadgeText, { color: message.accountColor }]}>{message.accountName}</Text>
        </View>
      </View>
      {message.bodyText && (
        <Text style={[styles.resultPreview, { color: colors.mutedForeground }]} numberOfLines={2}>
          {message.bodyText}
        </Text>
      )}
    </View>
  );
}

function ContactResult({ contact }: { contact: SearchContact }) {
  const colors = useColors();
  const initials = contact.name.substring(0, 2).toUpperCase();

  return (
    <View style={[styles.contactCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.contactAvatar, { backgroundColor: colors.accent }]}>
        <Text style={[styles.contactAvatarText, { color: colors.primary }]}>{initials}</Text>
      </View>
      <View style={styles.contactInfo}>
        <Text style={[styles.contactName, { color: colors.foreground }]} numberOfLines={1}>
          {contact.name}
        </Text>
        <Text style={[styles.contactEmail, { color: colors.mutedForeground }]} numberOfLines={1}>
          {contact.email}
        </Text>
        {contact.company && (
          <Text style={[styles.contactCompany, { color: colors.mutedForeground }]} numberOfLines={1}>
            {contact.company}
          </Text>
        )}
      </View>
      <View style={styles.messageCount}>
        <Text style={[styles.messageCountNum, { color: colors.primary }]}>{contact.messageCount}</Text>
        <Text style={[styles.messageCountLabel, { color: colors.mutedForeground }]}>msgs</Text>
      </View>
    </View>
  );
}

export default function SearchScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [query, setQuery] = useState("");

  const enabled = query.trim().length >= 2;
  const { data, isLoading } = useSearchAll(
    { q: query.trim(), type: "all" },
    { query: { enabled } }
  );

  const noResults =
    !isLoading &&
    enabled &&
    data &&
    data.messages.length === 0 &&
    data.contacts.length === 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Text style={[styles.screenTitle, { color: colors.foreground }]}>Search</Text>
        <View style={[styles.searchBar, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search messages, contacts..."
            placeholderTextColor={colors.mutedForeground}
            style={[styles.searchInput, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
            returnKeyType="search"
            autoFocus={false}
            testID="search-input"
          />
          {query.length > 0 && (
            <Feather
              name="x-circle"
              size={16}
              color={colors.mutedForeground}
              onPress={() => setQuery("")}
            />
          )}
        </View>
      </View>

      {!enabled ? (
        <View style={styles.emptyState}>
          <Feather name="search" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Search everything</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Enter at least 2 characters to search messages and contacts
          </Text>
        </View>
      ) : isLoading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : noResults ? (
        <View style={styles.emptyState}>
          <Feather name="file-text" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No results</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Nothing found for "{query}"
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100, gap: 20 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {data && data.messages.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Feather name="mail" size={14} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                  Messages ({data.totalMessages})
                </Text>
              </View>
              {data.messages.map((msg) => (
                <MessageResult key={msg.id} message={msg} />
              ))}
            </View>
          )}

          {data && data.contacts.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Feather name="users" size={14} color="#10b981" />
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                  Contacts ({data.totalContacts})
                </Text>
              </View>
              {data.contacts.map((c) => (
                <ContactResult key={c.id} contact={c} />
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
  loadingCenter: { flex: 1, alignItems: "center", justifyContent: "center" },
  section: { gap: 10 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  resultCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  resultHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  resultSubject: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  resultTime: { fontSize: 11, fontFamily: "Inter_400Regular", flexShrink: 0 },
  resultMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  resultFrom: { fontSize: 12, fontFamily: "Inter_500Medium" },
  accountBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  accountBadgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  resultPreview: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  contactCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  contactAvatar: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  contactAvatarText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  contactInfo: { flex: 1, minWidth: 0 },
  contactName: { fontSize: 14, fontFamily: "Inter_500Medium" },
  contactEmail: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  contactCompany: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  messageCount: { alignItems: "center", flexShrink: 0 },
  messageCountNum: { fontSize: 18, fontFamily: "Inter_700Bold" },
  messageCountLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
});
