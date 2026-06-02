import React, { useState, useEffect } from "react";
import { View, Text, Pressable, TextInput, Alert, ActivityIndicator, Switch, StyleSheet, ScrollView } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { getAuthToken } from "@/lib/authToken";

const API_BASE = process.env.EXPO_PUBLIC_API_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_API_DOMAIN}`
  : process.env.EXPO_PUBLIC_DOMAIN
    ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
    : "https://pinn-box-io.replit.app";

type Condition = {
  field: "from" | "subject" | "hasAttachment" | "folder";
  operator: "contains" | "equals" | "notEquals" | "isInbox" | "isSent";
  value: string;
};

type Action = {
  type: "label" | "markRead" | "archive" | "forward" | "autoReply" | "notify";
  value: string;
};

type Workflow = {
  id: number;
  name: string;
  enabled: boolean;
  conditions: Condition[];
  actions: Action[];
};

function SectionHeader({ title }: { title: string }) {
  const colors = useColors();
  return <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>{title}</Text>;
}

function Card({ children, colors }: { children: React.ReactNode; colors: any }) {
  return <View style={[styles.card, { borderColor: colors.border }]}>{children}</View>;
}

const CONDITION_FIELDS = ["from", "subject", "hasAttachment", "folder"] as const;
const CONDITION_OPERATORS: Record<string, string[]> = {
  from: ["contains", "equals", "notEquals"],
  subject: ["contains", "equals"],
  hasAttachment: ["isInbox", "isSent"],
  folder: ["isInbox", "isSent"],
};
const ACTION_TYPES = ["label", "markRead", "archive", "forward", "autoReply", "notify"] as const;

export function WorkflowBuilderSection() {
  const colors = useColors();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newWorkflow, setNewWorkflow] = useState<Omit<Workflow, "id">>({
    name: "", enabled: true, conditions: [], actions: [],
  });

  const fetchWorkflows = async () => {
    setLoading(true);
    const token = await getAuthToken();
    if (!token) { setLoading(false); return; }
    try {
      const res = await fetch(`${API_BASE}/api/settings/workflows`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setWorkflows(data.workflows ?? data ?? []);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchWorkflows(); }, []);

  const toggleWorkflow = async (id: number, enabled: boolean) => {
    setWorkflows((prev) => prev.map((w) => (w.id === id ? { ...w, enabled } : w)));
    const token = await getAuthToken();
    if (token) {
      await fetch(`${API_BASE}/api/settings/workflows/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ enabled }),
      });
    }
  };

  const deleteWorkflow = (id: number) => {
    Alert.alert("Delete Workflow", "Remove this automation?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        setWorkflows((prev) => prev.filter((w) => w.id !== id));
        const token = await getAuthToken();
        if (token) await fetch(`${API_BASE}/api/settings/workflows/${id}`, { method: "DELETE" });
      }},
    ]);
  };

  const addCondition = () => {
    setNewWorkflow((prev) => ({
      ...prev, conditions: [...prev.conditions, { field: "from", operator: "contains", value: "" }],
    }));
  };

  const updateCondition = (index: number, updates: Partial<Condition>) => {
    setNewWorkflow((prev) => {
      const conditions = [...prev.conditions];
      conditions[index] = { ...conditions[index], ...updates };
      if (updates.field && ["hasAttachment", "folder"].includes(updates.field)) {
        conditions[index] = { ...conditions[index], operator: "isInbox", value: "" };
      }
      return { ...prev, conditions };
    });
  };

  const removeCondition = (index: number) => {
    setNewWorkflow((prev) => ({
      ...prev, conditions: prev.conditions.filter((_, i) => i !== index),
    }));
  };

  const addAction = () => {
    setNewWorkflow((prev) => ({
      ...prev, actions: [...prev.actions, { type: "label", value: "" }],
    }));
  };

  const updateAction = (index: number, updates: Partial<Action>) => {
    setNewWorkflow((prev) => {
      const actions = [...prev.actions];
      actions[index] = { ...actions[index], ...updates };
      if (updates.type === "markRead" || updates.type === "archive") {
        actions[index] = { ...actions[index], value: "" };
      }
      return { ...prev, actions };
    });
  };

  const removeAction = (index: number) => {
    setNewWorkflow((prev) => ({
      ...prev, actions: prev.actions.filter((_, i) => i !== index),
    }));
  };

  const saveWorkflow = async () => {
    if (!newWorkflow.name.trim() || newWorkflow.conditions.length === 0 || newWorkflow.actions.length === 0) {
      Alert.alert("Validation", "Name, at least one condition, and one action are required.");
      return;
    }
    const token = await getAuthToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/settings/workflows`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(newWorkflow),
      });
      if (res.ok) {
        const created = await res.json();
        setWorkflows((prev) => [...prev, created]);
        setShowAdd(false);
        setNewWorkflow({ name: "", enabled: true, conditions: [], actions: [] });
      }
    } catch {}
  };

  if (loading) return null;

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <SectionHeader title="Workflow Automations" />
        <Pressable onPress={() => setShowAdd(!showAdd)} style={[styles.addRuleBtn, { backgroundColor: colors.primary + "15" }]}>
          <Feather name="plus" size={14} color={colors.primary} />
          <Text style={[styles.addRuleBtnText, { color: colors.primary }]}>New Workflow</Text>
        </Pressable>
      </View>
      {workflows.length === 0 && !showAdd && (
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
          Automate your inbox. Create workflows that auto-label, archive, forward, or reply to emails matching your rules.
        </Text>
      )}
      {workflows.length > 0 && (
        <Card colors={colors}>
          {workflows.map((wf, idx) => (
            <View key={wf.id}>
              {idx > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
              <View style={[styles.wfRow, { backgroundColor: colors.card }]}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Feather name="zap" size={14} color={colors.primary} />
                    <Text style={[styles.wfName, { color: colors.foreground }]}>{wf.name}</Text>
                  </View>
                  <Text style={[styles.wfMeta, { color: colors.mutedForeground }]}>
                    {wf.conditions.length} condition{wf.conditions.length !== 1 ? "s" : ""} · {wf.actions.length} action{wf.actions.length !== 1 ? "s" : ""}
                  </Text>
                </View>
                <Switch
                  value={wf.enabled}
                  onValueChange={(v) => toggleWorkflow(wf.id, v)}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#fff"
                />
                <Pressable onPress={() => deleteWorkflow(wf.id)}>
                  <Feather name="trash-2" size={14} color={colors.destructive} />
                </Pressable>
              </View>
            </View>
          ))}
        </Card>
      )}
      {showAdd && (
        <Card colors={colors}>
          <View style={[styles.addForm, { backgroundColor: colors.card }]}>
            <Text style={[styles.formLabel, { color: colors.foreground }]}>Workflow Name</Text>
            <TextInput style={[styles.field, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.muted }]} value={newWorkflow.name} onChangeText={(v) => setNewWorkflow((p) => ({ ...p, name: v }))} placeholder="e.g., Auto-file invoices" placeholderTextColor={colors.mutedForeground} />

            <Text style={[styles.formLabel, { color: colors.foreground, marginTop: 8 }]}>When (conditions)</Text>
            {newWorkflow.conditions.map((cond, i) => (
              <View key={i} style={styles.condRow}>
                <View style={{ flex: 1, gap: 6 }}>
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    <Pressable onPress={() => updateCondition(i, { field: cond.field === "from" ? "subject" : "from" })} style={[styles.pill, { backgroundColor: colors.primary + "15" }]}>
                      <Text style={[styles.pillText, { color: colors.primary }]}>{cond.field}</Text>
                    </Pressable>
                    {!["hasAttachment", "folder"].includes(cond.field) && (
                      <Pressable onPress={() => updateCondition(i, { operator: cond.operator === "contains" ? "equals" : "contains" })} style={[styles.pill, { backgroundColor: colors.muted }]}>
                        <Text style={[styles.pillText, { color: colors.mutedForeground }]}>{cond.operator}</Text>
                      </Pressable>
                    )}
                  </View>
                  {!["hasAttachment", "folder"].includes(cond.field) && (
                    <TextInput style={[styles.fieldSmall, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.muted }]} value={cond.value} onChangeText={(v) => updateCondition(i, { value: v })} placeholder="value" placeholderTextColor={colors.mutedForeground} />
                  )}
                </View>
                <Pressable onPress={() => removeCondition(i)}><Feather name="x" size={14} color={colors.destructive} /></Pressable>
              </View>
            ))}
            <Pressable onPress={addCondition} style={[styles.addCondBtn, { borderColor: colors.border }]}>
              <Feather name="plus" size={12} color={colors.mutedForeground} />
              <Text style={[styles.addCondText, { color: colors.mutedForeground }]}>Add condition</Text>
            </Pressable>

            <Text style={[styles.formLabel, { color: colors.foreground, marginTop: 8 }]}>Then (actions)</Text>
            {newWorkflow.actions.map((act, i) => (
              <View key={i} style={styles.condRow}>
                <View style={{ flex: 1, gap: 6 }}>
                  <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
                    {ACTION_TYPES.map((t) => (
                      <Pressable key={t} onPress={() => updateAction(i, { type: t })} style={[styles.pill, { backgroundColor: act.type === t ? colors.primary : colors.muted }]}>
                        <Text style={[styles.pillText, { color: act.type === t ? "#fff" : colors.mutedForeground }]}>{t}</Text>
                      </Pressable>
                    ))}
                  </View>
                  {(act.type === "label" || act.type === "forward" || act.type === "autoReply") && (
                    <TextInput style={[styles.fieldSmall, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.muted }]} value={act.value} onChangeText={(v) => updateAction(i, { value: v })} placeholder={act.type === "label" ? "Label name" : act.type === "forward" ? "forward@email.com" : "Reply text"} placeholderTextColor={colors.mutedForeground} />
                  )}
                </View>
                <Pressable onPress={() => removeAction(i)}><Feather name="x" size={14} color={colors.destructive} /></Pressable>
              </View>
            ))}
            <Pressable onPress={addAction} style={[styles.addCondBtn, { borderColor: colors.border }]}>
              <Feather name="plus" size={12} color={colors.mutedForeground} />
              <Text style={[styles.addCondText, { color: colors.mutedForeground }]}>Add action</Text>
            </Pressable>

            <View style={{ flexDirection: "row", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
              <Pressable onPress={() => setShowAdd(false)} style={[styles.cancelBtn, { borderColor: colors.border }]}>
                <Text style={[styles.cancelBtnText, { color: colors.mutedForeground }]}>Cancel</Text>
              </Pressable>
              <Pressable onPress={saveWorkflow} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
                <Text style={styles.saveBtnText}>Save Workflow</Text>
              </Pressable>
            </View>
          </View>
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.8 },
  card: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 60 },
  addRuleBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  addRuleBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20, paddingHorizontal: 4 },
  wfRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  wfName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  wfMeta: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  addForm: { padding: 16, gap: 8 },
  formLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  field: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, fontFamily: "Inter_400Regular" },
  fieldSmall: { borderRadius: 6, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, fontSize: 12, fontFamily: "Inter_400Regular" },
  condRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  pillText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  addCondBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 6, borderWidth: 1, borderRadius: 8, borderStyle: "dashed", justifyContent: "center" },
  addCondText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  cancelBtnText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, alignItems: "center" },
  saveBtnText: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
