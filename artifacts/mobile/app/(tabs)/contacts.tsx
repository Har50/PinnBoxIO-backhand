import { useGetContacts, useSearchAll } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { Feather } from "@expo/vector-icons";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import * as Haptics from "expo-haptics";

type Contact = {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  avatarUrl?: string | null;
  notes?: string | null;
  messageCount: number;
  unreadCount: number;
  lastMessageAt?: string | null;
  createdAt: string;
};

function ContactRow({ contact, onPress }: { contact: Contact; onPress: () => void }) {
  const colors = useColors();
  const initials = contact.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.contactRow,
        { borderBottomColor: colors.border, backgroundColor: pressed ? colors.muted : "transparent" },
      ]}
      testID={`contact-row-${contact.id}`}
    >
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
      <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
    </Pressable>
  );
}

function ContactDetail({ contact, onBack }: { contact: Contact; onBack: () => void }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data: searchData, isLoading: historyLoading } = useSearchAll(
    { q: contact.email, type: "messages" },
    { query: { enabled: !!contact.email } }
  );
  const messageHistory = searchData?.messages ?? [];

  const initials = contact.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <ScrollView
      style={[styles.detailContainer, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topPad + 8, paddingBottom: 100, paddingHorizontal: 20 }}
      showsVerticalScrollIndicator={false}
    >
      <Pressable onPress={onBack} style={styles.backButton}>
        <Feather name="arrow-left" size={20} color={colors.primary} />
        <Text style={[styles.backText, { color: colors.primary }]}>Contacts</Text>
      </Pressable>

      <View style={styles.profileSection}>
        <View style={[styles.profileAvatar, { backgroundColor: colors.accent }]}>
          <Text style={[styles.profileAvatarText, { color: colors.primary }]}>{initials}</Text>
        </View>
        <Text style={[styles.profileName, { color: colors.foreground }]}>{contact.name}</Text>
        {contact.company && (
          <Text style={[styles.profileCompany, { color: colors.mutedForeground }]}>{contact.company}</Text>
        )}
      </View>

      <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.mutedForeground }]}>Contact Info</Text>
        <View style={styles.infoRow}>
          <View style={[styles.infoIcon, { backgroundColor: colors.accent }]}>
            <Feather name="mail" size={14} color={colors.primary} />
          </View>
          <View style={styles.infoContent}>
            <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Email</Text>
            <Text style={[styles.infoValue, { color: colors.foreground }]}>{contact.email}</Text>
          </View>
        </View>
        {contact.phone && (
          <View style={styles.infoRow}>
            <View style={[styles.infoIcon, { backgroundColor: "#f0fdf4" }]}>
              <Feather name="phone" size={14} color="#10b981" />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Phone</Text>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>{contact.phone}</Text>
            </View>
          </View>
        )}
      </View>

      <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 12 }]}>
        <Text style={[styles.cardTitle, { color: colors.mutedForeground }]}>Activity</Text>
        <View style={styles.infoRow}>
          <View style={[styles.infoIcon, { backgroundColor: "#eff6ff" }]}>
            <Feather name="message-square" size={14} color="#3b82f6" />
          </View>
          <View style={styles.infoContent}>
            <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Total Messages</Text>
            <Text style={[styles.infoValue, { color: colors.foreground }]}>{contact.messageCount}</Text>
          </View>
        </View>
        {contact.lastMessageAt && (
          <View style={styles.infoRow}>
            <View style={[styles.infoIcon, { backgroundColor: "#fffbeb" }]}>
              <Feather name="clock" size={14} color="#f59e0b" />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Last Message</Text>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>
                {formatDistanceToNow(new Date(contact.lastMessageAt), { addSuffix: true })}
              </Text>
            </View>
          </View>
        )}
      </View>

      {contact.notes && (
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 12 }]}>
          <Text style={[styles.cardTitle, { color: colors.mutedForeground }]}>Notes</Text>
          <Text style={[styles.notesText, { color: colors.foreground }]}>{contact.notes}</Text>
        </View>
      )}

      <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 12 }]}>
        <Text style={[styles.cardTitle, { color: colors.mutedForeground }]}>Message History</Text>
        {historyLoading ? (
          <ActivityIndicator color={colors.primary} size="small" style={{ marginVertical: 12 }} />
        ) : messageHistory.length === 0 ? (
          <Text style={[styles.emptyHistoryText, { color: colors.mutedForeground }]}>No messages found</Text>
        ) : (
          messageHistory.map((msg) => (
            <View key={msg.id} style={[styles.historyRow, { borderTopColor: colors.border }]}>
              <View style={styles.historyRowTop}>
                <Text style={[styles.historySubject, { color: colors.foreground }]} numberOfLines={1}>
                  {msg.subject}
                </Text>
                <Text style={[styles.historyTime, { color: colors.mutedForeground }]}>
                  {formatDistanceToNow(new Date(msg.receivedAt), { addSuffix: true })}
                </Text>
              </View>
              <View style={styles.historyMeta}>
                <Text style={[styles.historyFrom, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {msg.fromName}
                </Text>
                {msg.accountColor && (
                  <View style={[styles.historyBadge, { backgroundColor: msg.accountColor + "20" }]}>
                    <Text style={[styles.historyBadgeText, { color: msg.accountColor }]}>{msg.accountName}</Text>
                  </View>
                )}
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

export default function ContactsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [search, setSearch] = useState("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  const debouncedSearch = search.length >= 2 ? search : undefined;
  const { data: contacts, isLoading, refetch } = useGetContacts({ q: debouncedSearch });

  const handlePress = useCallback((c: Contact) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedContact(c);
  }, []);

  if (selectedContact) {
    return <ContactDetail contact={selectedContact} onBack={() => setSelectedContact(null)} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Text style={[styles.screenTitle, { color: colors.foreground }]}>Contacts</Text>
        <View style={[styles.searchBar, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Feather name="search" size={15} color={colors.mutedForeground} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search contacts..."
            placeholderTextColor={colors.mutedForeground}
            style={[styles.searchInput, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
            returnKeyType="search"
            testID="search-input"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")}>
              <Feather name="x" size={15} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : !contacts || contacts.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="users" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No contacts found</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            {search ? "Try a different search" : "Contacts will appear here"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={contacts}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <ContactRow contact={item} onPress={() => handlePress(item)} />}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={refetch} tintColor={colors.primary} />
          }
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />
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
  searchInput: { flex: 1, fontSize: 14, height: 22 },
  loadingCenter: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, paddingBottom: 80 },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", marginTop: 8 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
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
  detailContainer: { flex: 1 },
  backButton: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4, marginBottom: 24 },
  backText: { fontSize: 16, fontFamily: "Inter_500Medium" },
  profileSection: { alignItems: "center", gap: 8, marginBottom: 28 },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  profileAvatarText: { fontSize: 28, fontFamily: "Inter_700Bold" },
  profileName: { fontSize: 22, fontFamily: "Inter_700Bold" },
  profileCompany: { fontSize: 14, fontFamily: "Inter_400Regular" },
  infoCard: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 12 },
  cardTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.8 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  infoIcon: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  infoValue: { fontSize: 14, fontFamily: "Inter_500Medium", marginTop: 2 },
  notesText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
  emptyHistoryText: { fontSize: 13, fontFamily: "Inter_400Regular", marginVertical: 8 },
  historyRow: { paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, gap: 4 },
  historyRowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  historySubject: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  historyTime: { fontSize: 11, fontFamily: "Inter_400Regular", flexShrink: 0 },
  historyMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  historyFrom: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular" },
  historyBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, flexShrink: 0 },
  historyBadgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
});
