import { useColors } from "@/hooks/useColors";
import { Feather } from "@expo/vector-icons";
import { useState, useEffect, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getAuthToken } from "@/lib/authToken";

const API_BASE = process.env.EXPO_PUBLIC_API_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_API_DOMAIN}`
  : process.env.EXPO_PUBLIC_DOMAIN
    ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
    : "";

async function authedFetch(path: string, init?: RequestInit) {
  const token = await getAuthToken();
  return fetch(`${API_BASE}/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
}

type TriggerType = "all" | "keyword" | "sender";

interface AutoReplySettings {
  vacationEnabled: boolean;
  vacationSubject: string;
  vacationBody: string;
  vacationStart?: string | null;
  vacationEnd?: string | null;
}

interface AutoReplyRule {
  id: number;
  triggerType: TriggerType;
  triggerValue?: string | null;
  replySubject: string;
  replyBody: string;
  isActive: boolean;
}

const DEFAULT_SETTINGS: AutoReplySettings = {
  vacationEnabled: false,
  vacationSubject: "Out of office",
  vacationBody: "Thanks for your email. I'm currently out of the office and will reply when I return.",
};

function RuleRow({
  rule,
  onDelete,
  onToggle,
}: {
  rule: AutoReplyRule;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const colors = useColors();

  const triggerLabel =
    rule.triggerType === "all"
      ? "All incoming emails"
      : rule.triggerType === "keyword"
        ? `Keyword: "${rule.triggerValue ?? ""}"`
        : `From: ${rule.triggerValue ?? ""}`;

  return (
    <View style={[s.ruleRow, { borderBottomColor: colors.border }]}>
      <View style={[s.ruleIcon, { backgroundColor: rule.isActive ? colors.primary + "15" : colors.muted }]}>
        <Feather name="zap" size={14} color={rule.isActive ? colors.primary : colors.mutedForeground} />
      </View>
      <View style={s.ruleInfo}>
        <Text style={[s.ruleTrigger, { color: colors.foreground }]} numberOfLines={1}>{triggerLabel}</Text>
        <Text style={[s.ruleReply, { color: colors.mutedForeground }]} numberOfLines={1}>
          Reply: {rule.replySubject}
        </Text>
      </View>
      <Switch
        value={rule.isActive}
        onValueChange={onToggle}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor="#fff"
      />
      <Pressable onPress={onDelete} hitSlop={8} style={s.deleteBtn}>
        <Feather name="trash-2" size={16} color="#ef4444" />
      </Pressable>
    </View>
  );
}

interface AddRuleModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (rule: Omit<AutoReplyRule, "id">) => Promise<void>;
}

