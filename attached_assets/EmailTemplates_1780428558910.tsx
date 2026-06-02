import React, { useState, useEffect } from "react";
import { Modal, View, Text, Pressable, TextInput, Alert, ActivityIndicator, StyleSheet, ScrollView } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { getAuthToken } from "@/lib/authToken";

const API_BASE = process.env.EXPO_PUBLIC_API_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_API_DOMAIN}`
  : process.env.EXPO_PUBLIC_DOMAIN
    ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
    : "https://pinn-box-io.replit.app";

type Template = {
  id: number;
  name: string;
  subject: string;
  body: string;
  createdAt: string;
};

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelectTemplate: (template: { subject: string; body: string }) => void;
}

export function EmailTemplates({ visible, onClose, onSelectTemplate }: Props) {
  const colors = useColors();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSave, setShowSave] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveSubject, setSaveSubject] = useState("");
  const [saveBody, setSaveBody] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchTemplates = async () => {
    setLoading(true);
    const token = await getAuthToken();
    if (!token) { setLoading(false); return; }
    try {
      const res = await fetch(`${API_BASE}/api/templates`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates ?? data ?? []);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { if (visible) fetchTemplates(); }, [visible]);

  const handleSaveTemplate = async () => {
    if (!saveName.trim() || !saveBody.trim()) {
      Alert.alert("Validation", "Name and body are required.");
      return;
    }
    setSaving(true);
    const token = await getAuthToken();
    if (token) {
      try {
        await fetch(`${API_BASE}/api/templates`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ name: saveName, subject: saveSubject, body: saveBody }),
        });
      } catch {}
    }
    setSaving(false);
    setShowSave(false);
    setSaveName("");
    setSaveSubject("");
    setSaveBody("");
    fetchTemplates();
  };

  const handleDeleteTemplate = (id: number) => {
    Alert.alert("Delete Template", "Remove this template?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        setTemplates((p) => p.filter((t) => t.id !== id));
        const token = await getAuthToken();
        if (token) await fetch(`${API_BASE}/api/templates/${id}`, { method: "DELETE" });
      }},
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable onPress={onClose} style={styles.closeBtn}><Feather name="x" size={22} color={colors.foreground} /></Pressable>
          <Text style={[styles.title, { color: colors.foreground }]}>Email Templates</Text>
          <Pressable onPress={() => { setSaveName(""); setSaveSubject(""); setSaveBody(""); setShowSave(true); }} style={[styles.addBtn, { backgroundColor: colors.primary + "15" }]}>
            <Feather name="plus" size={16} color={colors.primary} />
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
        ) : templates.length === 0 && !showSave ? (
          <View style={styles.center}>
            <Feather name="file-text" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No templates yet. Save a draft as a template to reuse later.</Text>
            <Pressable onPress={() => { setSaveName(""); setSaveSubject(""); setSaveBody(""); setShowSave(true); }} style={[styles.createBtn, { backgroundColor: colors.primary }]}>
              <Text style={styles.createBtnText}>Create Template</Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            {showSave && (
              <View style={[styles.saveCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <TextInput style={[styles.field, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.muted }]} value={saveName} onChangeText={setSaveName} placeholder="Template name *" placeholderTextColor={colors.mutedForeground} />
                <TextInput style={[styles.field, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.muted }]} value={saveSubject} onChangeText={setSaveSubject} placeholder="Subject (optional)" placeholderTextColor={colors.mutedForeground} />
                <TextInput style={[styles.fieldMultiline, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.muted }]} value={saveBody} onChangeText={setSaveBody} placeholder="Body *" placeholderTextColor={colors.mutedForeground} multiline numberOfLines={4} />
                <View style={{ flexDirection: "row", gap: 8, justifyContent: "flex-end" }}>
                  <Pressable onPress={() => setShowSave(false)} style={[styles.cancelBtn, { borderColor: colors.border }]}><Text style={[styles.cancelBtnText, { color: colors.mutedForeground }]}>Cancel</Text></Pressable>
                  <Pressable onPress={handleSaveTemplate} disabled={saving} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
                    {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Save</Text>}
                  </Pressable>
                </View>
              </View>
            )}
            {templates.map((t) => (
              <Pressable
                key={t.id}
                style={[styles.templateRow, { borderBottomColor: colors.border }]}
                onPress={() => { onSelectTemplate({ subject: t.subject, body: t.body }); onClose(); }}
              >
                <View style={[styles.templateIcon, { backgroundColor: colors.primary + "15" }]}>
                  <Feather name="file-text" size={16} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.templateName, { color: colors.foreground }]}>{t.name}</Text>
                  {t.subject ? <Text style={[styles.templateSubject, { color: colors.mutedForeground }]}>{t.subject}</Text> : null}
                  <Text style={[styles.templatePreview, { color: colors.mutedForeground }]} numberOfLines={2}>{t.body}</Text>
                </View>
                <Pressable onPress={() => handleDeleteTemplate(t.id)} style={styles.deleteBtn}>
                  <Feather name="trash-2" size={14} color={colors.destructive} />
                </Pressable>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

interface SaveButtonProps {
  subject: string;
  body: string;
}

export function SaveTemplateButton({ subject, body }: SaveButtonProps) {
  const colors = useColors();
  const [showSave, setShowSave] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert("Validation", "Template name is required."); return; }
    setSaving(true);
    const token = await getAuthToken();
    if (token) {
      try {
        await fetch(`${API_BASE}/api/templates`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ name, subject, body }),
        });
        Alert.alert("Saved", "Template saved successfully.");
      } catch {}
    }
    setSaving(false);
    setShowSave(false);
    setName("");
  };

  return (
    <>
      <Pressable onPress={() => setShowSave(true)} style={[styles.saveQuickBtn, { borderColor: colors.border }]}>
        <Feather name="bookmark" size={14} color={colors.mutedForeground} />
      </Pressable>
      <Modal visible={showSave} transparent animationType="slide" onRequestClose={() => setShowSave(false)}>
        <Pressable style={styles.overlay} onPress={() => setShowSave(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.card }]} onPress={() => {}}>
            <View style={[styles.handle, { backgroundColor: colors.muted }]} />
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Save as Template</Text>
            <TextInput style={[styles.field, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.muted }]} value={name} onChangeText={setName} placeholder="Template name *" placeholderTextColor={colors.mutedForeground} autoFocus />
            <View style={{ flexDirection: "row", gap: 8, justifyContent: "flex-end" }}>
              <Pressable onPress={() => setShowSave(false)} style={[styles.cancelBtn, { borderColor: colors.border }]}><Text style={[styles.cancelBtnText, { color: colors.mutedForeground }]}>Cancel</Text></Pressable>
              <Pressable onPress={handleSave} disabled={saving} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Save</Text>}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  closeBtn: { padding: 4, marginRight: 12 },
  title: { flex: 1, fontSize: 17, fontFamily: "Inter_700Bold" },
  addBtn: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  createBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  createBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  saveCard: { margin: 16, borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  field: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13, fontFamily: "Inter_400Regular" },
  fieldMultiline: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13, fontFamily: "Inter_400Regular", minHeight: 80, textAlignVertical: "top" },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  cancelBtnText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, minWidth: 80, alignItems: "center" },
  saveBtnText: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  templateRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  templateIcon: { width: 36, height: 36, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  templateName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  templateSubject: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  templatePreview: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  deleteBtn: { padding: 8 },
  saveQuickBtn: { width: 32, height: 32, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  overlay: { flex: 1, backgroundColor: "#00000050", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36, gap: 12 },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 4 },
  sheetTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 4 },
});
