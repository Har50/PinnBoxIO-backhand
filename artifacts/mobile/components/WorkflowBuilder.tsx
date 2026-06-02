import { useState, useEffect, useCallback } from "react";
import {
  View, Text, Pressable, TextInput, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Modal, Switch,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { getAuthToken } from "@/lib/authToken";

const API_BASE = process.env.EXPO_PUBLIC_API_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_API_DOMAIN}`
  : process.env.EXPO_PUBLIC_DOMAIN
    ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
    : "";

type ConditionField = "from" | "subject" | "has_attachment" | "body";
type ConditionOp = "contains" | "equals" | "starts_with" | "is_true";
type ActionType = "label" | "mark_read" | "archive" | "forward" | "auto_reply" | "notify";

interface Condition {
  field: ConditionField;
  op: ConditionOp;
  value: string;
}

interface Action {
  type: ActionType;
  value: string;
}

export interface Workflow {
  id: number;
  name: string;
  enabled: boolean;
  conditions: Condition[];
  actions: Action[];
}

const CONDITION_FIELDS: { value: ConditionField; label: string }[] = [
  { value: "from",           label: "From" },
  { value: "subject",        label: "Subject" },
  { value: "body",           label: "Body contains" },
  { value: "has_attachment", label: "Has attachment" },
];

const CONDITION_OPS: { value: ConditionOp; label: string }[] = [
  { value: "contains",   label: "contains" },
  { value: "equals",     label: "equals" },
  { value: "starts_with",label: "starts with" },
  { value: "is_true",    label: "is true" },
];

const ACTION_TYPES: { value: ActionType; label: string; icon: string; placeholder: string }[] = [
  { value: "label",      label: "Add label",    icon: "tag",        placeholder: "Label name" },
  { value: "mark_read",  label: "Mark as read", icon: "check",      placeholder: "" },
  { value: "archive",    label: "Archive",      icon: "archive",    placeholder: "" },
  { value: "forward",    label: "Forward to",   icon: "corner-up-right", placeholder: "Email address" },
  { value: "auto_reply", label: "Auto-reply",   icon: "message-square", placeholder: "Reply message" },
  { value: "notify",     label: "Send notification", icon: "bell",  placeholder: "Notification text" },
];

function emptyCondition(): Condition { return { field: "from", op: "contains", value: "" }; }
function emptyAction(): Action { return { type: "label", value: "" }; }

interface WorkflowFormProps {
  initial?: Workflow;
  onSave: (w: Omit<Workflow, "id">) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}

function WorkflowForm({ initial, onSave, onCancel, saving }: WorkflowFormProps) {
  const colors = useColors();
  const [name, setName] = useState(initial?.name ?? "");
  const [conditions, setConditions] = useState<Condition[]>(initial?.conditions?.length ? initial.conditions : [emptyCondition()]);
  const [actions, setActions] = useState<Action[]>(initial?.actions?.length ? initial.actions : [emptyAction()]);
  const [enabled, setEnabled] = useState(initial?.enabled ?? true);

  function updateCondition(i: number, patch: Partial<Condition>) {
    setConditions(prev => prev.map((c, idx) => idx === i ? { ...c, ...patch } : c));
  }
  function removeCondition(i: number) { setConditions(prev => prev.filter((_, idx) => idx !== i)); }
  function updateAction(i: number, patch: Partial<Action>) {
    setActions(prev => prev.map((a, idx) => idx === i ? { ...a, ...patch } : a));
  }
  function removeAction(i: number) { setActions(prev => prev.filter((_, idx) => idx !== i)); }

  async function submit() {
    if (!name.trim()) { Alert.alert("Validation", "Workflow name is required."); return; }
    if (conditions.length === 0) { Alert.alert("Validation", "Add at least one condition."); return; }
    if (actions.length === 0) { Alert.alert("Validation", "Add at least one action."); return; }
    await onSave({ name: name.trim(), enabled, conditions, actions });
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 18, paddingBottom: 20 }}>
      {/* Name */}
      <View style={{ gap: 6 }}>
        <Text style={[sty.fieldLabel, { color: colors.foreground }]}>Workflow Name</Text>
        <TextInput
          style={[sty.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.muted }]}
          value={name} onChangeText={setName}
          placeholder="e.g. Label newsletters"
          placeholderTextColor={colors.mutedForeground}
        />
      </View>

      {/* Enabled toggle */}
      <View style={[sty.row, { borderColor: colors.border }]}>
        <Text style={[sty.fieldLabel, { color: colors.foreground, flex: 1, marginBottom: 0 }]}>Active</Text>
        <Switch value={enabled} onValueChange={setEnabled} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#fff" />
      </View>

      {/* Conditions */}
      <View style={{ gap: 8 }}>
        <View style={sty.sectionHeaderRow}>
          <Text style={[sty.sectionTitle, { color: colors.foreground }]}>Conditions (ALL must match)</Text>
          <Pressable onPress={() => setConditions(prev => [...prev, emptyCondition()])} style={[sty.addSmallBtn, { backgroundColor: colors.primary + "15" }]}>
            <Feather name="plus" size={13} color={colors.primary} />
          </Pressable>
        </View>
        {conditions.map((c, i) => (
          <View key={i} style={[sty.conditionCard, { borderColor: colors.border, backgroundColor: colors.muted }]}>
            <View style={sty.conditionRow}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                {CONDITION_FIELDS.map(f => (
                  <Pressable
                    key={f.value}
                    onPress={() => updateCondition(i, { field: f.value, op: f.value === "has_attachment" ? "is_true" : c.op })}
                    style={[sty.chip, { backgroundColor: c.field === f.value ? colors.primary : colors.card, borderColor: c.field === f.value ? colors.primary : colors.border }]}
                  >
                    <Text style={[sty.chipText, { color: c.field === f.value ? "#fff" : colors.foreground }]}>{f.label}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <Pressable onPress={() => removeCondition(i)} style={{ padding: 4 }}>
                <Feather name="x" size={14} color={colors.mutedForeground} />
              </Pressable>
            </View>
            {c.field !== "has_attachment" && (
              <View style={{ gap: 6 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  {CONDITION_OPS.filter(o => o.value !== "is_true").map(o => (
                    <Pressable
                      key={o.value}
                      onPress={() => updateCondition(i, { op: o.value })}
                      style={[sty.chip, { backgroundColor: c.op === o.value ? colors.primary + "20" : colors.card, borderColor: c.op === o.value ? colors.primary : colors.border }]}
                    >
                      <Text style={[sty.chipText, { color: c.op === o.value ? colors.primary : colors.mutedForeground }]}>{o.label}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
                <TextInput
                  style={[sty.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
                  value={c.value} onChangeText={v => updateCondition(i, { value: v })}
                  placeholder={`Value to match…`}
                  placeholderTextColor={colors.mutedForeground}
                />
              </View>
            )}
          </View>
        ))}
      </View>

      {/* Actions */}
      <View style={{ gap: 8 }}>
        <View style={sty.sectionHeaderRow}>
          <Text style={[sty.sectionTitle, { color: colors.foreground }]}>Actions (run in order)</Text>
          <Pressable onPress={() => setActions(prev => [...prev, emptyAction()])} style={[sty.addSmallBtn, { backgroundColor: colors.primary + "15" }]}>
            <Feather name="plus" size={13} color={colors.primary} />
          </Pressable>
        </View>
        {actions.map((a, i) => {
          const def = ACTION_TYPES.find(t => t.value === a.type)!;
          const needsValue = !!def.placeholder;
          return (
            <View key={i} style={[sty.conditionCard, { borderColor: colors.border, backgroundColor: colors.muted }]}>
              <View style={sty.conditionRow}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  {ACTION_TYPES.map(at => (
                    <Pressable
                      key={at.value}
                      onPress={() => updateAction(i, { type: at.value, value: "" })}
                      style={[sty.chip, { backgroundColor: a.type === at.value ? colors.primary : colors.card, borderColor: a.type === at.value ? colors.primary : colors.border }]}
                    >
                      <Feather name={at.icon as any} size={11} color={a.type === at.value ? "#fff" : colors.mutedForeground} />
                      <Text style={[sty.chipText, { color: a.type === at.value ? "#fff" : colors.foreground }]}>{at.label}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
                <Pressable onPress={() => removeAction(i)} style={{ padding: 4 }}>
                  <Feather name="x" size={14} color={colors.mutedForeground} />
                </Pressable>
              </View>
              {needsValue && (
                <TextInput
                  style={[sty.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
                  value={a.value} onChangeText={v => updateAction(i, { value: v })}
                  placeholder={def.placeholder}
                  placeholderTextColor={colors.mutedForeground}
                  multiline={a.type === "auto_reply"}
                  numberOfLines={a.type === "auto_reply" ? 3 : 1}
                />
              )}
            </View>
          );
        })}
      </View>

      <Pressable style={[sty.saveBtn, { backgroundColor: saving ? colors.muted : colors.primary }]} onPress={submit} disabled={saving}>
        {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={sty.saveBtnText}>{initial ? "Update Workflow" : "Create Workflow"}</Text>}
      </Pressable>
      <Pressable style={[sty.cancelBtn, { borderColor: colors.border }]} onPress={onCancel}>
        <Text style={[sty.cancelText, { color: colors.mutedForeground }]}>Cancel</Text>
      </Pressable>
    </ScrollView>
  );
}

export function WorkflowBuilder() {
  const colors = useColors();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "create" | "edit">("list");
  const [editTarget, setEditTarget] = useState<Workflow | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getAuthToken();
      const res = await fetch(`${API_BASE}/api/settings/workflows`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) setWorkflows(await res.json());
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSave(data: Omit<Workflow, "id">) {
    setSaving(true);
    try {
      const token = await getAuthToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      let res: Response;
      if (editTarget) {
        res = await fetch(`${API_BASE}/api/settings/workflows/${editTarget.id}`, {
          method: "PUT", headers, body: JSON.stringify(data),
        });
      } else {
        res = await fetch(`${API_BASE}/api/settings/workflows`, {
          method: "POST", headers, body: JSON.stringify(data),
        });
      }
      if (res.ok) { await load(); setView("list"); }
      else Alert.alert("Error", "Could not save workflow.");
    } catch { Alert.alert("Error", "Network error."); }
    setSaving(false);
  }

  async function handleToggle(w: Workflow) {
    const updated = { ...w, enabled: !w.enabled };
    setWorkflows(prev => prev.map(x => x.id === w.id ? updated : x));
    const token = await getAuthToken();
    if (token) {
      await fetch(`${API_BASE}/api/settings/workflows/${w.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(updated),
      }).catch(() => {});
    }
  }

  async function handleDelete(id: number) {
    Alert.alert("Delete Workflow", "Remove this automation permanently?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          setWorkflows(prev => prev.filter(w => w.id !== id));
          const token = await getAuthToken();
          if (token) {
            await fetch(`${API_BASE}/api/settings/workflows/${id}`, {
              method: "DELETE",
              headers: { Authorization: `Bearer ${token}` },
            }).catch(() => {});
          }
        },
      },
    ]);
  }

  if (view === "create" || view === "edit") {
    return (
      <View style={[sty.formContainer, { backgroundColor: colors.background }]}>
        <View style={sty.formHeader}>
          <Pressable onPress={() => setView("list")} style={sty.formBackBtn}>
            <Feather name="arrow-left" size={18} color={colors.primary} />
            <Text style={[sty.formBackText, { color: colors.primary }]}>Workflows</Text>
          </Pressable>
          <Text style={[sty.formTitle, { color: colors.foreground }]}>
            {view === "create" ? "New Workflow" : "Edit Workflow"}
          </Text>
        </View>
        <WorkflowForm
          initial={editTarget ?? undefined}
          onSave={handleSave}
          onCancel={() => setView("list")}
          saving={saving}
        />
      </View>
    );
  }

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={[sty.sectionHeader, { color: colors.mutedForeground }]}>WORKFLOW BUILDER</Text>
        <Pressable
          onPress={() => { setEditTarget(null); setView("create"); }}
          style={[sty.newBtn, { backgroundColor: colors.primary + "15" }]}
        >
          <Feather name="plus" size={14} color={colors.primary} />
          <Text style={[sty.newBtnText, { color: colors.primary }]}>Add Workflow</Text>
        </Pressable>
      </View>

      {loading && <ActivityIndicator color={colors.primary} />}

      {!loading && workflows.length === 0 && (
        <View style={[sty.emptyCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Feather name="zap" size={28} color={colors.mutedForeground} />
          <Text style={[sty.emptyTitle, { color: colors.foreground }]}>No workflows yet</Text>
          <Text style={[sty.emptySub, { color: colors.mutedForeground }]}>
            Automate actions based on email conditions — label, archive, forward, and more.
          </Text>
        </View>
      )}

      {workflows.length > 0 && (
        <View style={[sty.card, { borderColor: colors.border }]}>
          {workflows.map((w, idx) => (
            <View key={w.id}>
              {idx > 0 && <View style={[sty.divider, { backgroundColor: colors.border }]} />}
              <View style={[sty.workflowRow, { backgroundColor: colors.card }]}>
                <View style={[sty.wfIcon, { backgroundColor: colors.primary + "15" }]}>
                  <Feather name="zap" size={14} color={colors.primary} />
                </View>
                <View style={sty.wfInfo}>
                  <Text style={[sty.wfName, { color: colors.foreground }]}>{w.name}</Text>
                  <Text style={[sty.wfMeta, { color: colors.mutedForeground }]}>
                    {w.conditions.length} condition{w.conditions.length !== 1 ? "s" : ""} · {w.actions.length} action{w.actions.length !== 1 ? "s" : ""}
                  </Text>
                </View>
                <Pressable onPress={() => { setEditTarget(w); setView("edit"); }} style={{ padding: 6 }}>
                  <Feather name="edit-2" size={15} color={colors.mutedForeground} />
                </Pressable>
                <Switch
                  value={w.enabled}
                  onValueChange={() => handleToggle(w)}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#fff"
                />
                <Pressable onPress={() => handleDelete(w.id)} style={{ padding: 6 }}>
                  <Feather name="trash-2" size={15} color="#ef4444" />
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const sty = StyleSheet.create({
  sectionHeader: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8 },
  newBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  newBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  emptyCard: { borderRadius: 16, borderWidth: 1, padding: 28, alignItems: "center", gap: 8 },
  emptyTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  emptySub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  card: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 56 },
  workflowRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14 },
  wfIcon: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  wfInfo: { flex: 1, minWidth: 0 },
  wfName: { fontSize: 14, fontFamily: "Inter_500Medium" },
  wfMeta: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  formContainer: { borderRadius: 16, padding: 16, gap: 16 },
  formHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 4 },
  formBackBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  formBackText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  formTitle: { flex: 1, fontSize: 16, fontFamily: "Inter_600SemiBold" },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 2 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: "Inter_400Regular" },
  row: { flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12 },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  addSmallBtn: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  conditionCard: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 8 },
  conditionRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  chip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  saveBtn: { borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  saveBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  cancelBtn: { borderRadius: 12, borderWidth: 1, paddingVertical: 12, alignItems: "center" },
  cancelText: { fontSize: 14, fontFamily: "Inter_500Medium" },
});