function AddRuleModal({ visible, onClose, onSave }: AddRuleModalProps) {
  const colors = useColors();
  const [triggerType, setTriggerType] = useState<TriggerType>("all");
  const [triggerValue, setTriggerValue] = useState("");
  const [replySubject, setReplySubject] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [saving, setSaving] = useState(false);

  function reset() {
    setTriggerType("all");
    setTriggerValue("");
    setReplySubject("");
    setReplyBody("");
  }

  async function handleSave() {
    if (!replySubject.trim() || !replyBody.trim()) {
      Alert.alert("Required", "Please fill in a reply subject and body.");
      return;
    }
    if ((triggerType === "keyword" || triggerType === "sender") && !triggerValue.trim()) {
      Alert.alert("Required", `Please enter a ${triggerType === "keyword" ? "keyword" : "sender email"}.`);
      return;
    }
    setSaving(true);
    try {
      await onSave({
        triggerType,
        triggerValue: triggerType === "all" ? null : triggerValue.trim(),
        replySubject: replySubject.trim(),
        replyBody: replyBody.trim(),
        isActive: true,
      });
      reset();
      onClose();
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Could not save rule.");
    } finally {
      setSaving(false);
    }
  }

  const TRIGGER_OPTS: { key: TriggerType; label: string; icon: React.ComponentProps<typeof Feather>["name"] }[] = [
    { key: "all", label: "All emails", icon: "inbox" },
    { key: "keyword", label: "Keyword", icon: "tag" },
    { key: "sender", label: "Sender email", icon: "at-sign" },
  ];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[s.modalContainer, { backgroundColor: colors.background }]} edges={["top"]}>
        <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
          <Text style={[s.modalTitle, { color: colors.foreground }]}>New Auto-Reply Rule</Text>
          <Pressable onPress={() => { reset(); onClose(); }} style={s.modalClose}>
            <Feather name="x" size={22} color={colors.foreground} />
          </Pressable>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.modalBody}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={[s.fieldLabel, { color: colors.mutedForeground }]}>TRIGGER</Text>
          <View style={[s.triggerRow, { borderColor: colors.border }]}>
            {TRIGGER_OPTS.map((opt) => (
              <Pressable
                key={opt.key}
                onPress={() => setTriggerType(opt.key)}
                style={[
                  s.triggerBtn,
                  { backgroundColor: triggerType === opt.key ? colors.primary : colors.card, borderColor: colors.border },
                ]}
              >
                <Feather name={opt.icon} size={14} color={triggerType === opt.key ? "#fff" : colors.mutedForeground} />
                <Text style={[s.triggerBtnText, { color: triggerType === opt.key ? "#fff" : colors.mutedForeground }]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {triggerType !== "all" && (
            <>
              <Text style={[s.fieldLabel, { color: colors.mutedForeground }]}>
                {triggerType === "keyword" ? "KEYWORD" : "SENDER EMAIL"}
              </Text>
              <TextInput
                style={[s.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
                placeholder={triggerType === "keyword" ? "e.g. urgent, invoice…" : "e.g. noreply@example.com"}
                placeholderTextColor={colors.mutedForeground}
                value={triggerValue}
                onChangeText={setTriggerValue}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </>
          )}

          <Text style={[s.fieldLabel, { color: colors.mutedForeground }]}>REPLY SUBJECT</Text>
          <TextInput
            style={[s.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
            placeholder="e.g. Re: Got your message"
            placeholderTextColor={colors.mutedForeground}
            value={replySubject}
            onChangeText={setReplySubject}
          />

          <Text style={[s.fieldLabel, { color: colors.mutedForeground }]}>REPLY BODY</Text>
          <TextInput
            style={[s.textArea, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
            placeholder="Your automatic reply message…"
            placeholderTextColor={colors.mutedForeground}
            value={replyBody}
            onChangeText={setReplyBody}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />

          <Pressable
            style={[s.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" size="small" />
              : <><Feather name="check" size={16} color="#fff" /><Text style={s.saveBtnText}>Save Rule</Text></>}
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

export function AutoReplySection() {
  const colors = useColors();
  const [settings, setSettings] = useState<AutoReplySettings>(DEFAULT_SETTINGS);
  const [rules, setRules] = useState<AutoReplyRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [showAddRule, setShowAddRule] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [settingsRes, rulesRes] = await Promise.all([
        authedFetch("/auto-reply/settings"),
        authedFetch("/auto-reply/rules"),
      ]);
      if (settingsRes.ok) {
        const data = await settingsRes.json();
        setSettings({ ...DEFAULT_SETTINGS, ...data });
      }
      if (rulesRes.ok) {
        const data = await rulesRes.json();
        setRules(data.rules ?? data ?? []);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function saveSettings(updated: AutoReplySettings) {
    setSavingSettings(true);
    try {
      const res = await authedFetch("/auto-reply/settings", {
        method: "PUT",
        body: JSON.stringify(updated),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error((b as any)?.error ?? "Failed to save");
      }
      setSettings(updated);
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Could not save settings.");
    } finally {
      setSavingSettings(false);
    }
  }

  async function addRule(rule: Omit<AutoReplyRule, "id">) {
    const res = await authedFetch("/auto-reply/rules", {
      method: "POST",
      body: JSON.stringify(rule),
    });
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      throw new Error((b as any)?.error ?? "Failed to create rule");
    }
    const created = await res.json();
    setRules((prev) => [created, ...prev]);
  }

  async function deleteRule(id: number) {
    Alert.alert("Delete Rule", "Remove this auto-reply rule?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          try {
            await authedFetch(`/auto-reply/rules/${id}`, { method: "DELETE" });
            setRules((prev) => prev.filter((r) => r.id !== id));
          } catch {
            Alert.alert("Error", "Could not delete rule.");
          }
        },
      },
    ]);
  }

  async function toggleRule(id: number) {
    const rule = rules.find((r) => r.id === id);
    if (!rule) return;
    const updated = { ...rule, isActive: !rule.isActive };
    setRules((prev) => prev.map((r) => (r.id === id ? updated : r)));
    try {
      await authedFetch(`/auto-reply/rules/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: updated.isActive }),
      });
    } catch {
      setRules((prev) => prev.map((r) => (r.id === id ? rule : r)));
    }
  }

  if (loading) {
    return (
      <View style={s.loadingRow}>
        <ActivityIndicator color={colors.mutedForeground} size="small" />
      </View>
    );
  }

  return (
    <>
      <View style={s.section}>
        <Text style={[s.sectionHeader, { color: colors.mutedForeground }]}>Auto-Reply</Text>

        {/* Vacation Responder */}
        <View style={[s.card, { borderColor: colors.border }]}>
          <View style={[s.row, { backgroundColor: colors.card }]}>
            <View style={[s.rowIcon, { backgroundColor: settings.vacationEnabled ? "#f59e0b20" : colors.muted }]}>
              <Feather name="sun" size={16} color={settings.vacationEnabled ? "#f59e0b" : colors.mutedForeground} />
            </View>
            <View style={s.rowContent}>
              <Text style={[s.rowLabel, { color: colors.foreground }]}>Vacation Responder</Text>
              <Text style={[s.rowDescription, { color: colors.mutedForeground }]}>
                {settings.vacationEnabled ? "Auto-replying to incoming emails" : "Automatically reply when you're away"}
              </Text>
            </View>
            {savingSettings
              ? <ActivityIndicator size="small" color={colors.mutedForeground} />
              : <Switch
                  value={settings.vacationEnabled}
                  onValueChange={(val) => saveSettings({ ...settings, vacationEnabled: val })}
                  trackColor={{ false: colors.border, true: "#f59e0b" }}
                  thumbColor="#fff"
                />}
          </View>

          {settings.vacationEnabled && (
            <>
              <View style={[s.divider, { backgroundColor: colors.border }]} />
              <View style={s.vacationBody}>
                <Text style={[s.fieldLabel, { color: colors.mutedForeground }]}>SUBJECT</Text>
                <TextInput
                  style={[s.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                  value={settings.vacationSubject}
                  onChangeText={(v) => setSettings({ ...settings, vacationSubject: v })}
                  onEndEditing={() => saveSettings(settings)}
                  placeholder="Out of office"
                  placeholderTextColor={colors.mutedForeground}
                />
                <Text style={[s.fieldLabel, { color: colors.mutedForeground }]}>MESSAGE</Text>
                <TextInput
                  style={[s.textArea, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                  value={settings.vacationBody}
                  onChangeText={(v) => setSettings({ ...settings, vacationBody: v })}
                  onEndEditing={() => saveSettings(settings)}
                  placeholder="I'm currently out of the office…"
                  placeholderTextColor={colors.mutedForeground}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </>
          )}
        </View>

        {/* Rules */}
        <View style={[s.card, { borderColor: colors.border, marginTop: 10 }]}>
          <View style={[s.rulesHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <View style={[s.rowIcon, { backgroundColor: colors.muted }]}>
              <Feather name="zap" size={16} color={colors.mutedForeground} />
            </View>
            <View style={s.rowContent}>
              <Text style={[s.rowLabel, { color: colors.foreground }]}>Reply Rules</Text>
              <Text style={[s.rowDescription, { color: colors.mutedForeground }]}>
                {rules.length === 0 ? "Trigger replies by keyword or sender" : `${rules.length} rule${rules.length !== 1 ? "s" : ""} configured`}
              </Text>
            </View>
            <Pressable
              onPress={() => setShowAddRule(true)}
              style={[s.addRuleBtn, { backgroundColor: colors.primary }]}
            >
              <Feather name="plus" size={14} color="#fff" />
              <Text style={s.addRuleBtnText}>Add</Text>
            </Pressable>
          </View>
          {rules.map((rule, i) => (
            <RuleRow
              key={rule.id}
              rule={rule}
              onDelete={() => deleteRule(rule.id)}
              onToggle={() => toggleRule(rule.id)}
            />
          ))}
          {rules.length === 0 && (
            <Pressable
              onPress={() => setShowAddRule(true)}
              style={[s.emptyRules, { backgroundColor: colors.card }]}
            >
              <Feather name="plus-circle" size={20} color={colors.mutedForeground} />
              <Text style={[s.emptyRulesText, { color: colors.mutedForeground }]}>Add your first auto-reply rule</Text>
            </Pressable>
          )}
        </View>
      </View>

      <AddRuleModal
        visible={showAddRule}
        onClose={() => setShowAddRule(false)}
        onSave={addRule}
      />
    </>
  );
}

const s = StyleSheet.create({
  section: { gap: 0 },
  sectionHeader: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  card: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 13, gap: 12 },
  rowIcon: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  rowContent: { flex: 1, minWidth: 0 },
  rowLabel: { fontSize: 14, fontFamily: "Inter_500Medium" },
  rowDescription: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 60 },
  vacationBody: { paddingHorizontal: 16, paddingBottom: 16, gap: 6 },
  fieldLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.6, marginTop: 8, marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: "Inter_400Regular" },
  textArea: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: "Inter_400Regular", minHeight: 100 },
  rulesHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 13, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  addRuleBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  addRuleBtnText: { color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  ruleRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  ruleIcon: { width: 28, height: 28, borderRadius: 7, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  ruleInfo: { flex: 1, minWidth: 0 },
  ruleTrigger: { fontSize: 13, fontFamily: "Inter_500Medium" },
  ruleReply: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  deleteBtn: { padding: 4 },
  emptyRules: { alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 24, flexDirection: "row" },
  emptyRulesText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  loadingRow: { paddingVertical: 20, alignItems: "center" },
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  modalTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  modalClose: { padding: 4 },
  modalBody: { padding: 20, gap: 4, paddingBottom: 60 },
  triggerRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 16 },
  triggerBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  triggerBtnText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, paddingVertical: 15, marginTop: 24 },
  saveBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
