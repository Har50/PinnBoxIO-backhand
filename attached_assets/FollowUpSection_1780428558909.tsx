import React, { useState, useEffect, useCallback } from "react";
import { View, Text, Pressable, Alert, ActivityIndicator, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { getAuthToken } from "@/lib/authToken";
import { format, isToday, isThisWeek, isThisYear } from "date-fns";

const API_BASE = process.env.EXPO_PUBLIC_API_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_API_DOMAIN}`
  : process.env.EXPO_PUBLIC_DOMAIN
    ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
    : "https://pinn-box-io.replit.app";

type FollowUpItem = {
  id: number;
  messageId: number;
  subject: string;
  toName: string;
  toEmail: string;
  sentAt: string;
  daysSince: number;
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, "h:mm a");
  if (isThisWeek(d, { weekStartsOn: 1 })) return format(d, "EEE");
  if (isThisYear(d)) return format(d, "MMM d");
  return format(d, "MMM d, yyyy");
}

export function FollowUpSection({ visible }: { visible: boolean }) {
  const colors = useColors();
  const [items, setItems] = useState<FollowUpItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissing, setDismissing] = useState<Set<number>>(new Set());

  const fetchFollowUps = useCallback(async () => {
    setLoading(true);
    const token = await getAuthToken();
    if (!token) { setLoading(false); return; }
    try {
      const res = await fetch(`${API_BASE}/api/messages/follow-ups`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setItems(data.followUps ?? data ?? []);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { if (visible) fetchFollowUps(); }, [visible, fetchFollowUps]);

  const handleDismiss = async (id: number) => {
    setDismissing((prev) => new Set(prev).add(id));
    const token = await getAuthToken();
    if (token) {
      try {
        await fetch(`${API_BASE}/api/messages/follow-ups/${id}/dismiss`, { method: "POST" });
        setItems((prev) => prev.filter((i) => i.id !== id));
      } catch {}
    }
    setDismissing((prev) => { const n = new Set(prev); n.delete(id); return n; });
  };

  const handleSnooze = (id: number) => {
    Alert.alert("Snooze", "Follow up in:", [
      { text: "3 days", onPress: async () => { await snoozeFollowUp(id, 3); fetchFollowUps(); }},
      { text: "1 week", onPress: async () => { await snoozeFollowUp(id, 7); fetchFollowUps(); }},
      { text: "Cancel", style: "cancel" },
    ]);
  };

  if (!visible || items.length === 0) return null;

  return (
    <View style={[styles.container, { backgroundColor: "#fef3c7", borderColor: "#f59e0b40" }]}>
      <View style={styles.header}>
        <Feather name="bell" size={14} color="#d97706" />
        <Text style={[styles.title, { color: "#92400e" }]}>Follow-up reminders</Text>
        <Pressable onPress={fetchFollowUps}><Feather name="refresh-cw" size={14} color="#d97706" /></Pressable>
      </View>
      {loading ? (
        <ActivityIndicator size="small" color="#d97706" style={{ padding: 12 }} />
      ) : (
        items.map((item) => (
          <View key={item.id} style={[styles.item, { borderTopColor: "#f59e0b20" }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.itemSubject, { color: "#92400e" }]} numberOfLines={1}>{item.subject}</Text>
              <Text style={[styles.itemMeta, { color: "#b45309" }]}>To: {item.toName} · {formatDate(item.sentAt)}</Text>
              <Text style={[styles.itemDays, { color: "#d97706" }]}>{item.daysSince}d since sent</Text>
            </View>
            <View style={{ flexDirection: "row", gap: 4 }}>
              <Pressable onPress={() => handleSnooze(item.id)} style={[styles.actionBtn, { backgroundColor: "#f59e0b20" }]}>
                {dismissing.has(item.id) ? <Activityicator size="small" color="#d97706" /> : <Feather name="clock" size={13} color="#d97706" />}
              </Pressable>
              <Pressable onPress={() => handleDismiss(item.id)} style={[styles.actionBtn, { backgroundColor: "#ef444415" }]}>
                <Feather name="check" size={13} color="#ef4444" />
              </Pressable>
            </View>
          </View>
        ))
      )}
    </View>
  );
}

async function snoozeFollowUp(id: number, days: number) {
  const token = await getAuthToken();
  if (token) {
    await fetch(`${API_BASE}/api/messages/follow-ups/${id}/snooze`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ days }),
    });
  }
}

const styles = StyleSheet.create({
  container: { borderRadius: 12, borderWidth: 1, marginHorizontal: 16, marginBottom: 8, overflow: "hidden" },
  header: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 10 },
  title: { flex: 1, fontSize: 13, fontFamily: "Inter_600SemiBold" },
  item: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth },
  itemSubject: { fontSize: 13, fontFamily: "Inter_500Medium" },
  itemMeta: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  itemDays: { fontSize: 10, fontFamily: "Inter_600SemiBold", marginTop: 1 },
  actionBtn: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
});
