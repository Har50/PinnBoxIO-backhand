import React, { useState, useEffect } from "react";
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

export function ComposeModal({ visible, onClose, initialDraft }: Props) {
  const colors = useColors();
  const { data: accounts } = useGetAccounts();
  const createMessage = useCreateMessage();

  const [to, setTo] = useState(initialDraft?.to ?? "");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState(initialDraft?.subject ?? "");
  const [body, setBody] = useState(initialDraft?.body ?? "");
  const [accountId, setAccountId] = useState<number | null>(initialDraft?.accountId ?? null);
  const [showCc, setShowCc] = useState(false);
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (visible) {
      setTo(initialDraft?.to ?? "");
      setCc("");
      setSubject(initialDraft?.subject ?? "");
      setBody(initialDraft?.body ?? "");
      setAccountId(initialDraft?.accountId ?? null);
      setShowCc(false);
      setShowAccountPicker(false);
    }
  }, [visible, initialDraft]);

  useEffect(() => {
    if (accounts && accounts.length > 0 && !accountId) {
      setAccountId(accounts[0].id);
    }
  }, [accounts, accountId]);

  const selectedAccount = accounts?.find((a) => a.id === accountId);

  async function handleSend() {
    if (!to.trim()) { Alert.alert("Missing recipient", "Please enter a To address."); return; }
    if (!subject.trim()) { Alert.alert("Missing subject", "Please enter a subject."); return; }
    if (!accountId || !selectedAccount) { Alert.alert("No account", "Please select a sender account."); return; }

    setSending(true);
    try {
      await createMessage.mutateAsync({
        accountId,
        folder: "Sent",
        subject: subject.trim(),
        fromName: selectedAccount.name,
        fromEmail: selectedAccount.email ?? "",
        toList: to.trim(),
        ccList: cc.trim() || null,
        bodyText: body.trim() || null,
      });
      onClose();
    } catch {
      Alert.alert("Send failed", "Could not send the message. Please try again.");
    } finally {
      setSending(false);
    }
  }

  const s = makeStyles(colors);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={s.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
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

        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* From */}
          <Pressable style={s.field} onPress={() => setShowAccountPicker((v) => !v)}>
            <Text style={s.fieldLabel}>From</Text>
            <Text style={[s.fieldValue, !selectedAccount && { color: colors.mutedForeground }]} numberOfLines={1}>
              {selectedAccount ? `${selectedAccount.name} <${selectedAccount.email}>` : "Select account…"}
            </Text>
            <Feather name={showAccountPicker ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedForeground} />
          </Pressable>

          {showAccountPicker && accounts && (
            <View style={[s.pickerList, { borderColor: colors.border, backgroundColor: colors.card }]}>
              {accounts.map((acc) => (
                <Pressable
                  key={acc.id}
                  style={[s.pickerItem, { borderBottomColor: colors.border }]}
                  onPress={() => { setAccountId(acc.id); setShowAccountPicker(false); }}
                >
                  <View style={[s.pickerDot, { backgroundColor: acc.color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[s.pickerName, { color: colors.foreground }]}>{acc.name}</Text>
                    <Text style={[s.pickerEmail, { color: colors.mutedForeground }]}>{acc.email}</Text>
                  </View>
                  {acc.id === accountId && <Feather name="check" size={16} color={colors.primary} />}
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
            <Pressable onPress={() => setShowCc((v) => !v)}>
              <Text style={[s.ccToggle, { color: colors.primary }]}>Cc</Text>
            </Pressable>
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

          {/* Body */}
          <View style={[s.bodyField, { borderColor: colors.border }]}>
            <TextInput
              style={[s.bodyInput, { color: colors.foreground }]}
              value={body}
              onChangeText={setBody}
              placeholder="Write your message…"
              placeholderTextColor={colors.mutedForeground}
              multiline
              textAlignVertical="top"
            />
          </View>
        </ScrollView>
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
    headerTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: colors.foreground },
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
    fieldValue: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: colors.foreground },
    fieldInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: colors.foreground },
    ccToggle: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
    pickerList: { borderTopWidth: 0, borderWidth: StyleSheet.hairlineWidth, marginHorizontal: 0 },
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
    bodyField: {
      margin: 16,
      marginTop: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      minHeight: 300,
    },
    bodyInput: {
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      lineHeight: 24,
      paddingTop: 12,
      minHeight: 300,
    },
  });
}
