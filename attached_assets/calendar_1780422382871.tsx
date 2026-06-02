import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import {
  format, isToday, isTomorrow, parseISO,
  addMonths, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, addDays, isSameDay, isSameMonth,
} from "date-fns";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@clerk/expo";

type Attendee = { email: string; name: string; status: string };
type CalendarEvent = {
  id: number;
  title: string;
  description: string | null;
  location: string | null;
  startAt: string;
  endAt: string;
  allDay: boolean;
  provider: string;
  externalId: string | null;
  attendees: Attendee[];
  calendarLink: string | null;
  isOrganizer: boolean;
  color: string;
};

const PROVIDER_COLORS: Record<string, string> = {
  gmail: "#ea4335",
  outlook: "#0078d4",
  local: "#3B82F6",
};

const PROVIDER_LABELS: Record<string, string> = {
  gmail: "Google Calendar",
  outlook: "Outlook",
  local: "Local",
};

function eventColor(event: CalendarEvent): string {
  return PROVIDER_COLORS[event.provider] ?? event.color ?? "#3B82F6";
}

function dayLabel(dateStr: string): string {
  const d = parseISO(dateStr);
  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  return format(d, "EEEE, MMMM d");
}

const API_DOMAIN = process.env.EXPO_PUBLIC_API_DOMAIN ?? process.env.EXPO_PUBLIC_DOMAIN;
const API_BASE = API_DOMAIN ? `https://${API_DOMAIN}` : "";

