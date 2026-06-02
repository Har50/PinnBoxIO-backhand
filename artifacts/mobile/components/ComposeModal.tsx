import React, { useState, useEffect, useRef, useCallback } from "react";
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
import { getAuthToken } from "@/lib/authToken";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { EmailTemplates } from "@/components/EmailTemplates";

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

interface StorageFile {
  id: number;
  name: string;
  mimeType: string;
  sizeBytes: number;
  folder: string;
}

const SCHEDULE_PRESETS = [
  { label: "In 15 minutes", getDate: () => new Date(Date.now() + 15 * 60 * 1000) },
  { label: "In 1 hour", getDate: () => new Date(Date.now() + 60 * 60 * 1000) },
  { label: "Tonight at 7 PM", getDate: () => { const d = new Date(); d.setHours(19, 0, 0, 0); if (d <= new Date()) d.setDate(d.getDate() + 1); return d; } },
  { label: "Tomorrow at 8 AM", getDate: () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(8, 0, 0, 0); return d; } },
  { label: "Tomorrow at 2 PM", getDate: () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(14, 0, 0, 0); return d; } },
];

function formatBytes(bytes: number): string {
  if (bytes === 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  const [showStoragePicker, setShowStoragePicker] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [storageFiles, setStorageFiles] = useState<StorageFile[]>([]);
  const [loadingStorage, setLoadingStorage] = useState(false);

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

  const getApiBase = () =>
    process.env.EXPO_PUBLIC_DOMAIN
      ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
      : process.env.EXPO_PUBLIC_API_DOMAIN
        ? `https://${process.env.EXPO_PUBLIC_API_DOMAIN}/api`
        : "/api";

  async function handleSaveDraft() {
    setSavingDraft(true);
    try {
      const token = await getAuthToken();
      const provider: "gmail" | "outlook" | "local" = accountId === -2 ? "outlook" : accountId && accountId < 0 ? "gmail" : "local";
      const res = await fetch(`${getApiBase()}/messages/save-draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          to: to.trim(),
          subject: subject.trim(),
          body: body.trim(),
          provider,
          accountId: accountId && accountId > 0 ? accountId : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as any).error ?? "Failed to save draft");
      }
      Alert.alert("Draft Saved", "Your draft has been saved to the Drafts folder.");
      onClose();
    } catch (err: any) {
      Alert.alert("Save Failed", err.message);
    } finally {
      setSavingDraft(false);
    }
  }

  async function handleScheduleSend(scheduledAt: Date) {
    if (!to.trim() || !subject.trim()) {
      Alert.alert("Missing fields", "Please fill in To and Subject before scheduling.");
      return;
    }
    setSending(true);
    try {
      const token = await getAuthToken();
      const provider: "gmail" | "outlook" | "local" = accountId === -2 ? "outlook" : accountId && accountId < 0 ? "gmail" : "local";
      const res = await fetch(`${getApiBase()}/messages/schedule-send`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          to: to.trim(),
          subject: subject.trim(),
          body: body.trim() || " ",
          provider,
          accountId: accountId && accountId > 0 ? accountId : undefined,
          scheduledAt: scheduledAt.toISOString(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as any).error ?? "Failed to schedule");
      }
      const timeStr = scheduledAt.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
      Alert.alert("Scheduled", `Your email will be sent on ${timeStr}.`);
      onClose();
    } catch (err: any) {
      Alert.alert("Schedule Failed", err.message);
    } finally {
      setSending(false);
      setShowSchedulePicker(false);
    }
  }

  async function loadStorageFiles() {
    setLoadingStorage(true);
    setStorageFiles([]);
    try {
      const token = await getAuthToken();
      const res = await fetch(`${getApiBase()}/storage/files?folder=/`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (!res.ok) throw new Error("Failed to load files");
      const data = await res.json();
      setStorageFiles((data.files ?? []).filter((f: StorageFile) => !f.name.startsWith(".pinnbox-folder")));
    } catch {
      setStorageFiles([]);
    } finally {
      setLoadingStorage(false);
    }
  }

  async function handleStorageFileSelect(file: StorageFile) {
    try {
      const token = await getAuthToken();
      const res = await fetch(`${getApiBase()}/storage/files/${file.id}/download-url`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (!res.ok) throw new Error("Failed to get file link");
      const { downloadUrl } = await res.json();
      const link = `\n\n📎 ${file.name}\n${downloadUrl}`;
      setBody((prev) => prev + link);
      setAttachments((prev) => [...prev, { name: file.name, size: formatBytes(file.sizeBytes), type: "file" }]);
      setShowStoragePicker(false);
    } catch {
      Alert.alert("Error", "Could not attach file. Please try again.");
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
    const fullBody = [
      body.trim(),
      initialDraft?.quotedMeta ? `\n\n${initialDraft.quotedMeta}` : "",
      initialDraft?.quotedText ? `\n${initialDraft.quotedText}` : "",
    ].join("").trim() || " ";
    try {
      if (accountId < 0) {
        // Virtual connected account (Gmail id=-1, Outlook id=-2) — send via provider
        const provider: "gmail" | "outlook" = accountId === -2 ? "outlook" : "gmail";
        const token = await getAuthToken();
        const res = await fetch(`${getApiBase()}/messages/send`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            to: to.trim(),
            subject: subject.trim(),
            body: fullBody,
            provider,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error((data as any).error ?? "Failed to send");
        }
      } else {
        await createMessage.mutateAsync({
          data: {
            accountId,
            folder: "Sent",
            subject: subject.trim(),
            fromName: selectedAccount.name,
            fromEmail: selectedAccount.email ?? "",
            toList: to.trim(),
            ccList: cc.trim() || null,
            bodyText: fullBody,
            receivedAt: new Date().toISOString(),
          },
        });
      }
      onClose();
    } catch (err: any) {
      Alert.alert("Send failed", err?.message || "Could not send the message. Please try again.");
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
                <TouchableOpacity
                  style={[s.moreOption, { borderColor: colors.border, backgroundColor: colors.muted }]}
                  onPress={() => { setActivePanel("none"); setShowSchedulePicker(true); }}
                >
                  <Feather name="clock" size={20} color={colors.foreground} />
                  <Text style={[s.moreOptionLabel, { color: colors.foreground }]}>Schedule</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.moreOption, { borderColor: colors.border, backgroundColor: colors.muted }]}
                  disabled={savingDraft}
                  onPress={() => { setActivePanel("none"); handleSaveDraft(); }}
                >
                  {savingDraft
                    ? <ActivityIndicator size="small" color={colors.foreground} />
                    : <Feather name="bookmark" size={20} color={colors.foreground} />}
                  <Text style={[s.moreOptionLabel, { color: colors.foreground }]}>Save Draft</Text>
                </TouchableOpacity>
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
              Alert.alert("Attach File", "Choose a source", [
                { text: "PinnboxIO Storage", onPress: () => { loadStorageFiles(); setShowStoragePicker(true); } },
                { text: "Files on Device", onPress: pickDocument },
                { text: "Cancel", style: "cancel" },
              ])
            }
          >
            <Feather name="hard-drive" size={22} color={colors.foreground} />
          </TouchableOpacity>

          {/* Templates */}
          <TouchableOpacity
            style={s.toolbarBtn}
            onPress={() => setShowTemplates(true)}
          >
            <Feather name="file-text" size={22} color={colors.foreground} />
          </TouchableOpacity>

          {/* More */}
          <TouchableOpacity
            style={[s.toolbarBtn, activePanel === "more" && { opacity: 0.5 }]}
            onPress={() => togglePanel("more")}
          >
            <Feather name="more-horizontal" size={22} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        <EmailTemplates
          visible={showTemplates}
          onClose={() => setShowTemplates(false)}
          onSelectTemplate={(tpl) => {
            if (tpl.subject) setSubject(tpl.subject);
            if (tpl.body) setBody(tpl.body);
          }}
        />
      </KeyboardAvoidingView>

      {/* Schedule Picker */}
      <Modal visible={showSchedulePicker} transparent animationType="slide" onRequestClose={() => setShowSchedulePicker(false)}>
        <Pressable style={s.overlay} onPress={() => setShowSchedulePicker(false)}>
          <Pressable style={[s.sheet, { backgroundColor: colors.card }]} onPress={() => {}}>
            <Text style={[s.sheetTitle, { color: colors.foreground }]}>Schedule Send</Text>
            {SCHEDULE_PRESETS.map((preset) => (
              <TouchableOpacity
                key={preset.label}
                style={[s.sheetItem, { borderBottomColor: colors.border }]}
                onPress={() => handleScheduleSend(preset.getDate())}
                disabled={sending}
              >
                <Feather name="clock" size={16} color={colors.primary} />
                <Text style={[s.sheetItemText, { color: colors.foreground }]}>{preset.label}</Text>
                {sending && <ActivityIndicator size="small" color={colors.primary} />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[s.sheetItem, { borderBottomColor: "transparent" }]} onPress={() => setShowSchedulePicker(false)}>
              <Text style={[s.sheetItemText, { color: colors.mutedForeground }]}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* PinnboxIO Storage Picker */}
      <Modal visible={showStoragePicker} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowStoragePicker(false)}>
        <View style={[s.root, { backgroundColor: colors.background }]}>
          <View style={s.header}>
            <Pressable onPress={() => setShowStoragePicker(false)} style={s.headerBtn}>
              <Text style={[s.headerBtnText, { color: colors.mutedForeground }]}>Cancel</Text>
            </Pressable>
            <Text style={s.headerTitle}>PinnboxIO Storage</Text>
            <View style={s.headerBtn} />
          </View>
          {loadingStorage ? (
            <ActivityIndicator style={{ marginTop: 48 }} color={colors.primary} />
          ) : storageFiles.length === 0 ? (
            <Text style={[s.emptyText, { color: colors.mutedForeground }]}>No files in storage</Text>
          ) : (
            <FlatList
              data={storageFiles}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[s.storageItem, { borderBottomColor: colors.border }]}
                  onPress={() => handleStorageFileSelect(item)}
                >
                  <Feather name="file" size={18} color={colors.primary} style={{ marginRight: 10 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[s.storageItemName, { color: colors.foreground }]} numberOfLines={1}>{item.name}</Text>
                    <Text style={[s.storageItemMeta, { color: colors.mutedForeground }]}>{formatBytes(item.sizeBytes)}</Text>
                  </View>
                  <Feather name="paperclip" size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </Modal>
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
    overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
    sheet: { borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingBottom: 36 },
    sheetTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", textAlign: "center", paddingVertical: 18 },
    sheetItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      paddingHorizontal: 22,
      paddingVertical: 15,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    sheetItemText: { fontSize: 15, fontFamily: "Inter_400Regular", flex: 1 },
    storageItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 13,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    storageItemName: { fontSize: 14, fontFamily: "Inter_500Medium" },
    storageItemMeta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
    emptyText: { textAlign: "center", marginTop: 48, fontSize: 14, fontFamily: "Inter_400Regular" },
  });
}
