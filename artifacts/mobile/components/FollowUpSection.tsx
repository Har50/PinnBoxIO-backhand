import { useState, useEffect, useCallback } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { getAuthToken } from "@/lib/authToken";

const API_BASE = process.env.EXPO_PUBLIC_API_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_API_DOMAIN}`
  : process.env.EXPO_PUBLIC_DOMAIN
    ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
    : "";

interface FollowUpItem {
  id: number;
  subject: string;
  toList: string;
  sentAt: string;
  daysSince: number;
}

interface Props {
  onOpen: (messageId: number) => void;
}

export function FollowUpSection({ onOpen }: Props) {
  const colors = useColors();
  const [items, setItems] = useState<FollowUpItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const [collapsed, setCollapsed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getAuthToken();
      const res = await fetch(`${API_BASE}/api/messages?folder=Sent&limit=50`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return;
      const data = await res.json();
      const msgs: any[] = data.messages ?? [];
      const cutoff = Date.now() - 3 * 24 * 60 * 60 * 1000;
      const followUps: FollowUpItem[] = msgs
        .filter((m) => {
          const t = new Date(m.receivedAt ?? m.createdAt).getTime();
          return t < cutoff;
        })
        .slice(0, 5)
        .map((m) => {
          const t = new Date(m.receivedAt ?? m.createdAt).getTime();
          const daysSince = Math.floor((Date.now() - t) / (24 * 60 * 60 * 1000));
          return { id: m.id, subject: m.subject, toList: m.toList, sentAt: m.receivedAt ?? m.createdAt, daysSince };
        });
      setItems(followUps);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const visible = items.filter(i => !dismissed.has(i.id));

  if (loading) return null;
  if (visible.length === 0) return null;

  return (
    <View style={[sty.container, { borderColor: colors.border, backgroundColor: colors.card }]}>
      <Pressable style={sty.headerRow} onPress={() => setCollapsed(c => !c)}>
        <View style={[sty.iconWrap, { backgroundColor: "#f59e0b18" }]}>
          <Feather name="clock" size={14} color="#f59e0b" />
        </View>
        <Text style={[sty.headerText, { color: colors.foreground }]}>
          {visible.length} follow-up{visible.length !== 1 ? "s" : ""} pending
        </Text>
        <Feather name={collapsed ? "chevron-down" : "chevron-up"} size={16} color={colors.mutedForeground} />
      </Pressable>

      {!collapsed && (
        <View style={sty.list}>
          {visible.map((item) => (
            <View key={item.id} style={[sty.row, { borderTopColor: colors.border }]}>
              <Pressable style={sty.rowContent} onPress={() => onOpen(item.id)}>
                <Text style={[sty.subject, { color: colors.foreground }]} numberOfLines={1}>{item.subject || "(no subject)"}</Text>
                <Text style={[sty.meta, { color: colors.mutedForeground }]}>
                  To {item.toList?.split(",")[0]?.trim() || "unknown"} · {item.daysSince}d ago
                </Text>
              </Pressable>
              <View style={sty.rowActions}>
                <Pressable
                  style={[sty.chip, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30" }]}
                  onPress={() => onOpen(item.id)}
                >
                  <Text style={[sty.chipText, { color: colors.primary }]}>Follow up</Text>
                </Pressable>
                <Pressable
                  style={[sty.dismissBtn]}
                  onPress={() => setDismissed(prev => new Set([...prev, item.id]))}
                >
                  <Feather name="x" size={14} color={colors.mutedForeground} />
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
  container: { borderRadius: 12, borderWidth: 1, marginHorizontal: 12, marginBottom: 8, overflow: "hidden" },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12 },
  iconWrap: { width: 26, height: 26, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  headerText: { flex: 1, fontSize: 13, fontFamily: "Inter_600SemiBold" },
  list: { gap: 0 },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, gap: 8 },
  rowContent: { flex: 1, minWidth: 0 },
  subject: { fontSize: 13, fontFamily: "Inter_500Medium" },
  meta: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  rowActions: { flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 0 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  dismissBtn: { padding: 4 },
});
