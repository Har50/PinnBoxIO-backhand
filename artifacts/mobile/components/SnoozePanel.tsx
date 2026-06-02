import { Modal, View, Text, Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

export interface SnoozePreset {
  label: string;
  sublabel: string;
  icon: string;
  getDate: () => Date;
}

const now = () => new Date();

function nextWeekday(day: number): Date {
  const d = new Date();
  const diff = (day - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  d.setHours(8, 0, 0, 0);
  return d;
}

export const SNOOZE_PRESETS: SnoozePreset[] = [
  {
    label: "Later today",
    sublabel: "In 3 hours",
    icon: "clock",
    getDate: () => { const d = now(); d.setHours(d.getHours() + 3, 0, 0, 0); return d; },
  },
  {
    label: "This evening",
    sublabel: "Tonight at 6 PM",
    icon: "sunset",
    getDate: () => { const d = now(); d.setHours(18, 0, 0, 0); if (d <= now()) d.setDate(d.getDate() + 1); return d; },
  },
  {
    label: "Tomorrow morning",
    sublabel: "8 AM tomorrow",
    icon: "sun",
    getDate: () => { const d = now(); d.setDate(d.getDate() + 1); d.setHours(8, 0, 0, 0); return d; },
  },
  {
    label: "Tomorrow afternoon",
    sublabel: "2 PM tomorrow",
    icon: "coffee",
    getDate: () => { const d = now(); d.setDate(d.getDate() + 1); d.setHours(14, 0, 0, 0); return d; },
  },
  {
    label: "This weekend",
    sublabel: "Saturday at 9 AM",
    icon: "anchor",
    getDate: () => nextWeekday(6),
  },
  {
    label: "Next week",
    sublabel: "Monday at 8 AM",
    icon: "calendar",
    getDate: () => nextWeekday(1),
  },
  {
    label: "In 2 weeks",
    sublabel: "Same time, fortnight",
    icon: "refresh-cw",
    getDate: () => { const d = now(); d.setDate(d.getDate() + 14); d.setHours(8, 0, 0, 0); return d; },
  },
];

interface Props {
  visible: boolean;
  messageSubject?: string;
  onClose: () => void;
  onSnooze: (until: Date, preset: SnoozePreset) => void;
}

export function SnoozePanel({ visible, messageSubject, onClose, onSnooze }: Props) {
  const colors = useColors();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[sty.overlay]} onPress={onClose}>
        <Pressable style={[sty.sheet, { backgroundColor: colors.card }]} onPress={() => {}}>
          <View style={sty.handle} />
          <View style={sty.header}>
            <Feather name="clock" size={18} color={colors.primary} />
            <Text style={[sty.title, { color: colors.foreground }]}>Snooze email</Text>
          </View>
          {messageSubject ? (
            <Text style={[sty.subject, { color: colors.mutedForeground }]} numberOfLines={1}>
              "{messageSubject}"
            </Text>
          ) : null}
          <View style={sty.list}>
            {SNOOZE_PRESETS.map((preset) => {
              const date = preset.getDate();
              const timeStr = date.toLocaleString([], {
                weekday: "short", month: "short", day: "numeric",
                hour: "2-digit", minute: "2-digit",
              });
              return (
                <Pressable
                  key={preset.label}
                  style={({ pressed }) => [
                    sty.presetRow,
                    { borderColor: colors.border, backgroundColor: pressed ? colors.muted : colors.card },
                  ]}
                  onPress={() => onSnooze(date, preset)}
                >
                  <View style={[sty.presetIcon, { backgroundColor: colors.primary + "15" }]}>
                    <Feather name={preset.icon as any} size={16} color={colors.primary} />
                  </View>
                  <View style={sty.presetInfo}>
                    <Text style={[sty.presetLabel, { color: colors.foreground }]}>{preset.label}</Text>
                    <Text style={[sty.presetSub, { color: colors.mutedForeground }]}>{timeStr}</Text>
                  </View>
                  <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
                </Pressable>
              );
            })}
          </View>
          <Pressable style={[sty.cancelBtn, { borderColor: colors.border }]} onPress={onClose}>
            <Text style={[sty.cancelText, { color: colors.mutedForeground }]}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const sty = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36, gap: 12 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "#d1d5db", alignSelf: "center", marginBottom: 4 },
  header: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  subject: { fontSize: 13, fontFamily: "Inter_400Regular", fontStyle: "italic", marginBottom: 4 },
  list: { gap: 6 },
  presetRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 12, borderWidth: 1, padding: 12,
  },
  presetIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  presetInfo: { flex: 1 },
  presetLabel: { fontSize: 14, fontFamily: "Inter_500Medium" },
  presetSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  cancelBtn: { borderRadius: 12, borderWidth: 1, paddingVertical: 13, alignItems: "center", marginTop: 4 },
  cancelText: { fontSize: 15, fontFamily: "Inter_500Medium" },
});
