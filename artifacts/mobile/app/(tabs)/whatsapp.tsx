import { useColors } from "@/hooks/useColors";
import { Feather } from "@expo/vector-icons";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import {
  FlatList,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const WA_GREEN = "#25D366";
const WA_DARK = "#128C7E";
const WA_LIGHT_BG = "#DCF8C6";

type Chat = {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  unread: number;
  avatar: string;
  online: boolean;
};

type Message = {
  id: string;
  text: string;
  fromMe: boolean;
  time: string;
  status: "sent" | "delivered" | "read";
};

const MOCK_CHATS: Chat[] = [
  {
    id: "1",
    name: "Sarah Johnson",
    lastMessage: "Can we reschedule the call to 3pm?",
    time: "10:42",
    unread: 2,
    avatar: "SJ",
    online: true,
  },
  {
    id: "2",
    name: "Work Team",
    lastMessage: "Alex: The report is ready for review",
    time: "09:15",
    unread: 5,
    avatar: "WT",
    online: false,
  },
  {
    id: "3",
    name: "Mike Chen",
    lastMessage: "Thanks, I got it!",
    time: "Yesterday",
    unread: 0,
    avatar: "MC",
    online: false,
  },
  {
    id: "4",
    name: "Family Group",
    lastMessage: "Mom: Dinner at 7pm on Sunday",
    time: "Yesterday",
    unread: 1,
    avatar: "FG",
    online: false,
  },
  {
    id: "5",
    name: "Lisa Park",
    lastMessage: "Looking forward to the meeting",
    time: "Mon",
    unread: 0,
    avatar: "LP",
    online: true,
  },
  {
    id: "6",
    name: "David Wilson",
    lastMessage: "Sent you the invoice",
    time: "Mon",
    unread: 0,
    avatar: "DW",
    online: false,
  },
];

const MOCK_MESSAGES: Record<string, Message[]> = {
  "1": [
    { id: "1", text: "Hi! Are we still on for the call tomorrow?", fromMe: false, time: "10:30", status: "read" },
    { id: "2", text: "Yes definitely! Looking forward to it.", fromMe: true, time: "10:32", status: "read" },
    { id: "3", text: "Great. Can we reschedule the call to 3pm?", fromMe: false, time: "10:42", status: "delivered" },
    { id: "4", text: "Something came up in the morning", fromMe: false, time: "10:42", status: "delivered" },
  ],
  "2": [
    { id: "1", text: "Hey team, status update?", fromMe: true, time: "09:00", status: "read" },
    { id: "2", text: "Frontend is done, deploying now", fromMe: false, time: "09:05", status: "read" },
    { id: "3", text: "Backend tests are passing", fromMe: false, time: "09:10", status: "read" },
    { id: "4", text: "The report is ready for review", fromMe: false, time: "09:15", status: "delivered" },
  ],
};

function ChatRow({ chat, onPress }: { chat: Chat; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chatRow,
        { borderBottomColor: colors.border, backgroundColor: pressed ? colors.muted : colors.background },
      ]}
    >
      <View style={styles.avatarContainer}>
        <View style={[styles.avatar, { backgroundColor: WA_DARK }]}>
          <Text style={styles.avatarText}>{chat.avatar}</Text>
        </View>
        {chat.online && <View style={styles.onlineDot} />}
      </View>
      <View style={styles.chatContent}>
        <View style={styles.chatTopRow}>
          <Text style={[styles.chatName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
            {chat.name}
          </Text>
          <Text style={[styles.chatTime, { color: chat.unread > 0 ? WA_GREEN : colors.mutedForeground }]}>
            {chat.time}
          </Text>
        </View>
        <View style={styles.chatBottomRow}>
          <Text style={[styles.lastMessage, { color: colors.mutedForeground }]} numberOfLines={1}>
            {chat.lastMessage}
          </Text>
          {chat.unread > 0 && (
            <View style={[styles.badge, { backgroundColor: WA_GREEN }]}>
              <Text style={styles.badgeText}>{chat.unread}</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

function ConversationView({ chat, onBack }: { chat: Chat; onBack: () => void }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [inputText, setInputText] = useState("");
  const messages = MOCK_MESSAGES[chat.id] ?? [];

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <View style={[styles.convHeader, { paddingTop: insets.top, backgroundColor: WA_DARK }]}>
        <Pressable onPress={onBack} style={styles.backBtn} hitSlop={12}>
          {Platform.OS === "ios" ? (
            <SymbolView name="chevron.left" tintColor="#fff" size={20} />
          ) : (
            <Feather name="arrow-left" size={20} color="#fff" />
          )}
        </Pressable>
        <View style={[styles.convAvatar, { backgroundColor: WA_GREEN }]}>
          <Text style={styles.convAvatarText}>{chat.avatar}</Text>
        </View>
        <View style={styles.convHeaderInfo}>
          <Text style={styles.convName}>{chat.name}</Text>
          {chat.online && <Text style={styles.convStatus}>online</Text>}
        </View>
        <View style={styles.convActions}>
          <Pressable hitSlop={12} style={{ marginRight: 16 }}>
            {Platform.OS === "ios" ? (
              <SymbolView name="phone" tintColor="#fff" size={20} />
            ) : (
              <Feather name="phone" size={20} color="#fff" />
            )}
          </Pressable>
          <Pressable hitSlop={12}>
            {Platform.OS === "ios" ? (
              <SymbolView name="ellipsis" tintColor="#fff" size={20} />
            ) : (
              <Feather name="more-vertical" size={20} color="#fff" />
            )}
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={[styles.messageList, { backgroundColor: "#E5DDD5" }]}
        contentContainerStyle={{ padding: 12, gap: 4 }}
      >
        {messages.map((msg) => (
          <View
            key={msg.id}
            style={[
              styles.bubble,
              msg.fromMe
                ? [styles.bubbleMe, { backgroundColor: WA_LIGHT_BG }]
                : [styles.bubbleThem, { backgroundColor: "#fff" }],
            ]}
          >
            <Text style={[styles.bubbleText, { color: "#111" }]}>{msg.text}</Text>
            <View style={styles.bubbleMeta}>
              <Text style={styles.bubbleTime}>{msg.time}</Text>
              {msg.fromMe && (
                <Feather
                  name="check-circle"
                  size={12}
                  color={msg.status === "read" ? "#34B7F1" : "#aaa"}
                  style={{ marginLeft: 4 }}
                />
              )}
            </View>
          </View>
        ))}
        {messages.length === 0 && (
          <View style={styles.emptyConv}>
            <Text style={{ color: "#666", textAlign: "center" }}>No messages yet. Say hello!</Text>
          </View>
        )}
      </ScrollView>

      <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8, backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <TextInput
          style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground }]}
          placeholder="Message"
          placeholderTextColor={colors.mutedForeground}
          value={inputText}
          onChangeText={setInputText}
          multiline
        />
        <Pressable
          style={[styles.sendBtn, { backgroundColor: inputText.trim() ? WA_GREEN : colors.muted }]}
          hitSlop={8}
        >
          {Platform.OS === "ios" ? (
            <SymbolView name="arrow.up" tintColor="#fff" size={18} />
          ) : (
            <Feather name="send" size={18} color="#fff" />
          )}
        </Pressable>
      </View>
    </View>
  );
}

export default function WhatsAppScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);

  if (selectedChat) {
    return <ConversationView chat={selectedChat} onBack={() => setSelectedChat(null)} />;
  }

  const totalUnread = MOCK_CHATS.reduce((sum, c) => sum + c.unread, 0);

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top, backgroundColor: WA_DARK }]}>
        <Text style={styles.headerTitle}>WhatsApp</Text>
        {totalUnread > 0 && (
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>{totalUnread}</Text>
          </View>
        )}
        <View style={styles.headerActions}>
          <Pressable hitSlop={12} style={{ marginRight: 16 }}>
            {Platform.OS === "ios" ? (
              <SymbolView name="camera" tintColor="#fff" size={20} />
            ) : (
              <Feather name="camera" size={20} color="#fff" />
            )}
          </Pressable>
          <Pressable hitSlop={12}>
            {Platform.OS === "ios" ? (
              <SymbolView name="ellipsis" tintColor="#fff" size={20} />
            ) : (
              <Feather name="more-vertical" size={20} color="#fff" />
            )}
          </Pressable>
        </View>
      </View>

      <Pressable
        onPress={() => Linking.openURL("whatsapp://app")}
        style={[styles.connectBanner, { borderBottomColor: colors.border }]}
      >
        <View style={[styles.connectIcon, { backgroundColor: WA_GREEN + "20" }]}>
          <Feather name="smartphone" size={16} color={WA_GREEN} />
        </View>
        <Text style={[styles.connectText, { color: colors.foreground }]}>
          Open WhatsApp on your phone to sync messages
        </Text>
        {Platform.OS === "ios" ? (
          <SymbolView name="chevron.right" tintColor={colors.mutedForeground} size={14} />
        ) : (
          <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
        )}
      </Pressable>

      <FlatList
        data={MOCK_CHATS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ChatRow chat={item} onPress={() => setSelectedChat(item)} />
        )}
        ItemSeparatorComponent={() => <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }} />}
      />

      <Pressable style={[styles.fab, { backgroundColor: WA_GREEN }]}>
        {Platform.OS === "ios" ? (
          <SymbolView name="square.and.pencil" tintColor="#fff" size={22} />
        ) : (
          <Feather name="edit" size={22} color="#fff" />
        )}
      </Pressable>
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
    gap: 8,
  },
  headerTitle: {
    flex: 1,
    color: "#fff",
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  headerBadge: {
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  headerBadgeText: {
    color: WA_DARK,
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  connectBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  connectIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  connectText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  chatRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  onlineDot: {
    position: "absolute",
    bottom: 1,
    right: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: WA_GREEN,
    borderWidth: 2,
    borderColor: "#fff",
  },
  chatContent: {
    flex: 1,
  },
  chatTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  chatName: {
    flex: 1,
    fontSize: 15,
    marginRight: 8,
  },
  chatTime: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  chatBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  lastMessage: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginRight: 8,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  convHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 10,
  },
  backBtn: {
    paddingRight: 4,
  },
  convAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  convAvatarText: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  convHeaderInfo: {
    flex: 1,
  },
  convName: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
  convStatus: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
  },
  convActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  messageList: {
    flex: 1,
  },
  bubble: {
    maxWidth: "75%",
    borderRadius: 8,
    padding: 8,
    marginVertical: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 1,
    elevation: 1,
  },
  bubbleMe: {
    alignSelf: "flex-end",
    borderTopRightRadius: 2,
  },
  bubbleThem: {
    alignSelf: "flex-start",
    borderTopLeftRadius: 2,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
  },
  bubbleMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 3,
  },
  bubbleTime: {
    fontSize: 11,
    color: "#999",
  },
  emptyConv: {
    padding: 32,
    alignItems: "center",
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingTop: 8,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 15,
    maxHeight: 100,
    fontFamily: "Inter_400Regular",
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
});
