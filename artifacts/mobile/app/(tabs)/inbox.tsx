import { useGetMessages, useGetMessage, useUpdateMessage } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { Feather, Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, FlatList, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState, useCallback, useEffect, useRef } from "react";
import { formatDistanceToNow, format } from "date-fns";
import * as Haptics from "expo-haptics";
import { ComposeModal, type ComposeDraft } from "@/components/ComposeModal";

const PAGE_SIZE = 20;

const FOLDERS = ["All", "Inbox", "Sent", "Drafts", "Archive", "Trash", "Spam"] as const;
type Folder = (typeof FOLDERS)[number];

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

function MessageRow({ message, onPress }: { message: Message; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.messageRow,
        { borderBottomColor: colors.border, backgroundColor: pressed ? colors.muted : colors.background },
        !message.isRead && { borderLeftWidth: 3, borderLeftColor: colors.primary },
      ]}
    >
      <View style={styles.messageLeft}>
        <View style={[styles.senderAvatar, { backgroundColor: colors.accent }]}>
          <Text style={[styles.senderAvatarText, { color: colors.primary }]}>
            {message.fromName.substring(0, 2).toUpperCase()}
          </Text>
        </View>
      </View>
      <View style={styles.messageContent}>
        <View style={styles.messageTopRow}>
          <Text style={[styles.senderName, { color: colors.foreground, fontFamily: message.isRead ? "Inter_400Regular" : "Inter_600SemiBold" }]} numberOfLines={1}>
            {message.fromName}
          </Text>
          <Text style={[styles.messageTime, { color: colors.mutedForeground }]}>
            {formatDistanceToNow(new Date(message.receivedAt), { addSuffix: false })}
          </Text>
        </View>
        <Text style={[styles.messageSubject, { color: colors.foreground, fontFamily: message.isRead ? "Inter_400Regular" : "Inter_500Medium" }]} numberOfLines={1}>
          {message.subject}
        </Text>
        <View style={styles.messageBottomRow}>
          <Text style={[styles.messagePreview, { color: colors.mutedForeground }]} numberOfLines={1}>
            {message.bodyText || "No preview available"}
          </Text>
          <View style={[styles.accountBadge, { backgroundColor: message.accountColor + "20" }]}>
            <Text style={[styles.accountBadgeText, { color: message.accountColor }]}>{message.accountName}</Text>
          </View>
        </View>
      </View>
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

  if (isLoading) {
    return (
      <View style={[styles.detailContainer, { backgroundColor: colors.background, paddingTop: topPad + 8 }]}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Feather name="arrow-left" size={20} color={colors.primary} />
          <Text style={[styles.backText, { color: colors.primary }]}>Inbox</Text>
        </Pressable>
        <View style={styles.loadingCenter}><ActivityIndicator color={colors.primary} size="large" /></View>
      </View>
    );
  }

  if (!message) return null;

  function toggleStar() {
    if (!message) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateMessage.mutate({ id: message.id, data: { isStarred: !message.isStarred } });
  }

  const receivedDate = new Date(message.receivedAt);

  function handleReply() {
    if (!message) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const subject = message.subject.startsWith("Re:") ? message.subject : `Re: ${message.subject}`;
    const body = `\n\nOn ${format(receivedDate, "MMM d, yyyy 'at' h:mm a")}, ${message.fromName} wrote:\n${message.bodyText || ""}`;
    onReply({ to: message.fromEmail, subject, body });
  }

  function handleForward() {
    if (!message) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const subject = message.subject.startsWith("Fwd:") ? message.subject : `Fwd: ${message.subject}`;
    const body = `\n\nForwarded message\nFrom: ${message.fromName} <${message.fromEmail}>\nDate: ${format(receivedDate, "MMM d, yyyy 'at' h:mm a")}\nSubject: ${message.subject}\nTo: ${message.toList}\n\n${message.bodyText || ""}`;
    onForward({ to: "", subject, body });
  }

  return (
    <ScrollView
      style={[styles.detailContainer, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topPad + 8, paddingBottom: 100, paddingHorizontal: 20 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.detailHeader}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Feather name="arrow-left" size={20} color={colors.primary} />
          <Text style={[styles.backText, { color: colors.primary }]}>Inbox</Text>
        </Pressable>
        <Pressable onPress={toggleStar} style={styles.starButton}>
          <Ionicons name={message.isStarred ? "star" : "star-outline"} size={22} color={message.isStarred ? "#f59e0b" : colors.mutedForeground} />
        </Pressable>
      </View>

      <View style={styles.actionRow}>
        <Pressable onPress={handleReply} style={[styles.actionButton, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="corner-up-left" size={14} color={colors.primary} />
          <Text style={[styles.actionText, { color: colors.primary }]}>Reply</Text>
        </Pressable>
        <Pressable onPress={handleForward} style={[styles.actionButton, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="corner-up-right" size={14} color={colors.primary} />
          <Text style={[styles.actionText, { color: colors.primary }]}>Forward</Text>
        </Pressable>
        <Pressable onPress={() => setBodyScale((v) => Math.max(0.8, Number((v - 0.1).toFixed(1))))} style={[styles.iconActionButton, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="zoom-out" size={15} color={colors.foreground} />
        </Pressable>
        <Pressable onPress={() => setBodyScale((v) => Math.min(1.6, Number((v + 0.1).toFixed(1))))} style={[styles.iconActionButton, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="zoom-in" size={15} color={colors.foreground} />
        </Pressable>
      </View>

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
  );
}

export default function InboxScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [activeFolder, setActiveFolder] = useState<Folder>("All");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [offset, setOffset] = useState(0);
  const [allMessages, setAllMessages] = useState<Message[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [composeVisible, setComposeVisible] = useState(false);
  const [composeDraft, setComposeDraft] = useState<ComposeDraft | undefined>();
  const offsetRef = useRef(offset);
  offsetRef.current = offset;

  const folderParam = activeFolder === "All" ? undefined : activeFolder;
  const { data, isLoading, isFetching, refetch } = useGetMessages({ limit: PAGE_SIZE, offset, folder: folderParam } as any);

  useEffect(() => {
    setOffset(0);
    setAllMessages([]);
  }, [activeFolder]);

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

  const total = data?.total ?? 0;
  const hasMore = allMessages.length < total;
  const updateMessage = useUpdateMessage();

  const handlePressMessage = useCallback((msg: Message) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedId(msg.id);
    if (!msg.isRead) updateMessage.mutate({ id: msg.id, data: { isRead: true } });
  }, [updateMessage]);

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
      <View style={[styles.listHeader, { paddingTop: topPad + 12 }]}>
        <Text style={[styles.screenTitle, { color: colors.foreground }]}>Inbox</Text>
        <Pressable onPress={() => openCompose()} style={[styles.composeBtn, { backgroundColor: colors.primary }]}>
          <Feather name="edit-2" size={15} color="#fff" />
          <Text style={styles.composeBtnText}>Compose</Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.folderTabsContent}
        style={[styles.folderTabs, { borderBottomColor: colors.border }]}
      >
        {FOLDERS.map((folder) => (
          <Pressable
            key={folder}
            onPress={() => setActiveFolder(folder)}
            style={[styles.folderTab, activeFolder === folder && { borderBottomColor: colors.primary }]}
          >
            <Text style={[
              styles.folderTabText,
              { color: activeFolder === folder ? colors.primary : colors.mutedForeground },
              activeFolder === folder && { fontFamily: "Inter_600SemiBold" },
            ]}>
              {folder}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {isLoading && allMessages.length === 0 ? (
        <View style={styles.loadingCenter}><ActivityIndicator color={colors.primary} size="large" /></View>
      ) : allMessages.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="inbox" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>All caught up</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No messages in {activeFolder === "All" ? "your inbox" : activeFolder}</Text>
        </View>
      ) : (
        <FlatList
          data={allMessages}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <MessageRow message={item} onPress={() => handlePressMessage(item)} />}
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
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  screenTitle: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  composeBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  composeBtnText: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  folderTabs: { borderBottomWidth: StyleSheet.hairlineWidth },
  folderTabsContent: { paddingHorizontal: 16, gap: 4 },
  folderTab: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: "transparent" },
  folderTabText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  loadingCenter: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, paddingBottom: 80 },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", marginTop: 8 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  footerLoader: { paddingVertical: 16, alignItems: "center" },
  loadMoreButton: { paddingVertical: 14, alignItems: "center" },
  loadMoreText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  messageRow: { flexDirection: "row", paddingVertical: 14, paddingRight: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  messageLeft: { width: 64, alignItems: "center", justifyContent: "flex-start", paddingTop: 2 },
  senderAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  senderAvatarText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  messageContent: { flex: 1, gap: 3 },
  messageTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  senderName: { flex: 1, fontSize: 14 },
  messageTime: { fontSize: 11, fontFamily: "Inter_400Regular", flexShrink: 0 },
  messageSubject: { fontSize: 13 },
  messageBottomRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  messagePreview: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },
  accountBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, flexShrink: 0 },
  accountBadgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  detailContainer: { flex: 1 },
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
  metaRow: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, marginBottom: 16, gap: 8 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  metaLabel: { fontSize: 12, fontFamily: "Inter_500Medium", width: 48 },
  metaValue: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },
  bodyContainer: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 16, marginBottom: 16 },
  bodyText: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 24 },
  attachmentsSection: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 16, gap: 8 },
  attachmentsTitle: { fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 4 },
  attachmentRow: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  attachmentName: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  attachmentSize: { fontSize: 11, fontFamily: "Inter_400Regular", flexShrink: 0 },
});