async function apiFetch(path: string, token: string | null, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

type ViewMode = "month" | "agenda";

type AgendaRow =
  | { type: "header"; label: string }
  | { type: "event"; event: CalendarEvent };

interface AgendaViewProps {
  events: CalendarEvent[];
  refreshing: boolean;
  onRefresh: () => void;
  onSelect: (ev: CalendarEvent) => void;
  colors: ReturnType<typeof useColors>;
  bottomInset: number;
}

function AgendaView({ events, refreshing, onRefresh, onSelect, colors, bottomInset }: AgendaViewProps) {
  const sorted = [...events].sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
  );

  if (sorted.length === 0) {
    return (
      <View style={[styles.emptyState, { backgroundColor: colors.background }]}>
        <Feather name="calendar" size={48} color={colors.mutedForeground} />
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
          No events found.{"\n"}Tap Sync to import from your email accounts.
        </Text>
      </View>
    );
  }

  let lastDayLabel = "";
  const rows: AgendaRow[] = [];
  for (const ev of sorted) {
    const label = dayLabel(ev.startAt);
    if (label !== lastDayLabel) {
      rows.push({ type: "header", label });
      lastDayLabel = label;
    }
    rows.push({ type: "event", event: ev });
  }

  return (
    <FlatList
      data={rows}
      keyExtractor={(item, i) =>
        item.type === "header" ? `hdr-${item.label}` : `ev-${item.event.id}-${i}`
      }
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
      contentContainerStyle={{ paddingBottom: bottomInset + 80 }}
      renderItem={({ item }) => {
        if (item.type === "header") {
          return (
            <Text
              style={[
                styles.dayHeader,
                { color: item.label === "Today" ? colors.primary : colors.mutedForeground },
              ]}
            >
              {item.label}
            </Text>
          );
        }
        const ev = item.event;
        const color = eventColor(ev);
        return (
          <Pressable
            onPress={() => onSelect(ev)}
            style={({ pressed }) => [
              styles.eventRow,
              {
                backgroundColor: pressed ? colors.muted : colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={[styles.eventBar, { backgroundColor: color }]} />
            <View style={styles.eventContent}>
              <Text style={[styles.eventTitle, { color: colors.foreground }]} numberOfLines={1}>
                {ev.title}
              </Text>
              <View style={styles.eventMeta}>
                {ev.allDay ? (
                  <Text style={[styles.eventMetaText, { color: colors.mutedForeground }]}>All day</Text>
                ) : (
                  <Text style={[styles.eventMetaText, { color: colors.mutedForeground }]}>
                    {format(parseISO(ev.startAt), "h:mm a")} – {format(parseISO(ev.endAt), "h:mm a")}
                  </Text>
                )}
                {ev.location ? (
                  <Text style={[styles.eventMetaText, { color: colors.mutedForeground }]} numberOfLines={1}>
                    {"  ·  "}{ev.location}
                  </Text>
                ) : null}
              </View>
            </View>
            <View style={[styles.providerBadge, { borderColor: color }]}>
              <Text style={[styles.providerBadgeText, { color }]}>
                {ev.provider === "gmail" ? "G" : ev.provider === "outlook" ? "OL" : "•"}
              </Text>
            </View>
          </Pressable>
        );
      }}
    />
  );
}

interface MonthViewProps {
  events: CalendarEvent[];
  currentMonth: Date;
  refreshing: boolean;
  onRefresh: () => void;
  onSelect: (ev: CalendarEvent) => void;
  colors: ReturnType<typeof useColors>;
  bottomInset: number;
}

function MonthView({ events, currentMonth, refreshing, onRefresh, onSelect, colors, bottomInset }: MonthViewProps) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);
  const days: Date[] = [];
  let d = calStart;
  while (d <= calEnd) {
    days.push(d);
    d = addDays(d, 1);
  }
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: bottomInset + 80 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
    >
      <View style={[styles.monthGrid, { borderColor: colors.border }]}>
        <View style={styles.weekDayRow}>
          {["S", "M", "T", "W", "T", "F", "S"].map((label, i) => (
            <Text key={i} style={[styles.weekDayLabel, { color: colors.mutedForeground }]}>{label}</Text>
          ))}
        </View>
        {weeks.map((week, wi) => (
          <View key={wi} style={[styles.weekRow, { borderTopColor: colors.border }]}>
            {week.map((day) => {
              const dayEvts = events.filter((e) => isSameDay(parseISO(e.startAt), day));
              const inMonth = isSameMonth(day, currentMonth);
              const today = isToday(day);
              return (
                <View key={day.toISOString()} style={styles.dayCell}>
                  <View style={[styles.dayNumber, today && { backgroundColor: colors.primary }]}>
                    <Text
                      style={[
                        styles.dayNumberText,
                        { color: today ? "#fff" : inMonth ? colors.foreground : colors.mutedForeground },
                      ]}
                    >
                      {format(day, "d")}
                    </Text>
                  </View>
                  {dayEvts.slice(0, 2).map((ev) => (
                    <Pressable
                      key={ev.id}
                      onPress={() => onSelect(ev)}
                      style={[styles.miniEvent, { backgroundColor: eventColor(ev) }]}
                    >
                      <Text style={styles.miniEventText} numberOfLines={1}>{ev.title}</Text>
                    </Pressable>
                  ))}
                  {dayEvts.length > 2 && (
                    <Text style={[styles.moreText, { color: colors.mutedForeground }]}>
                      +{dayEvts.length - 2}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

export default function CalendarScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getToken } = useAuth();

  const getTokenRef = useRef(getToken);
  useEffect(() => { getTokenRef.current = getToken; }, [getToken]);

  const [viewMode, setViewMode] = useState<ViewMode>("agenda");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createStart, setCreateStart] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [createEnd, setCreateEnd] = useState(format(new Date(Date.now() + 3600_000), "yyyy-MM-dd'T'HH:mm"));
  const [createLocation, setCreateLocation] = useState("");
  const [saving, setSaving] = useState(false);

  const isFetchingRef = useRef(false);

  const fetchEvents = useCallback(async (quiet = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    if (!quiet) setLoading(true);
    setFetchError(null);
    try {
      const token = await getTokenRef.current();
      const start = format(startOfMonth(addMonths(currentMonth, -1)), "yyyy-MM-dd");
      const end = format(endOfMonth(addMonths(currentMonth, 2)), "yyyy-MM-dd");
      const data = await apiFetch(`/api/calendar/events?start=${start}&end=${end}`, token);
      setEvents(data);
    } catch {
      setFetchError("Failed to load calendar events. Pull down to retry.");
    } finally {
      setLoading(false);
      setRefreshing(false);
      isFetchingRef.current = false;
    }
  }, [currentMonth]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchEvents(true);
  }, [fetchEvents]);

  async function handleSync() {
    setSyncing(true);
    try {
      const token = await getTokenRef.current();
      const result = await apiFetch("/api/calendar/sync", token, { method: "POST" });
      Alert.alert(
        "Synced",
        `Gmail: ${result.gmailSynced} events\nOutlook: ${result.outlookSynced} events`
      );
      await fetchEvents(true);
    } catch {
      Alert.alert("Error", "Calendar sync failed.");
    } finally {
      setSyncing(false);
    }
  }

  async function handleCreate() {
    if (!createTitle.trim()) {
      Alert.alert("Error", "Please enter a title.");
      return;
    }
    const startDate = new Date(createStart);
    const endDate = new Date(createEnd);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      Alert.alert("Invalid date", "Please enter valid start and end dates (YYYY-MM-DDTHH:MM).");
      return;
    }
    setSaving(true);
    try {
      const token = await getTokenRef.current();
      await apiFetch("/api/calendar/events", token, {
        method: "POST",
        body: JSON.stringify({
          title: createTitle.trim(),
          location: createLocation.trim() || undefined,
          startAt: startDate.toISOString(),
          endAt: endDate.toISOString(),
        }),
      });
      setShowCreate(false);
      setCreateTitle("");
      setCreateLocation("");
      await fetchEvents(true);
    } catch {
      Alert.alert("Error", "Failed to create event.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(eventId: number) {
    Alert.alert("Delete Event", "Are you sure you want to delete this event?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const token = await getTokenRef.current();
            await apiFetch(`/api/calendar/events/${eventId}`, token, { method: "DELETE" });
            setSelectedEvent(null);
            await fetchEvents(true);
          } catch {
            Alert.alert("Error", "Failed to delete event.");
          }
        },
      },
    ]);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <Pressable onPress={() => setCurrentMonth((m) => addMonths(m, -1))} style={styles.navBtn}>
            <Feather name="chevron-left" size={20} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            {format(currentMonth, "MMMM yyyy")}
          </Text>
          <Pressable onPress={() => setCurrentMonth((m) => addMonths(m, 1))} style={styles.navBtn}>
            <Feather name="chevron-right" size={20} color={colors.foreground} />
          </Pressable>
        </View>
        <View style={styles.headerRight}>
          <Pressable
            onPress={() => setViewMode((v) => (v === "month" ? "agenda" : "month"))}
            style={[styles.viewToggle, { borderColor: colors.border, backgroundColor: colors.card }]}
          >
            <Feather name={viewMode === "month" ? "list" : "grid"} size={16} color={colors.foreground} />
          </Pressable>
          <Pressable
            onPress={handleSync}
            disabled={syncing}
            style={[styles.iconBtn, { backgroundColor: colors.muted }]}
          >
            {syncing ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Feather name="refresh-cw" size={16} color={colors.foreground} />
            )}
          </Pressable>
          <Pressable
            onPress={() => setShowCreate(true)}
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
          >
            <Feather name="plus" size={18} color="#fff" />
          </Pressable>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : fetchError ? (
        <View style={styles.emptyState}>
          <Feather name="alert-circle" size={32} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{fetchError}</Text>
          <Pressable
            onPress={handleRefresh}
            style={[styles.retryBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.retryBtnText}>Retry</Text>
          </Pressable>
        </View>
      ) : viewMode === "month" ? (
        <MonthView
          events={events}
          currentMonth={currentMonth}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          onSelect={setSelectedEvent}
          colors={colors}
          bottomInset={insets.bottom}
        />
      ) : (
        <AgendaView
          events={events}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          onSelect={setSelectedEvent}
          colors={colors}
          bottomInset={insets.bottom}
        />
      )}

      {/* Event Detail Modal */}
      <Modal
        visible={!!selectedEvent}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedEvent(null)}
      >
        {selectedEvent && (
          <View style={[styles.modal, { backgroundColor: colors.background, paddingTop: insets.top + 16 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]} numberOfLines={2}>
                {selectedEvent.title}
              </Text>
              <Pressable onPress={() => setSelectedEvent(null)} style={styles.closeBtn}>
                <Feather name="x" size={22} color={colors.foreground} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalBody} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
              <View style={[styles.providerTag, { backgroundColor: eventColor(selectedEvent) + "22", borderColor: eventColor(selectedEvent) }]}>
                <View style={[styles.providerDot, { backgroundColor: eventColor(selectedEvent) }]} />
                <Text style={[styles.providerTagText, { color: eventColor(selectedEvent) }]}>
                  {PROVIDER_LABELS[selectedEvent.provider] ?? selectedEvent.provider}
                </Text>
              </View>

              <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
                <Feather name="clock" size={16} color={colors.mutedForeground} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.detailText, { color: colors.foreground }]}>
                    {format(parseISO(selectedEvent.startAt), "EEEE, MMMM d, yyyy")}
                  </Text>
                  {!selectedEvent.allDay && (
                    <Text style={[styles.detailSubText, { color: colors.mutedForeground }]}>
                      {format(parseISO(selectedEvent.startAt), "h:mm a")} – {format(parseISO(selectedEvent.endAt), "h:mm a")}
                    </Text>
                  )}
                  {selectedEvent.allDay && (
                    <Text style={[styles.detailSubText, { color: colors.mutedForeground }]}>All day</Text>
                  )}
                </View>
              </View>

              {selectedEvent.location ? (
                <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
                  <Feather name="map-pin" size={16} color={colors.mutedForeground} />
                  <Text style={[styles.detailText, { color: colors.foreground, flex: 1 }]}>
                    {selectedEvent.location}
                  </Text>
                </View>
              ) : null}

              {selectedEvent.description ? (
                <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
                  <Feather name="align-left" size={16} color={colors.mutedForeground} />
                  <Text style={[styles.detailText, { color: colors.foreground, flex: 1 }]}>
                    {selectedEvent.description}
                  </Text>
                </View>
              ) : null}

              {selectedEvent.attendees.length > 0 && (
                <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
                  <Feather name="users" size={16} color={colors.mutedForeground} />
                  <View style={{ flex: 1 }}>
                    {selectedEvent.attendees.map((a, i) => (
                      <Text key={i} style={[styles.detailText, { color: colors.foreground }]}>
                        {a.name || a.email}
                      </Text>
                    ))}
                  </View>
                </View>
              )}

              {selectedEvent.provider === "local" && (
                <Pressable
                  onPress={() => handleDelete(selectedEvent.id)}
                  style={[styles.deleteBtn, { borderColor: colors.destructive ?? "#ef4444" }]}
                >
                  <Feather name="trash-2" size={16} color={colors.destructive ?? "#ef4444"} />
                  <Text style={[styles.deleteBtnText, { color: colors.destructive ?? "#ef4444" }]}>
                    Delete Event
                  </Text>
                </Pressable>
              )}
            </ScrollView>
          </View>
        )}
      </Modal>

      {/* Create Event Modal */}
      <Modal
        visible={showCreate}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreate(false)}
      >
        <View style={[styles.modal, { backgroundColor: colors.background, paddingTop: insets.top + 16 }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>New Event</Text>
            <Pressable onPress={() => setShowCreate(false)} style={styles.closeBtn}>
              <Feather name="x" size={22} color={colors.foreground} />
            </Pressable>
          </View>
          <ScrollView style={styles.modalBody} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Title *</Text>
            <TextInput
              style={[styles.textInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
              placeholder="Event title"
              placeholderTextColor={colors.mutedForeground}
              value={createTitle}
              onChangeText={setCreateTitle}
            />

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Start</Text>
            <TextInput
              style={[styles.textInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
              placeholder="YYYY-MM-DDTHH:MM"
              placeholderTextColor={colors.mutedForeground}
              value={createStart}
              onChangeText={setCreateStart}
            />

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>End</Text>
            <TextInput
              style={[styles.textInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
              placeholder="YYYY-MM-DDTHH:MM"
              placeholderTextColor={colors.mutedForeground}
              value={createEnd}
              onChangeText={setCreateEnd}
            />

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Location</Text>
            <TextInput
              style={[styles.textInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
              placeholder="Add location"
              placeholderTextColor={colors.mutedForeground}
              value={createLocation}
              onChangeText={setCreateLocation}
            />

            <Pressable
              onPress={handleCreate}
              disabled={saving}
              style={[styles.createBtn, { backgroundColor: colors.primary }]}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.createBtnText}>Create Event</Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 4 },
  headerTitle: { fontSize: 18, fontWeight: "600", marginHorizontal: 8 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  navBtn: { padding: 4 },
  viewToggle: { width: 36, height: 36, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  iconBtn: { width: 36, height: 36, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  loadingState: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 16 },
  emptyText: { fontSize: 14, textAlign: "center", marginTop: 8, lineHeight: 22 },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20, marginTop: 4 },
  retryBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  dayHeader: { fontSize: 13, fontWeight: "600", paddingHorizontal: 16, paddingTop: 20, paddingBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  eventRow: { flexDirection: "row", alignItems: "center", marginHorizontal: 16, marginBottom: 8, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" },
  eventBar: { width: 4, alignSelf: "stretch" },
  eventContent: { flex: 1, paddingVertical: 12, paddingHorizontal: 12 },
  eventTitle: { fontSize: 14, fontWeight: "600", marginBottom: 3 },
  eventMeta: { flexDirection: "row", flexWrap: "wrap" },
  eventMetaText: { fontSize: 12 },
  providerBadge: { paddingHorizontal: 10, marginRight: 12, borderRadius: 6, borderWidth: 1, paddingVertical: 3 },
  providerBadgeText: { fontSize: 11, fontWeight: "700" },
  monthGrid: { borderBottomWidth: StyleSheet.hairlineWidth },
  weekDayRow: { flexDirection: "row", paddingVertical: 8 },
  weekDayLabel: { flex: 1, textAlign: "center", fontSize: 12, fontWeight: "600" },
  weekRow: { flexDirection: "row", borderTopWidth: StyleSheet.hairlineWidth },
  dayCell: { flex: 1, minHeight: 72, padding: 4, alignItems: "center" },
  dayNumber: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  dayNumberText: { fontSize: 13, fontWeight: "500" },
  miniEvent: { width: "100%", borderRadius: 3, paddingHorizontal: 3, paddingVertical: 1, marginBottom: 1 },
  miniEventText: { fontSize: 9, color: "#fff", fontWeight: "500" },
  moreText: { fontSize: 9 },
  modal: { flex: 1 },
  modalHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 16, gap: 12 },
  modalTitle: { flex: 1, fontSize: 20, fontWeight: "700" },
  closeBtn: { padding: 4, marginTop: 2 },
  modalBody: { flex: 1, paddingHorizontal: 20 },
  providerTag: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, alignSelf: "flex-start", marginBottom: 20 },
  providerDot: { width: 8, height: 8, borderRadius: 4 },
  providerTagText: { fontSize: 13, fontWeight: "600" },
  detailRow: { flexDirection: "row", gap: 14, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, alignItems: "flex-start" },
  detailText: { fontSize: 15, fontWeight: "500" },
  detailSubText: { fontSize: 13, marginTop: 2 },
  deleteBtn: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 24, padding: 16, borderRadius: 12, borderWidth: 1, justifyContent: "center" },
  deleteBtnText: { fontSize: 15, fontWeight: "600" },
  fieldLabel: { fontSize: 13, fontWeight: "500", marginBottom: 6, marginTop: 16 },
  textInput: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15 },
  createBtn: { marginTop: 24, padding: 16, borderRadius: 12, alignItems: "center" },
  createBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
