import { useGetMessages, useGetMessage, useUpdateMessage, useGetAccounts } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { Feather, Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Alert,
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
import { useState, useCallback, useEffect, useRef } from "react";
import { format, isToday, isThisWeek, isThisYear } from "date-fns";
import * as Haptics from "expo-haptics";
import { ComposeModal, type ComposeDraft } from "@/components/ComposeModal";

function formatEmailDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return format(date, "h:mm a");
  if (isThisWeek(date, { weekStartsOn: 1 })) return format(date, "EEE");
  if (isThisYear(date)) return format(date, "MMM d");
  return format(date, "MMM d, yyyy");
}

const PAGE_SIZE = 20;

const API_BASE = process.env.EXPO_PUBLIC_API_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_API_DOMAIN}`
  : process.env.EXPO_PUBLIC_DOMAIN
    ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
    : "https://pinn-box-io.replit.app";

type TabKey = "all" | "unread" | "starred" | "sent" | "drafts" | "saved" | "spam" | "trash";

const TABS: { key: TabKey; label: string; folder?: string; filter?: string }[] = [
  { key: "all",     label: "All Mail" },
  { key: "unread",  label: "Unread",  filter: "unread" },
  { key: "starred", label: "Starred", filter: "starred" },
  { key: "sent",    label: "Sent",    folder: "Sent" },
  { key: "drafts",  label: "Drafts",  folder: "Drafts" },
  { key: "saved",   label: "Saved",   folder: "Archive" },
  { key: "spam",    label: "Spam",    folder: "Spam" },
  { key: "trash",   label: "Trash",   folder: "Trash" },
];

type Message = {
  id: number;
  accountName: string;
  accountColor: string;
  accountEmail: string;
  folder: string;
  subject: string;
  fromName: string;
  fromEmail: string;
  toList: string;
  ccList?: string | null;
  bodyText?: string | null;
  bodyHtml?: string | null;
  isRead: boolean;
  isStarred: boolean;
  hasAttachments: boolean;
  receivedAt: string;
  createdAt: string;
};

async function getAuthToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    return typeof localStorage !== "undefined" ? localStorage.getItem("commshub_session_token") : null;
  }
  const SecureStore = await import("expo-secure-store");
  return SecureStore.getItemAsync("commshub_session_token");
}

async function deleteMessage(id: number): Promise<void> {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE}/api/messages/${id}`, {
    method: "DELETE",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
  });
  if (!res.ok && res.status !== 204) throw new Error("Failed");
}

function MessageRow({
  message,
  onPress,
  onLongPress,
  isSelected,
  selectionMode,
}: {
  message: Message;
  onPress: () => void;
  onLongPress: () => void;
  isSelected: boolean;
  selectionMode: boolean;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.messageRow,
        {
          borderBottomColor: colors.border,
          backgroundColor: isSelected
            ? colors.primary + "18"
            : pressed
              ? colors.muted
              : colors.background,
          borderLeftColor: !message.isRead ? colors.primary : "transparent",
        },
      ]}
    >
      {/* Selection checkbox / unread dot */}
      <View style={styles.unreadDotCol}>
        {selectionMode ? (
          <View style={[
            styles.checkbox,
            {
              borderColor: isSelected ? colors.primary : colors.border,
              backgroundColor: isSelected ? colors.primary : "transparent",
            },
          ]}>
            {isSelected && <Feather name="check" size={10} color="#fff" />}
          </View>
        ) : (
          !message.isRead && (
            <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
          )
        )}
      </View>

      {/* Content */}
      <View style={styles.messageContent}>
        <View style={styles.messageTopRow}>
          <View style={styles.senderRow}>
            <Text
              style={[
                styles.senderName,
                { color: colors.foreground, fontFamily: message.isRead ? "Inter_500Medium" : "Inter_700Bold" },
              ]}
              numberOfLines={1}
            >
              {message.fromName}
            </Text>
            {message.hasAttachments && (
              <Feather name="paperclip" size={12} color={colors.mutedForeground} style={{ marginLeft: 4 }} />
            )}
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 0 }}>
            {message.accountName ? (
              <View style={[styles.accountBadge, { backgroundColor: (message.accountColor || "#888") + "22", flexDirection: "row", alignItems: "center", gap: 3 }]}>
                <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: message.accountColor || "#888" }} />
                <Text style={[styles.accountBadgeText, { color: message.accountColor || colors.mutedForeground }]}>
                  {message.accountName}
                </Text>
              </View>
            ) : null}
            <Text style={[styles.messageTime, { color: colors.mutedForeground }]}>
              {formatEmailDate(message.receivedAt)}
            </Text>
          </View>
        </View>

        <Text
          style={[
            styles.messageSubject,
            { color: colors.foreground, fontFamily: message.isRead ? "Inter_400Regular" : "Inter_600SemiBold" },
          ]}
          numberOfLines={1}
        >
          {message.subject}
        </Text>

        <Text style={[styles.messagePreview, { color: colors.mutedForeground }]} numberOfLines={2}>
          {message.bodyText || "No preview available"}
        </Text>
      </View>

      {message.isStarred && !selectionMode && (
        <Ionicons name="star" size={14} color="#f59e0b" style={{ marginTop: 2, flexShrink: 0 }} />
      )}
    </Pressable>
  );
}

