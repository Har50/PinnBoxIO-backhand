import React, { useState, useEffect, useRef } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
  Animated,
  FlatList,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useGetAccounts, useCreateMessage } from "@workspace/api-client-react";

export interface ComposeDraft {
  to?: string;
  subject?: string;
  body?: string;
  accountId?: number;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  initialDraft?: ComposeDraft;
}

interface AttachedFile {
  name: string;
  size: string;
  type: "file" | "photo";
  uri?: string;
}

const FONT_FAMILIES = ["Default", "Arial", "Georgia", "Courier", "Times New Roman", "Verdana"];
const FONT_SIZES = [10, 12, 14, 16, 18, 20, 24, 28];

type FormatPanel = "none" | "formatting" | "more";

export function ComposeModal({ visible, onClose, initialDraft }: Props) {
  const colors = useColors();
  const { data: accounts } = useGetAccounts();
  const createMessage = useCreateMessage();

  const [to, setTo] = useState(initialDraft?.to ?? "");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState(initialDraft?.subject ?? "");
  const [body, setBody] = useState(initialDraft?.body ?? "");
  const [accountId, setAccountId] = useState<number | null>(initialDraft?.accountId ?? null);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [sending, setSending] = useState(false);
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const [activePanel, setActivePanel] = useState<FormatPanel>("none");

  // Formatting state
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [fontFamily, setFontFamily] = useState("Default");
  const [fontSize, setFontSize] = useState(14);

  const panelAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setTo(initialDraft?.to ?? "");
      setCc("");
      setBcc("");
      setSubject(initialDraft?.subject ?? "");
      setBody(initialDraft?.body ?? "");
      setAccountId(initialDraft?.accountId ?? null);
      setShowCc(false);
      setShowBcc(false);
      setShowAccountPicker(false);
      setAttachments([]);
      setActivePanel("none");
      setIsBold(false);
      setIsItalic(false);
      setIsUnderline(false);
      setFontFamily("Default");
      setFontSize(14);
    }
  }, [visible, initialDraft]);

  useEffect(() => {
    if (accounts && accounts.length > 0 && !accountId) {
      setAccountId(accounts[0].id);
    }
  }, [accounts, accountId]);

  useEffect(() => {
    Animated.spring(panelAnim, {
      toValue: activePanel !== "none" ? 1 : 0,
      useNativeDriver: false,
      tension: 80,
      friction: 12,
    }).start();
  }, [activePanel, panelAnim]);

  const selectedAccount = accounts?.find((a) => a.id === accountId);

  const togglePanel = (panel: FormatPanel) => {
    setActivePanel((prev) => (prev === panel ? "none" : panel));
  };

  const mockAttachFile = (type: "file" | "photo") => {
    const name =
      type === "photo"
        ? `photo_${Date.now()}.jpg`
        : `document_${Date.now()}.pdf`;
    setAttachments((prev) => [
      ...prev,
      { name, size: "—", type },
    ]);
    Alert.alert(
      type === "photo" ? "Photo attached" : "File attached",
      `"${name}" has been added to your message.`
    );
  };

  async function handleSend() {
    if (!to.trim()) {
      Alert.alert("Missing recipient", "Please enter a To address.");
      return;
    }
    if (!subject.trim()) {
      Alert.alert("Missing subject", "Please enter a subject.");
      return;
    }
    if (!accountId || !selectedAccount) {
      Alert.alert("No account", "Please select a sender account.");
      return;
    }

    setSending(true);
    try {
      await createMessage.mutateAsync({
        data: {
          accountId,
          folder: "Sent",
          subject: subject.trim(),
          fromName: selectedAccount.name,
          fromEmail: selectedAccount.email ?? "",
          toList: to.trim(),
          ccList: cc.trim() || null,
          bodyText: body.trim() || null,
          receivedAt: new Date().toISOString(),
        },
      });
      onClose();
    } catch {
      Alert.alert("Send failed", "Could not send the message. Please try again.");
    } finally {
      setSending(false);
    }
  }

  const s = makeStyles(colors);

  const bodyFontFamily =
    fontFamily === "Default" ? "Inter_400Regular" : undefined;
  const bodyFontStyle: any = {
    fontFamily: bodyFontFamily,
    fontSize,
    fontWeight: isBold ? "700" : "400",
    fontStyle: isItalic ? "italic" : "normal",
    textDecorationLine: isUnderline ? "underline" : "none",
  };

  const panelHeight = panelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, activePanel === "formatting" ? 220 : 110],
  });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={s.root} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={0}>
        {/* Header */}
        <View style={s.header}>
          <Pressable onPress={onClose} style={s.headerBtn}>
            <Text style={[s.headerBtnText, { color: colors.mutedForeground }]}>Cancel</Text>
          </Pressable>
          <Text style={s.headerTitle}>New Message</Text>
          <Pressable onPress={handleSend} style={s.sendBtn} disabled={sending}>
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={s.sendBtnText}>Send</Text>
            )}
          </Pressable>
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
        >
          {/* From */}
          <Pressable style={s.field} onPress={() => setShowAccountPicker((v) => !v)}>
            <Text style={s.fieldLabel}>From</Text>
            <Text
              style={[s.fieldValue, !selectedAccount && { color: colors.mutedForeground }]}
              numberOfLines={1}
            >
              {selectedAccount
                ? `${selectedAccount.name} <${selectedAccount.email}>`
                : "Select account…"}
            </Text>
            <Feather
              name={showAccountPicker ? "chevron-up" : "chevron-down"}
              size={16}
              color={colors.mutedForeground}
            />
          </Pressable>

          {showAccountPicker && accounts && (
            <View style={[s.pickerList, { borderColor: colors.border, backgroundColor: colors.card }]}>
              {accounts.map((acc) => (
                <Pressable
                  key={acc.id}
                  style={[s.pickerItem, { borderBottomColor: colors.border }]}
                  onPress={() => {
                    setAccountId(acc.id);
                    setShowAccountPicker(false);
                  }}
                >
                  <View style={[s.pickerDot, { backgroundColor: acc.color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[s.pickerName, { color: colors.foreground }]}>{acc.name}</Text>
                    <Text style={[s.pickerEmail, { color: colors.mutedForeground }]}>{acc.email}</Text>
                  </View>
                  {acc.id === accountId && (
                    <Feather name="check" size={16} color={colors.primary} />
                  )}
                </Pressable>
              ))}
            </View>
          )}

          {/* To */}
          <View style={s.field}>
            <Text style={s.fieldLabel}>To</Text>
            <TextInput
              style={s.fieldInput}
              value={to}
              onChangeText={setTo}
              placeholder="recipient@example.com"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable onPress={() => setShowCc((v) => !v)}>
                <Text style={[s.ccToggle, { color: colors.primary }]}>Cc</Text>
              </Pressable>
              <Pressable onPress={() => setShowBcc((v) => !v)}>
                <Text style={[s.ccToggle, { color: colors.primary }]}>Bcc</Text>
              </Pressable>
            </View>
          </View>

          {/* CC */}
          {showCc && (
            <View style={s.field}>
              <Text style={s.fieldLabel}>Cc</Text>
              <TextInput
                style={s.fieldInput}
                value={cc}
                onChangeText={setCc}
                placeholder="cc@example.com"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          )}

          {/* BCC */}
          {showBcc && (
            <View style={s.field}>
              <Text style={s.fieldLabel}>Bcc</Text>
              <TextInput
                style={s.fieldInput}
                value={bcc}
                onChangeText={setBcc}
                placeholder="bcc@example.com"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          )}

          {/* Subject */}
          <View style={s.field}>
            <Text style={s.fieldLabel}>Subject</Text>
            <TextInput
              style={s.fieldInput}
              value={subject}
              onChangeText={setSubject}
              placeholder="Subject"
              placeholderTextColor={colors.mutedForeground}
            />
          </View>

          {/* Attachments strip */}
          {attachments.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={[s.attachStrip, { borderBottomColor: colors.border }]}
              contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingVertical: 10 }}
            >
              {attachments.map((att, i) => (
                <View key={i} style={[s.attachChip, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                  <Feather
                    name={att.type === "photo" ? "image" : "file"}
                    size={13}
                    color={colors.mutedForeground}
                  />
                  <Text style={[s.attachChipText, { color: colors.foreground }]} numberOfLines={1}>
                    {att.name}
                  </Text>
                  <Pressable onPress={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}>
                    <Feather name="x" size={13} color={colors.mutedForeground} />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          )}

          {/* Body */}
          <View style={[s.bodyField, { borderColor: colors.border }]}>
            <TextInput
              style={[s.bodyInput, { color: colors.foreground }, bodyFontStyle]}
              value={body}
              onChangeText={setBody}
              placeholder="Write your message…"
              placeholderTextColor={colors.mutedForeground}
              multiline
              textAlignVertical="top"
            />
          </View>
        </ScrollView>

        {/* Formatting / More panel (animated) */}
        <Animated.View style={[s.panel, { maxHeight: panelHeight, borderTopColor: colors.border, backgroundColor: colors.card }]}>
          {activePanel === "formatting" && (
            <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
              {/* Bold / Italic / Underline */}
              <View style={s.formatRow}>
                <TouchableOpacity
                  style={[s.formatBtn, isBold && { backgroundColor: colors.primary + "22", borderColor: colors.primary }, { borderColor: colors.border }]}
                  onPress={() => setIsBold((v) => !v)}
                >
                  <Text style={[s.formatBtnLabel, { color: colors.foreground }, isBold && { fontWeight: "700", color: colors.primary }]}>B</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.formatBtn, isItalic && { backgroundColor: colors.primary + "22", borderColor: colors.primary }, { borderColor: colors.border }]}
                  onPress={() => setIsItalic((v) => !v)}
                >
                  <Text style={[s.formatBtnLabel, { color: colors.foreground, fontStyle: "italic" }, isItalic && { color: colors.primary }]}>I</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.formatBtn, isUnderline && { backgroundColor: colors.primary + "22", borderColor: colors.primary }, { borderColor: colors.border }]}
                  onPress={() => setIsUnderline((v) => !v)}
                >
                  <Text style={[s.formatBtnLabel, { color: colors.foreground, textDecorationLine: "underline" }, isUnderline && { color: colors.primary }]}>U</Text>
                </TouchableOpacity>
              </View>

              {/* Font size */}
              <Text style={[s.panelSectionLabel, { color: colors.mutedForeground }]}>Font Size</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {FONT_SIZES.map((size) => (
                    <TouchableOpacity
                      key={size}
                      style={[
                        s.sizeChip,
                        { borderColor: colors.border },
                        fontSize === size && { backgroundColor: colors.primary, borderColor: colors.primary },
                      ]}
                      onPress={() => setFontSize(size)}
                    >
                      <Text style={[s.sizeChipText, { color: fontSize === size ? "#fff" : colors.foreground }]}>
                        {size}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* Font family */}
              <Text style={[s.panelSectionLabel, { color: colors.mutedForeground }]}>Font</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {FONT_FAMILIES.map((f) => (
                    <TouchableOpacity
                      key={f}
                      style={[
                        s.fontChip,
                        { borderColor: colors.border },
                        fontFamily === f && { backgroundColor: colors.primary, borderColor: colors.primary },
                      ]}
                      onPress={() => setFontFamily(f)}
                    >
                      <Text style={[s.fontChipText, { color: fontFamily === f ? "#fff" : colors.foreground }]}>
                        {f}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {activePanel === "more" && (
            <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
              <Text style={[s.panelSectionLabel, { color: colors.mutedForeground, marginBottom: 10 }]}>More Options</Text>
              <View style={{ flexDirection: "row", gap: 12 }}>
                {[
                  { icon: "clock", label: "Schedule" },
                  { icon: "flag", label: "Priority" },
                  { icon: "bookmark", label: "Save Draft" },
                ].map((opt) => (
                  <TouchableOpacity
                    key={opt.label}
                    style={[s.moreOption, { borderColor: colors.border, backgroundColor: colors.muted }]}
                    onPress={() =>
                      Alert.alert(opt.label, `${opt.label} feature coming soon.`)
                    }
                  >
                    <Feather name={opt.icon as any} size={20} color={colors.foreground} />
                    <Text style={[s.moreOptionLabel, { color: colors.foreground }]}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </Animated.View>

        {/* Bottom Toolbar — Outlook-style */}
        <View style={[s.toolbar, { borderTopColor: colors.border, backgroundColor: colors.card }]}>
          {/* Attach file */}
          <TouchableOpacity
            style={s.toolbarBtn}
            onPress={() =>
              Alert.alert("Attach File", "Choose a source", [
                { text: "Files / Drive", onPress: () => mockAttachFile("file") },
                { text: "Cancel", style: "cancel" },
              ])
            }
          >
            <Feather name="paperclip" size={22} color={colors.foreground} />
          </TouchableOpacity>

          {/* Attach photo */}
          <TouchableOpacity
            style={s.toolbarBtn}
            onPress={() =>
              Alert.alert("Add Photo", "Choose a source", [
                { text: "Camera Roll", onPress: () => mockAttachFile("photo") },
                { text: "Take Photo", onPress: () => mockAttachFile("photo") },
                { text: "Cancel", style: "cancel" },
              ])
            }
          >
            <Feather name="camera" size={22} color={colors.foreground} />
          </TouchableOpacity>

          {/* Text formatting */}
          <TouchableOpacity
            style={[s.toolbarBtn, activePanel === "formatting" && { opacity: 0.5 }]}
            onPress={() => togglePanel("formatting")}
          >
            <Feather name="type" size={22} color={isBold || isItalic || isUnderline ? colors.primary : colors.foreground} />
          </TouchableOpacity>

          {/* Drive / Storage */}
          <TouchableOpacity
            style={s.toolbarBtn}
            onPress={() =>
              Alert.alert("Drive / Storage", "Choose a source", [
                { text: "Google Drive", onPress: () => mockAttachFile("file") },
                { text: "iCloud Drive", onPress: () => mockAttachFile("file") },
                { text: "OneDrive", onPress: () => mockAttachFile("file") },
                { text: "Cancel", style: "cancel" },
              ])
            }
          >
            <Feather name="hard-drive" size={22} color={colors.foreground} />
          </TouchableOpacity>

          {/* More */}
          <TouchableOpacity
            style={[s.toolbarBtn, activePanel === "more" && { opacity: 0.5 }]}
            onPress={() => togglePanel("more")}
          >
            <Feather name="more-horizontal" size={22} color={colors.foreground} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    headerBtn: { minWidth: 60 },
    headerBtnText: { fontSize: 16, fontFamily: "Inter_400Regular" },
    headerTitle: {
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
    },
    sendBtn: {
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 7,
      borderRadius: 20,
      minWidth: 60,
      alignItems: "center",
    },
    sendBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
    field: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 13,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      gap: 10,
    },
    fieldLabel: {
      fontSize: 14,
      fontFamily: "Inter_500Medium",
      color: colors.mutedForeground,
      width: 52,
      flexShrink: 0,
    },
    fieldValue: {
      flex: 1,
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.foreground,
    },
    fieldInput: {
      flex: 1,
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.foreground,
    },
    ccToggle: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
    pickerList: {
      borderTopWidth: 0,
      borderWidth: StyleSheet.hairlineWidth,
      marginHorizontal: 0,
    },
    pickerItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    pickerDot: { width: 10, height: 10, borderRadius: 5 },
    pickerName: { fontSize: 14, fontFamily: "Inter_500Medium" },
    pickerEmail: { fontSize: 12, fontFamily: "Inter_400Regular" },
    attachStrip: {
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    attachChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      maxWidth: 180,
    },
    attachChipText: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      flex: 1,
    },
    bodyField: {
      margin: 16,
      marginTop: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      minHeight: 260,
    },
    bodyInput: {
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      lineHeight: 24,
      paddingTop: 12,
      minHeight: 260,
    },
    // Bottom toolbar
    toolbar: {
      flexDirection: "row",
      alignItems: "center",
      borderTopWidth: StyleSheet.hairlineWidth,
      paddingHorizontal: 8,
      paddingVertical: Platform.OS === "ios" ? 12 : 8,
      paddingBottom: Platform.OS === "ios" ? 28 : 8,
      gap: 4,
    },
    toolbarBtn: {
      flex: 1,
      alignItems: "center",
      paddingVertical: 8,
    },
    // Formatting panel
    panel: {
      overflow: "hidden",
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    formatRow: {
      flexDirection: "row",
      gap: 10,
      marginBottom: 12,
    },
    formatBtn: {
      width: 40,
      height: 40,
      borderRadius: 8,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    formatBtnLabel: {
      fontSize: 18,
      fontFamily: "Inter_600SemiBold",
    },
    panelSectionLabel: {
      fontSize: 11,
      fontFamily: "Inter_500Medium",
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 8,
    },
    sizeChip: {
      width: 38,
      height: 34,
      borderRadius: 8,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    sizeChipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
    fontChip: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 8,
      borderWidth: 1,
    },
    fontChipText: { fontSize: 13, fontFamily: "Inter_400Regular" },
    moreOption: {
      flex: 1,
      alignItems: "center",
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      gap: 6,
    },
    moreOptionLabel: {
      fontSize: 12,
      fontFamily: "Inter_500Medium",
    },
  });
}
