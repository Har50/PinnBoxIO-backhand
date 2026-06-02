import { useState, useEffect, useCallback } from "react";
import {
  Modal, View, Text, Pressable, TextInput, StyleSheet,
  ScrollView, Alert, ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { getAuthToken } from "@/lib/authToken";

const API_BASE = process.env.EXPO_PUBLIC_API_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_API_DOMAIN}`
  : process.env.EXPO_PUBLIC_DOMAIN
    ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
    : "";

export interface EmailTemplate {
  id: number;
  name: string;
  subject: string;
  body: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onInsert: (template: EmailTemplate) => void;
  currentSubject?: string;
  currentBody?: string;
}

export function EmailTemplatesModal({ visible, onClose, onInsert, currentSubject, currentBody }: Props) {
  const colors = useColors();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<"list" | "create" | "edit">("list");
  const [editTarget, setEditTarget] = useState<EmailTemplate | null>(null);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getAuthToken();
      const res = await fetch(`${API_BASE}/api/settings/templates`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) setTemplates(await res.json());
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    if (visible) { load(); setView("list"); }
  }, [visible, load]);

  function openCreate() {
    setName("");
    setSubject(currentSubject ?? "");
    setBody(currentBody ?? "");
    setEditTarget(null);
    setView("create");
  }

  function openEdit(t: EmailTemplate) {
    setName(t.name);
    setSubject(t.subject);
    setBody(t.body);
    setEditTarget(t);
    setView("edit");
  }

  async function handleSave() {
    if (!name.trim()) { Alert.alert("Validation", "Template name is required."); return; }
    setSaving(true);
    try {
      const token = await getAuthToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      const payload = { name: name.trim(), subject: subject.trim(), body: body.trim() };
      let res: Response;
      if (editTarget) {
        res = await fetch(`${API_BASE}/api/settings/templates/${editTarget.id}`, {
          method: "PUT", headers, body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`${API_BASE}/api/settings/templates`, {
          method: "POST", headers, body: JSON.stringify(payload),
        });
      }
      if (res.ok) {
        await load();
        setView("list");
      } else {
        Alert.alert("Error", "Could not save template.");
      }
    } catch { Alert.alert("Error", "Network error."); }
    setSaving(false);
  }

  async function handleDelete(id: number) {
    Alert.alert("Delete Template", "Remove this template permanently?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          const token = await getAuthToken();
          await fetch(`${API_BASE}/api/settings/templates/${id}`, {
            method: "DELETE",
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          setTemplates(prev => prev.filter(t => t.id !== id));
        },
      },
    ]);
  }

  const isForm = view === "create" || view === "edit";

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={sty.overlay} onPress={onClose}>
        <Pressable style={[sty.sheet, { backgroundColor: colors.card }]} onPress={() => {}}>
          <View style={sty.handle} />

          {/* Header */}
          <View style={sty.sheetHeader}>
            {isForm ? (
              <Pressable onPress={() => setView("list")} style={sty.backBtn}>
                <Feather name="arrow-left" size={18} color={colors.primary} />
              </Pressable>
            ) : null}
            <Text style={[sty.sheetTitle, { color: colors.foreground }]}>
              {view === "list" ? "Templates" : view === "create" ? "New Template" : "Edit Template"}
            </Text>
            {view === "list" && (
              <Pressable onPress={openCreate} style={[sty.addBtn, { backgroundColor: colors.primary }]}>
                <Feather name="plus" size={14} color="#fff" />
                <Text style={sty.addBtnText}>New</Text>
              </Pressable>
            )}
          </View>

          {view === "list" && (
            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              {loading && <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />}
              {!loading && templates.length === 0 && (
                <View style={sty.empty}>
                  <Feather name="file-text" size={36} color={colors.mutedForeground} />
                  <Text style={[sty.emptyText, { color: colors.mutedForeground }]}>No templates yet</Text>
                  <Text style={[sty.emptySub, { color: colors.mutedForeground }]}>Tap "+ New" to save your first template</Text>
                </View>
              )}
              {templates.map((t, idx) => (
                <View key={t.id} style={[sty.templateRow, { borderColor: colors.border }, idx === 0 && sty.firstRow]}>
                  <Pressable style={sty.templateMain} onPress={() => { onInsert(t); onClose(); }}>
                    <Text style={[sty.templateName, { color: colors.foreground }]}>{t.name}</Text>
                    {t.subject ? <Text style={[sty.templateSubject, { color: colors.mutedForeground }]} numberOfLines={1}>Subject: {t.subject}</Text> : null}
                    <Text style={[sty.templateBody, { color: colors.mutedForeground }]} numberOfLines={2}>{t.body}</Text>
                  </Pressable>
                  <View style={sty.templateActions}>
                    <Pressable onPress={() => openEdit(t)} style={sty.iconBtn}>
                      <Feather name="edit-2" size={15} color={colors.mutedForeground} />
                    </Pressable>
                    <Pressable onPress={() => handleDelete(t.id)} style={sty.iconBtn}>
                      <Feather name="trash-2" size={15} color="#ef4444" />
                    </Pressable>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}

          {isForm && (
            <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={sty.form}>
                <Text style={[sty.fieldLabel, { color: colors.foreground }]}>Template Name *</Text>
                <TextInput
                  style={[sty.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.muted }]}
                  value={name} onChangeText={setName}
                  placeholder="e.g. Meeting follow-up"
                  placeholderTextColor={colors.mutedForeground}
                />
                <Text style={[sty.fieldLabel, { color: colors.foreground }]}>Subject (optional)</Text>
                <TextInput
                  style={[sty.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.muted }]}
                  value={subject} onChangeText={setSubject}
                  placeholder="Pre-fill email subject"
                  placeholderTextColor={colors.mutedForeground}
                />
                <Text style={[sty.fieldLabel, { color: colors.foreground }]}>Body</Text>
                <TextInput
                  style={[sty.inputMulti, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.muted }]}
                  value={body} onChangeText={setBody}
                  placeholder="Template body text..."
                  placeholderTextColor={colors.mutedForeground}
                  multiline numberOfLines={6}
                />

                {view === "create" && (currentSubject || currentBody) && (
                  <Pressable
                    style={[sty.saveCurrentBtn, { borderColor: colors.primary }]}
                    onPress={() => { setSubject(currentSubject ?? ""); setBody(currentBody ?? ""); }}
                  >
                    <Feather name="download" size={13} color={colors.primary} />
                    <Text style={[sty.saveCurrentText, { color: colors.primary }]}>Use current compose content</Text>
                  </Pressable>
                )}

                <Pressable
                  style={[sty.saveBtn, { backgroundColor: saving ? colors.muted : colors.primary }]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={sty.saveBtnText}>Save Template</Text>
                  }
                </Pressable>
              </View>
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const sty = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "#d1d5db", alignSelf: "center", marginBottom: 12 },
  sheetHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  backBtn: { padding: 4 },
  sheetTitle: { flex: 1, fontSize: 18, fontFamily: "Inter_700Bold" },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  addBtnText: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  empty: { alignItems: "center", gap: 6, paddingVertical: 36 },
  emptyText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  emptySub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  templateRow: { paddingVertical: 12, paddingHorizontal: 4, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: "row", alignItems: "flex-start", gap: 8 },
  firstRow: { borderTopWidth: 0 },
  templateMain: { flex: 1, gap: 2 },
  templateName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  templateSubject: { fontSize: 12, fontFamily: "Inter_400Regular" },
  templateBody: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  templateActions: { flexDirection: "row", gap: 4, paddingTop: 2 },
  iconBtn: { padding: 6 },
  form: { gap: 10, paddingBottom: 8 },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: "Inter_400Regular" },
  inputMulti: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: "Inter_400Regular", minHeight: 120, textAlignVertical: "top" },
  saveCurrentBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, borderStyle: "dashed" },
  saveCurrentText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  saveBtn: { borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 4 },
  saveBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
