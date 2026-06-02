import { useState, useEffect, useCallback } from "react";
import {
  View, Text, Pressable, TextInput, Switch, Alert, ActivityIndicator, StyleSheet,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { getAuthToken } from "@/lib/authToken";

const API_BASE = process.env.EXPO_PUBLIC_API_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_API_DOMAIN}`
  : process.env.EXPO_PUBLIC_DOMAIN
    ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
    : "https://pinn-box-io.replit.app";

type AutoReplyRule = {
  id: number;
  trigger: "keyword" | "sender" | "all";
  value: string;
  replySubject: string;
  replyBody: string;
  enabled: boolean;
};

type VacationResponder = {
  enabled: boolean;
  subject: string;
  message: string;
  startDate: string | null;
  endDate: string | null;
};

function SectionHeader({ title }: { title: string }) {
  const colors = useColors();
  return (
    <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>{title}</Text>
  );
}

function SettingsCard({ children, colors }: { children: React.ReactNode; colors: any }) {
  return (
    <View style={[styles.card, { borderColor: colors.border }]}>
      {children}
    </View>
  );
}

export function AutoReplySection() {
  const colors = useColors();
  const [vacation, setVacation] = useState<VacationResponder>({
    enabled: false, subject: "", message: "", startDate: null, endDate: null,
  });
  const [rules, setRules] = useState<AutoReplyRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddRule, setShowAddRule] = useState(false);
  const [newRule, setNewRule] = useState<Omit<AutoReplyRule, "id">>({
    trigger: "all", value: "", replySubject: "", replyBody: "", enabled: true,
  });

  const fetchAutoReply = useCallback(async () => {
    const token = await getAuthToken();
    if (!token) { setLoading(false); return; }
    try {
      const res = await fetch(`${API_BASE}/api/settings/auto-reply`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.vacation) setVacation(data.vacation);
        if (data.rules) setRules(data.rules);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchAutoReply(); }, [fetchAutoReply]);

  const saveVacation = async (updated: VacationResponder) => {
    setVacation(updated);
    setSaving(true);
    const token = await getAuthToken();
    if (token) {
      try {
        await fetch(`${API_BASE}/api/settings/auto-reply/vacation`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(updated),
        });
      } catch {}
    }
    setSaving(false);
  };

  const addRule = async () => {
    if (!newRule.replyBody.trim()) {
      Alert.alert("Validation", "Reply body is required.");
      return;
    }
    const token = await getAuthToken();
    if (!token) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/settings/auto-reply/rules`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(newRule),
      });
      if (res.ok) {
        const created = await res.json();
        setRules((prev) => [...prev, created]);
        setShowAddRule(false);
        setNewRule({ trigger: "all", value: "", replySubject: "", replyBody: "", enabled: true });
      }
    } catch {}
    setSaving(false);
  };

  const toggleRule = async (ruleId: number, enabled: boolean) => {
    setRules((prev) => prev.map((r) => (r.id === ruleId ? { ...r, enabled } : r)));
    const token = await getAuthToken();
    if (token) {
      try {
        await fetch(`${API_BASE}/api/settings/auto-reply/rules/${ruleId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ enabled }),
        });
      } catch {}
    }
  };

  const deleteRule = (ruleId: number) => {
    Alert.alert("Delete Rule", "Remove this auto-reply rule?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          setRules((prev) => prev.filter((r) => r.id !== ruleId));
          const token = await getAuthToken();
          if (token) {
            try {
              await fetch(`${API_BASE}/api/settings/auto-reply/rules/${ruleId}`, { method: "DELETE" });
            } catch {}
          }
        },
      },
    ]);
  };

  if (loading) return null;

  return (
    <View style={{ gap: 8 }}>
      {/* Vacation Responder */}
      <View style={styles.section}>
        <SectionHeader title="Vacation Responder" />
        <SettingsCard colors={colors}>
          <View style={[styles.row, { backgroundColor: colors.card }]}>
            <View style={[styles.rowIcon, { backgroundColor: colors.primary + "18" }]}>
              <Feather name="sun" size={16} color={colors.primary} />
            </View>
            <View style={styles.rowContent}>
              <Text style={[styles.rowLabel, { color: colors.foreground }]}>Auto-reply while away</Text>
              <Text style={[styles.rowDesc, { color: colors.mutedForeground }]}>
                {vacation.enabled ? "Active" : "Send automatic replies"}
              </Text>
            </View>
            <Switch
              value={vacation.enabled}
              onValueChange={(v) => saveVacation({ ...vacation, enabled: v })}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>
          {vacation.enabled && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={[styles.fieldRow, { backgroundColor: colors.card }]}>
                <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Subject</Text>
                <TextInput
                  style={[styles.fieldInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.muted }]}
                  value={vacation.subject}
                  onChangeText={(v) => setVacation((p) => ({ ...p, subject: v }))}
                  onBlur={() => saveVacation(vacation)}
                  placeholder="Out of office"
                  placeholderTextColor={colors.mutedForeground}
                />
              </View>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={[styles.fieldRow, { backgroundColor: colors.card, paddingBottom: 16 }]}>
                <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Message</Text>
                <TextInput
                  style={[styles.fieldInputMultiline, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.muted }]}
                  value={vacation.message}
                  onChangeText={(v) => setVacation((p) => ({ ...p, message: v }))}
                  onBlur={() => saveVacation(vacation)}
                  placeholder="I'm currently out of the office..."
                  placeholderTextColor={colors.mutedForeground}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </>
          )}
        </SettingsCard>
      </View>

      {/* Auto-Reply Rules */}
      <View style={styles.section}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <SectionHeader title="Auto-Reply Rules" />
          <Pressable onPress={() => setShowAddRule(!showAddRule)} style={[styles.addRuleBtn, { backgroundColor: colors.primary + "15" }]}>
            <Feather name="plus" size={14} color={colors.primary} />
            <Text style={[styles.addRuleBtnText, { color: colors.primary }]}>Add Rule</Text>
          </Pressable>
        </View>
        {rules.length === 0 && !showAddRule && (
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            No auto-reply rules configured. Rules automatically respond to incoming emails based on keywords or sender.
          </Text>
        )}
        {rules.length > 0 && (
          <SettingsCard colors={colors}>
            {rules.map((rule, idx) => (
              <View key={rule.id}>
                {idx > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                <View style={[styles.ruleRow, { backgroundColor: colors.card }]}>
                  <View style={styles.ruleInfo}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <View style={[styles.triggerBadge, { backgroundColor: colors.primary + "15" }]}>
                        <Text style={[styles.triggerBadgeText, { color: colors.primary }]}>
                          {rule.trigger === "all" ? "All" : rule.trigger === "sender" ? "Sender" : "Keyword"}
                        </Text>
                      </View>
                      <Text style={[styles.ruleValue, { color: colors.foreground }]} numberOfLines={1}>
                        {rule.value || "—"}
                      </Text>
                    </View>
                    <Text style={[styles.replyPreview, { color: colors.mutedForeground }]} numberOfLines={1}>
                      {rule.replyBody}
                    </Text>
                  </View>
                  <Switch
                    value={rule.enabled}
                    onValueChange={(v) => toggleRule(rule.id, v)}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor="#fff"
                  />
                  <Pressable onPress={() => deleteRule(rule.id)} style={styles.deleteRuleBtn}>
                    <Feather name="trash-2" size={14} color={colors.destructive} />
                  </Pressable>
                </View>
              </View>
            ))}
          </SettingsCard>
        )}
        {showAddRule && (
          <SettingsCard colors={colors}>
            <View style={[styles.row, { backgroundColor: colors.card, flexDirection: "column", gap: 10 }]}>
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Trigger</Text>
              <View style={{ flexDirection: "row", gap: 6 }}>
                {(["all", "sender", "keyword"] as const).map((t) => (
                  <Pressable
                    key={t}
                    onPress={() => setNewRule((p) => ({ ...p, trigger: t, value: t === "all" ? "" : p.value }))}
                    style={[styles.triggerOption, { backgroundColor: newRule.trigger === t ? colors.primary : colors.muted }]}
                  >
                    <Text style={[styles.triggerOptionText, { color: newRule.trigger === t ? "#fff" : colors.mutedForeground }]}>
                      {t === "all" ? "All emails" : t === "sender" ? "Specific sender" : "Keyword match"}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {newRule.trigger !== "all" && (
                <TextInput
                  style={[styles.fieldInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.muted }]}
                  value={newRule.value}
                  onChangeText={(v) => setNewRule((p) => ({ ...p, value: v }))}
                  placeholder={newRule.trigger === "sender" ? "sender@example.com" : "keyword"}
                  placeholderTextColor={colors.mutedForeground}
                />
              )}
              <TextInput
                style={[styles.fieldInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.muted }]}
                value={newRule.replySubject}
                onChangeText={(v) => setNewRule((p) => ({ ...p, replySubject: v }))}
                placeholder="Reply subject (optional)"
                placeholderTextColor={colors.mutedForeground}
              />
              <TextInput
                style={[styles.fieldInputMultiline, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.muted }]}
                value={newRule.replyBody}
                onChangeText={(v) => setNewRule((p) => ({ ...p, replyBody: v }))}
                placeholder="Reply body *"
                placeholderTextColor={colors.mutedForeground}
                multiline
                numberOfLines={3}
              />
              <View style={{ flexDirection: "row", gap: 8, justifyContent: "flex-end" }}>
                <Pressable onPress={() => setShowAddRule(false)} style={[styles.cancelBtn, { borderColor: colors.border }]}>
                  <Text style={[styles.cancelBtnText, { color: colors.mutedForeground }]}>Cancel</Text>
                </Pressable>
                <Pressable onPress={addRule} disabled={saving} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
                  {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Add Rule</Text>}
                </Pressable>
              </View>
            </View>
          </SettingsCard>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 8 },
  sectionHeader: {
    fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.8,
  },
  card: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  row: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 13, gap: 12,
  },
  rowIcon: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  rowContent: { flex: 1, minWidth: 0 },
  rowLabel: { fontSize: 14, fontFamily: "Inter_500Medium" },
  rowDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 60 },
  fieldRow: { paddingHorizontal: 16, paddingTop: 12, gap: 6 },
  fieldLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  fieldInput: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, fontFamily: "Inter_400Regular" },
  fieldInputMultiline: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, fontFamily: "Inter_400Regular", minHeight: 70, textAlignVertical: "top" },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20, paddingHorizontal: 4 },
  addRuleBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  addRuleBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  ruleRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  ruleInfo: { flex: 1, minWidth: 0, gap: 4 },
  triggerBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, alignSelf: "flex-start" },
  triggerBadgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  ruleValue: { fontSize: 12, fontFamily: "Inter_500Medium" },
  replyPreview: { fontSize: 11, fontFamily: "Inter_400Regular" },
  deleteRuleBtn: { padding: 6 },
  triggerOption: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  triggerOptionText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  cancelBtnText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, minWidth: 80, alignItems: "center" },
  saveBtnText: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