function MessageDetail({
  messageId,
  onBack,
  onReply,
  onForward,
}: {
  messageId: number;
  onBack: () => void;
  onReply: (draft: ComposeDraft) => void;
  onForward: (draft: ComposeDraft) => void;
}) {
  const { data: message, isLoading } = useGetMessage(messageId);
  const updateMessage = useUpdateMessage();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const [bodyScale, setBodyScale] = useState(1);

  const receivedDate = isLoading ? new Date() : message ? new Date(message.receivedAt) : new Date();

  function toggleStar() {
    if (!message) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateMessage.mutate({ id: message.id, data: { isStarred: !message.isStarred } });
  }

  function handleReply() {
    if (!message) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const subject = message.subject.startsWith("Re:") ? message.subject : `Re: ${message.subject}`;
    onReply({
      to: message.fromEmail,
      subject,
      body: "",
      quotedMeta: `On ${format(receivedDate, "MMM d, yyyy 'at' h:mm a")}, ${message.fromName} <${message.fromEmail}> wrote:`,
      quotedText: message.bodyText || "",
    });
  }

  function handleForward() {
    if (!message) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const subject = message.subject.startsWith("Fwd:") ? message.subject : `Fwd: ${message.subject}`;
    onForward({
      to: "",
      subject,
      body: "",
      quotedMeta: `---------- Forwarded message ----------\nFrom: ${message.fromName} <${message.fromEmail}>\nDate: ${format(receivedDate, "MMM d, yyyy 'at' h:mm a")}\nSubject: ${message.subject}\nTo: ${message.toList}`,
      quotedText: message.bodyText || "",
    });
  }

  return (
    <View style={[styles.detailContainer, { backgroundColor: colors.background }]}>
      {/* Sticky toolbar — always visible at the top */}
      <View style={[styles.detailToolbar, { paddingTop: topPad + 4, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={styles.detailToolbarRow}>
          <Pressable onPress={onBack} style={styles.backButton}>
            <Feather name="arrow-left" size={20} color={colors.primary} />
            <Text style={[styles.backText, { color: colors.primary }]}>Inbox</Text>
          </Pressable>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            {message && (
              <>
                <Pressable onPress={handleReply} style={[styles.actionButton, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Feather name="corner-up-left" size={13} color={colors.primary} />
                  <Text style={[styles.actionText, { color: colors.primary }]}>Reply</Text>
                </Pressable>
                <Pressable onPress={handleForward} style={[styles.actionButton, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Feather name="corner-up-right" size={13} color={colors.primary} />
                  <Text style={[styles.actionText, { color: colors.primary }]}>Fwd</Text>
                </Pressable>
                <Pressable onPress={() => setBodyScale((v) => Math.max(0.8, Number((v - 0.1).toFixed(1))))} style={[styles.iconActionButton, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Feather name="zoom-out" size={14} color={colors.foreground} />
                </Pressable>
                <Pressable onPress={() => setBodyScale((v) => Math.min(1.6, Number((v + 0.1).toFixed(1))))} style={[styles.iconActionButton, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Feather name="zoom-in" size={14} color={colors.foreground} />
                </Pressable>
                <Pressable onPress={toggleStar} style={styles.starButton}>
                  <Ionicons name={message.isStarred ? "star" : "star-outline"} size={20} color={message.isStarred ? "#f59e0b" : colors.mutedForeground} />
                </Pressable>
              </>
            )}
          </View>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingCenter}><ActivityIndicator color={colors.primary} size="large" /></View>
      ) : !message ? null : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 20, paddingTop: 16 }}
          showsVerticalScrollIndicator={true}
        >
          <Text style={[styles.detailSubject, { color: colors.foreground }]}>{message.subject}</Text>

          <View style={[styles.senderBlock, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.senderBlockAvatar, { backgroundColor: colors.accent }]}>
              <Text style={[styles.senderAvatarText, { color: colors.primary, fontSize: 16 }]}>
                {message.fromName.substring(0, 2).toUpperCase()}
              </Text>
            </View>
            <View style={styles.senderBlockInfo}>
              <Text style={[styles.senderBlockName, { color: colors.foreground }]}>{message.fromName}</Text>
              <Text style={[styles.senderBlockEmail, { color: colors.mutedForeground }]}>{message.fromEmail}</Text>
              <Text style={[styles.senderBlockDate, { color: colors.mutedForeground }]}>{format(receivedDate, "MMM d, yyyy 'at' h:mm a")}</Text>
            </View>
          </View>

          <View style={[styles.metaRow, { borderColor: colors.border }]}>
            <View style={styles.metaItem}>
              <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>To</Text>
              <Text style={[styles.metaValue, { color: colors.foreground }]} numberOfLines={2}>{message.toList}</Text>
            </View>
            {message.ccList && (
              <View style={styles.metaItem}>
                <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>CC</Text>
                <Text style={[styles.metaValue, { color: colors.foreground }]} numberOfLines={2}>{message.ccList}</Text>
              </View>
            )}
            <View style={styles.metaItem}>
              <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>Account</Text>
              <View style={[styles.accountBadge, { backgroundColor: message.accountColor + "20" }]}>
                <Text style={[styles.accountBadgeText, { color: message.accountColor }]}>{message.accountName}</Text>
              </View>
            </View>
          </View>

          <View style={[styles.bodyContainer, { borderTopColor: colors.border }]}>
            <Text style={[styles.bodyText, { color: colors.foreground, fontSize: 15 * bodyScale, lineHeight: 24 * bodyScale }]}>
              {message.bodyText || "No message content."}
            </Text>
          </View>

          {/* Gmail-style reply/forward buttons at the bottom */}
          <View style={[styles.replyForwardRow, { borderTopColor: colors.border }]}>
            <Pressable
              onPress={handleReply}
              style={({ pressed }) => [styles.replyForwardBtn, { borderColor: colors.border, backgroundColor: pressed ? colors.muted : colors.background }]}
            >
              <Feather name="corner-up-left" size={15} color={colors.foreground} />
              <Text style={[styles.replyForwardText, { color: colors.foreground }]}>Reply</Text>
            </Pressable>
            <Pressable
              onPress={handleForward}
              style={({ pressed }) => [styles.replyForwardBtn, { borderColor: colors.border, backgroundColor: pressed ? colors.muted : colors.background }]}
            >
              <Feather name="corner-up-right" size={15} color={colors.foreground} />
              <Text style={[styles.replyForwardText, { color: colors.foreground }]}>Forward</Text>
            </Pressable>
          </View>

          {message.hasAttachments && message.attachments && message.attachments.length > 0 && (
            <View style={[styles.attachmentsSection, { borderTopColor: colors.border }]}>
              <Text style={[styles.attachmentsTitle, { color: colors.mutedForeground }]}>Attachments ({message.attachments.length})</Text>
              {message.attachments.map((att) => (
                <View key={att.id} style={[styles.attachmentRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Feather name="paperclip" size={14} color={colors.mutedForeground} />
                  <Text style={[styles.attachmentName, { color: colors.foreground }]} numberOfLines={1}>{att.filename}</Text>
                  <Text style={[styles.attachmentSize, { color: colors.mutedForeground }]}>{(att.size / 1024).toFixed(0)} KB</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

export default function InboxScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const [allMessages, setAllMessages] = useState<Message[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [composeVisible, setComposeVisible] = useState(false);
  const [composeDraft, setComposeDraft] = useState<ComposeDraft | undefined>();

  // Multi-select / delete
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  const offsetRef = useRef(offset);
  offsetRef.current = offset;

  const currentTab = TABS.find(t => t.key === activeTab)!;
  const folderParam = currentTab.folder;

  const { data, isLoading, isFetching, refetch } = useGetMessages({ limit: PAGE_SIZE, offset, folder: folderParam } as any);
  const { data: accounts, isLoading: accountsLoading } = useGetAccounts();
  const noAccountsConnected = !accountsLoading && (!accounts || accounts.length === 0);
  const updateMessage = useUpdateMessage();

  useEffect(() => {
    setOffset(0);
    setAllMessages([]);
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, [activeTab]);

  useEffect(() => {
    if (!data?.messages) return;
    if (offsetRef.current === 0) {
      setAllMessages(data.messages);
    } else {
      setAllMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const newOnes = data.messages.filter((m: Message) => !existingIds.has(m.id));
        return [...prev, ...newOnes];
      });
    }
  }, [data]);

  const filteredMessages = allMessages.filter(msg => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!msg.subject.toLowerCase().includes(q) && !msg.fromName.toLowerCase().includes(q)) return false;
    }
    if (currentTab.filter === "unread") return !msg.isRead;
    if (currentTab.filter === "starred") return msg.isStarred;
    return true;
  });

  const total = data?.total ?? 0;
  const hasMore = allMessages.length < total;

  const handlePressMessage = useCallback((msg: Message) => {
    if (selectionMode) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSelectedIds(prev => {
        const next = new Set(prev);
        if (next.has(msg.id)) next.delete(msg.id); else next.add(msg.id);
        return next;
      });
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedId(msg.id);
    if (!msg.isRead) updateMessage.mutate({ id: msg.id, data: { isRead: true } });
  }, [selectionMode, updateMessage]);

  const handleLongPress = useCallback((msg: Message) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectionMode(true);
    setSelectedIds(new Set([msg.id]));
  }, []);

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    Alert.alert(
      "Delete Messages",
      `Delete ${count} message${count > 1 ? "s" : ""}? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setIsDeleting(true);
            const ids = Array.from(selectedIds);
            try {
              await Promise.all(ids.map(id => deleteMessage(id)));
              setAllMessages(prev => prev.filter(m => !ids.includes(m.id)));
              exitSelectionMode();
            } catch {
              Alert.alert("Error", "Some messages could not be deleted.");
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setOffset(0);
    await refetch();
    setIsRefreshing(false);
  }, [refetch]);

  const handleLoadMore = useCallback(() => {
    if (!isFetching && hasMore) setOffset((prev) => prev + PAGE_SIZE);
  }, [isFetching, hasMore]);

  function openCompose(draft?: ComposeDraft) {
    setComposeDraft(draft);
    setComposeVisible(true);
  }

  if (selectedId !== null) {
    return (
      <>
        <MessageDetail
          messageId={selectedId}
          onBack={() => setSelectedId(null)}
          onReply={(draft) => { setSelectedId(null); openCompose(draft); }}
          onForward={(draft) => { setSelectedId(null); openCompose(draft); }}
        />
        <ComposeModal visible={composeVisible} onClose={() => setComposeVisible(false)} initialDraft={composeDraft} />
      </>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.listHeader, { paddingTop: topPad + 12, backgroundColor: colors.background }]}>
        {selectionMode ? (
          <>
            <Pressable onPress={exitSelectionMode} style={styles.cancelSelectionBtn}>
              <Feather name="x" size={20} color={colors.foreground} />
            </Pressable>
            <Text style={[styles.selectionCount, { color: colors.foreground }]}>
              {selectedIds.size} selected
            </Text>
            <Pressable
              onPress={handleDeleteSelected}
              disabled={selectedIds.size === 0 || isDeleting}
              style={[styles.deleteBtn, { backgroundColor: isDeleting ? colors.muted : "#ef4444" }]}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Feather name="trash-2" size={15} color="#fff" />
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </>
              )}
            </Pressable>
          </>
        ) : (
          <>
            <Text style={[styles.screenTitle, { color: colors.foreground }]}>Inbox</Text>
            <Pressable onPress={() => openCompose()} style={[styles.composeBtn, { backgroundColor: colors.primary }]}>
              <Feather name="edit-2" size={15} color="#fff" />
              <Text style={styles.composeBtnText}>Compose</Text>
            </Pressable>
          </>
        )}
      </View>

      {/* Search */}
      {!selectionMode && (
        <View style={[styles.searchWrapper, { backgroundColor: colors.background }]}>
          <View style={[styles.searchBar, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Feather name="search" size={15} color={colors.mutedForeground} />
            <TextInput
              style={[styles.searchInput, { color: colors.foreground }]}
              placeholder="Search emails..."
              placeholderTextColor={colors.mutedForeground}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
          </View>
        </View>
      )}

      {/* Tabs */}
      {!selectionMode && (
        <View style={[styles.tabsWrapper, { backgroundColor: colors.background }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsContent}
          >
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  onPress={() => { setActiveTab(tab.key); setSearchQuery(""); }}
                  style={[
                    styles.tabPill,
                    isActive
                      ? { backgroundColor: colors.primary }
                      : { backgroundColor: colors.muted },
                  ]}
                >
                  <Text style={[
                    styles.tabPillText,
                    { color: isActive ? "#ffffff" : colors.mutedForeground },
                    isActive && { fontFamily: "Inter_600SemiBold" },
                  ]}>
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Hint when in selection mode */}
      {selectionMode && (
        <View style={[styles.selectionHint, { borderBottomColor: colors.border }]}>
          <Text style={[styles.selectionHintText, { color: colors.mutedForeground }]}>
            Tap messages to select · Long-press to start selecting
          </Text>
        </View>
      )}

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {/* Message list */}
      {isLoading && allMessages.length === 0 ? (
        <View style={styles.loadingCenter}><ActivityIndicator color={colors.primary} size="large" /></View>
      ) : filteredMessages.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="inbox" size={48} color={colors.mutedForeground} />
          {noAccountsConnected ? (
            <>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No accounts connected</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Connect Gmail or Outlook in the Accounts tab.</Text>
            </>
          ) : (
            <>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>All caught up</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No messages found.</Text>
            </>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredMessages}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <MessageRow
              message={item}
              onPress={() => handlePressMessage(item)}
              onLongPress={() => handleLongPress(item)}
              isSelected={selectedIds.has(item.id)}
              selectionMode={selectionMode}
            />
          )}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            isFetching && allMessages.length > 0 ? (
              <View style={styles.footerLoader}><ActivityIndicator color={colors.primary} size="small" /></View>
            ) : hasMore ? (
              <Pressable style={styles.loadMoreButton} onPress={handleLoadMore}>
                <Text style={[styles.loadMoreText, { color: colors.primary }]}>Load more</Text>
              </Pressable>
            ) : null
          }
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      <ComposeModal visible={composeVisible} onClose={() => setComposeVisible(false)} initialDraft={composeDraft} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listHeader: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  screenTitle: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5, flex: 1 },
  composeBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  composeBtnText: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  cancelSelectionBtn: { padding: 4 },
  selectionCount: { flex: 1, fontSize: 16, fontFamily: "Inter_600SemiBold" },
  deleteBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  deleteBtnText: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  selectionHint: { paddingHorizontal: 20, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  selectionHintText: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center" },
  searchWrapper: { paddingHorizontal: 16, paddingBottom: 10 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", padding: 0 },
  tabsWrapper: { paddingBottom: 10 },
  tabsContent: { paddingHorizontal: 16, gap: 6, flexDirection: "row" },
  tabPill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  tabPillText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  divider: { height: StyleSheet.hairlineWidth },
  loadingCenter: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, paddingBottom: 80 },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", marginTop: 8 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 32 },
  footerLoader: { paddingVertical: 16, alignItems: "center" },
  loadMoreButton: { paddingVertical: 14, alignItems: "center" },
  loadMoreText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  messageRow: {
    flexDirection: "row",
    paddingVertical: 14,
    paddingRight: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: 3,
    alignItems: "flex-start",
  },
  unreadDotCol: { width: 24, alignItems: "center", paddingTop: 5 },
  unreadDot: { width: 7, height: 7, borderRadius: 4 },
  checkbox: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  messageContent: { flex: 1, gap: 3 },
  messageTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  senderRow: { flexDirection: "row", alignItems: "center", flex: 1, marginRight: 8 },
  senderName: { fontSize: 14, flexShrink: 1 },
  messageTime: { fontSize: 11, fontFamily: "Inter_400Regular", flexShrink: 0 },
  messageSubject: { fontSize: 13 },
  messagePreview: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  accountBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, flexShrink: 0 },
  accountBadgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  detailContainer: { flex: 1 },
  detailToolbar: {
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  detailToolbarRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 6,
  },
  detailHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  backButton: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4 },
  backText: { fontSize: 16, fontFamily: "Inter_500Medium" },
  starButton: { padding: 8 },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" },
  actionButton: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  actionText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  iconActionButton: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  detailSubject: { fontSize: 22, fontFamily: "Inter_700Bold", lineHeight: 30, marginBottom: 16 },
  senderBlock: { flexDirection: "row", alignItems: "flex-start", borderRadius: 12, borderWidth: 1, padding: 12, gap: 12, marginBottom: 16 },
  senderBlockAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  senderBlockInfo: { flex: 1, gap: 2 },
  senderBlockName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  senderBlockEmail: { fontSize: 12, fontFamily: "Inter_400Regular" },
  senderBlockDate: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  senderAvatarText: { fontFamily: "Inter_600SemiBold" },
  metaRow: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, marginBottom: 16, gap: 8 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  metaLabel: { fontSize: 12, fontFamily: "Inter_500Medium", width: 48 },
  metaValue: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },
  bodyContainer: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 16, marginBottom: 16 },
  bodyText: { fontFamily: "Inter_400Regular", lineHeight: 24 },
  replyForwardRow: { flexDirection: "row", gap: 12, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 16, marginBottom: 16 },
  replyForwardBtn: { flexDirection: "row", alignItems: "center", gap: 7, borderWidth: 1, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 10 },
  replyForwardText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  attachmentsSection: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 16, gap: 8 },
  attachmentsTitle: { fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 4 },
  attachmentRow: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  attachmentName: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  attachmentSize: { fontSize: 11, fontFamily: "Inter_400Regular", flexShrink: 0 },
});
