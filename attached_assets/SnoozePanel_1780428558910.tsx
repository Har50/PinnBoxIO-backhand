import React from "react";
import { Modal, View, Text, Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

const SNOOZE_OPTIONS = [
  { label: "Later today", icon: "clock" as const, getTime: () => { const d = new Date(); if (d.getHours() < 17) d.setHours(17, 0, 0, 0); else d.setDate(d.getDate() + 1); return d; }},
  { label: "This evening", icon: "moon" as const, getTime: () => { const d = new Date(); d.setHours(20, 0, 0, 0); return d; }},
  { label: "Tomorrow morning", icon: "sunrise" as const, getTime: () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(8, 0, 0, 0); return d; }},
  { label: "Tomorrow afternoon", icon: "sun" as const, getTime: () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(14, 0, 0, 0); return d; }},
  { label: "This weekend", icon: "calendar" as const, getTime: () => { const d = new Date(); const daysUntilSat = (6 - d.getDay() + 7) % 7 || 7; d.setDate(d.getDate() + daysUntilSat); d.setHours(9, 0, 0, 0); return d; }},
  { label: "Next week", icon: "calendar" as const, getTime: () => { const d = new Date(); d.setDate(d.getDate() + (7 - d.getDay() + 1)); d.setHours(9, 0, 0, 0); return d; }},
  { label: "Next month", icon: "calendar" as const, getTime: () => { const d = new Date(); d.setMonth(d.getMonth() + 1); d.setDate(1); d.setHours(9, 0, 0, 0); return d; }},
];

interface Props {
  visible: boolean;
  onClose: () => void;
  onSnooze: (until: Date) => void;
}

export function SnoozePanel({ visible, onClose, onSnooze }: Props) {
  const colors = useColors();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[styles.overlay]} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.card }]} onPress={() => {}}>
          <View style={[styles.handle, { backgroundColor: colors.muted }]} />
          <Text style={[styles.title, { color: colors.foreground }]}>Snooze until</Text>
          {SNOOZE_OPTIONS.map((opt) => (
            <Pressable
              key={opt.label}
              style={[styles.option, { borderBottomColor: colors.border }]}
              onPress={() => { onSnooze(opt.getTime()); onClose(); }}
            >
              <Feather name={opt.icon} size={16} color={colors.primary} />
              <Text style={[styles.optionLabel, { color: colors.foreground }]}>{opt.label}</Text>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "#00000050", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  title: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 12 },
  option: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  optionLabel: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
});
