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
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";

export interface ComposeDraft {
  to?: string;
  subject?: string;
  body?: string;
  quotedText?: string;
  quotedMeta?: string;
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

  async function pickDocument() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      const sizeKb = asset.size ? `${Math.round(asset.size / 1024)} KB` : "—";
      setAttachments((prev) => [
        ...prev,
        { name: asset.name, size: sizeKb, type: "file", uri: asset.uri },
      ]);
    } catch {
      Alert.alert("Error", "Could not open file picker. Please try again.");
    }
  }

  async function pickFromCameraRoll() {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission required", "Please allow photo library access in your device settings.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.85,
        allowsMultipleSelection: false,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      const name = asset.fileName ?? `photo_${Date.now()}.jpg`;
      const sizeKb = asset.fileSize ? `${Math.round(asset.fileSize / 1024)} KB` : "—";
      setAttachments((prev) => [
        ...prev,
        { name, size: sizeKb, type: "photo", uri: asset.uri },
      ]);
    } catch {
      Alert.alert("Error", "Could not open photo library. Please try again.");
    }
  }

  async function takePhoto() {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission required", "Please allow camera access in your device settings.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.85,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      const name = asset.fileName ?? `photo_${Date.now()}.jpg`;
      const sizeKb = asset.fileSize ? `${Math.round(asset.fileSize / 1024)} KB` : "—";
      setAttachments((prev) => [
        ...prev,
        { name, size: sizeKb, type: "photo", uri: asset.uri },
      ]);
    } catch {
      Alert.alert("Error", "Could not open camera. Please try again.");
    }
  }

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
          <Text style={s.headerTitle}>
            {initialDraft?.subject?.startsWith("Re:") ? "Reply" : initialDraft?.subject?.startsWith("Fwd:") ? "Forward" : "New Message"}
          </Text>
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

          {/* Quoted original message */}
          {(initialDraft?.quotedText || initialDraft?.quotedMeta) && (
            <View style={[s.quotedBlock, { borderLeftColor: colors.mutedForeground, borderTopColor: colors.border }]}>
              {initialDraft.quotedMeta && (
                <Text style={[s.quotedMeta, { color: colors.mutedForeground }]}>
                  {initialDraft.quotedMeta}
                </Text>
              )}
              {initialDraft.quotedText && (
                <Text style={[s.quotedBody, { color: colors.mutedForeground }]}>
                  {initialDraft.quotedText}
                </Text>
              )}
            </View>
          )}
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
            onPress={pickDocument}
          >
            <Feather name="paperclip" size={22} color={colors.foreground} />
          </TouchableOpacity>

          {/* Attach photo */}
          <TouchableOpacity
            style={s.toolbarBtn}
            onPress={() =>
              Alert.alert("Add Photo", "Choose a source", [
                { text: "Camera Roll", onPress: pickFromCameraRoll },
                { text: "Take Photo", onPress: takePhoto },
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
                { text: "PinnboxIO Storage", onPress: pickDocument },
                { text: "Files on Device", onPress: pickDocument },
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
      minHeight: 180,
    },
    quotedBlock: {
      marginHorizontal: 16,
      marginTop: 0,
      marginBottom: 16,
      borderTopWidth: StyleSheet.hairlineWidth,
      paddingTop: 12,
      borderLeftWidth: 3,
      paddingLeft: 12,
    },
    quotedMeta: {
      fontSize: 11,
      fontFamily: "Inter_400Regular",
      marginBottom: 6,
      lineHeight: 16,
    },
    quotedBody: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      lineHeight: 20,
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
