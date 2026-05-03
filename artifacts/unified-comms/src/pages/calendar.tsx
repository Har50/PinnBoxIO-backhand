import { useState, useCallback, useEffect } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCw,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  X,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api-client";

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

type View = "month" | "week" | "agenda";

const PROVIDER_LABELS: Record<string, string> = {
  gmail: "Google Calendar",
  outlook: "Outlook",
  local: "Local",
};

function providerColor(provider: string, fallback: string) {
  if (provider === "gmail") return "#ea4335";
  if (provider === "outlook") return "#0078d4";
  return fallback;
}

export default function CalendarPage() {
  const { toast } = useToast();
  const [view, setView] = useState<View>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: "",
    description: "",
    location: "",
    startAt: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    endAt: format(new Date(Date.now() + 3600_000), "yyyy-MM-dd'T'HH:mm"),
    allDay: false,
    color: "#3B82F6",
  });
  const [saving, setSaving] = useState(false);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const start = format(startOfMonth(addMonths(currentDate, -1)), "yyyy-MM-dd");
      const end = format(endOfMonth(addMonths(currentDate, 1)), "yyyy-MM-dd");
      const data = await apiFetch(`/api/calendar/events?start=${start}&end=${end}`);
      setEvents(data);
    } catch {
      toast({ title: "Failed to load events", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [currentDate, toast]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  async function handleSync() {
    setSyncing(true);
    try {
      const result = await apiFetch("/api/calendar/sync", { method: "POST" });
      toast({
        title: "Calendar synced",
        description: `Gmail: ${result.gmailSynced} events, Outlook: ${result.outlookSynced} events`,
      });
      await fetchEvents();
    } catch {
      toast({ title: "Sync failed", variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  }

  async function handleCreate() {
    setSaving(true);
    try {
      await apiFetch("/api/calendar/events", {
        method: "POST",
        body: JSON.stringify({
          title: createForm.title,
          description: createForm.description || undefined,
          location: createForm.location || undefined,
          startAt: new Date(createForm.startAt).toISOString(),
          endAt: new Date(createForm.endAt).toISOString(),
          allDay: createForm.allDay,
          color: createForm.color,
        }),
      });
      toast({ title: "Event created" });
      setShowCreateDialog(false);
      setCreateForm({
        title: "",
        description: "",
        location: "",
        startAt: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        endAt: format(new Date(Date.now() + 3600_000), "yyyy-MM-dd'T'HH:mm"),
        allDay: false,
        color: "#3B82F6",
      });
      await fetchEvents();
    } catch {
      toast({ title: "Failed to create event", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteEvent(eventId: number) {
    try {
      await apiFetch(`/api/calendar/events/${eventId}`, { method: "DELETE" });
      toast({ title: "Event deleted" });
      setSelectedEvent(null);
      await fetchEvents();
    } catch {
      toast({ title: "Failed to delete event", variant: "destructive" });
    }
  }

  function getEventsForDay(day: Date): CalendarEvent[] {
    return events.filter((ev) => isSameDay(parseISO(ev.startAt), day));
  }

  function MonthView() {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calStart = startOfWeek(monthStart);
    const calEnd = endOfWeek(monthEnd);

    const days: Date[] = [];
    let d = calStart;
    while (d <= calEnd) {
      days.push(d);
      d = addDays(d, 1);
    }

    return (
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="grid grid-cols-7 border-b">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="py-2 text-center text-xs font-medium text-muted-foreground">
              {day}
            </div>
          ))}
        </div>
        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-7" style={{ minHeight: "100%" }}>
            {days.map((day) => {
              const dayEvents = getEventsForDay(day);
              const inMonth = isSameMonth(day, currentDate);
              const today = isToday(day);
              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-[100px] border-b border-r p-1 ${inMonth ? "bg-background" : "bg-muted/20"}`}
                >
                  <div
                    className={`w-7 h-7 flex items-center justify-center rounded-full text-sm mb-1 ${
                      today
                        ? "bg-primary text-primary-foreground font-semibold"
                        : inMonth
                        ? "text-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    {format(day, "d")}
                  </div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map((ev) => (
                      <button
                        key={ev.id}
                        onClick={() => setSelectedEvent(ev)}
                        className="w-full text-left text-xs px-1.5 py-0.5 rounded truncate text-white font-medium hover:opacity-90 transition-opacity"
                        style={{ backgroundColor: providerColor(ev.provider, ev.color) }}
                      >
                        {ev.allDay ? ev.title : `${format(parseISO(ev.startAt), "h:mm a")} ${ev.title}`}
                      </button>
                    ))}
                    {dayEvents.length > 3 && (
                      <p className="text-xs text-muted-foreground px-1">+{dayEvents.length - 3} more</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  function WeekView() {
    const weekStart = startOfWeek(currentDate);
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    return (
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-7 border-b sticky top-0 bg-background z-10">
          {days.map((day) => (
            <div key={day.toISOString()} className="py-2 text-center border-r last:border-r-0">
              <p className="text-xs text-muted-foreground">{format(day, "EEE")}</p>
              <p
                className={`text-lg font-semibold mx-auto w-9 h-9 flex items-center justify-center rounded-full ${
                  isToday(day) ? "bg-primary text-primary-foreground" : "text-foreground"
                }`}
              >
                {format(day, "d")}
              </p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 min-h-[600px]">
          {days.map((day) => {
            const dayEvents = getEventsForDay(day);
            return (
              <div key={day.toISOString()} className="border-r last:border-r-0 p-1 space-y-1 min-h-[200px]">
                {dayEvents.map((ev) => (
                  <button
                    key={ev.id}
                    onClick={() => setSelectedEvent(ev)}
                    className="w-full text-left rounded p-1.5 text-xs text-white font-medium hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: providerColor(ev.provider, ev.color) }}
                  >
                    <p className="font-semibold truncate">{ev.title}</p>
                    {!ev.allDay && (
                      <p className="opacity-90">{format(parseISO(ev.startAt), "h:mm a")}</p>
                    )}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function AgendaView() {
    const sorted = [...events].sort(
      (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
    );

    if (sorted.length === 0) {
      return (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center space-y-2">
            <CalendarIcon className="w-12 h-12 mx-auto opacity-30" />
            <p>No upcoming events. Sync your calendars to get started.</p>
          </div>
        </div>
      );
    }

    let lastDay = "";
    return (
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {sorted.map((ev) => {
            const dayLabel = format(parseISO(ev.startAt), "EEEE, MMMM d");
            const showDay = dayLabel !== lastDay;
            lastDay = dayLabel;
            return (
              <div key={ev.id}>
                {showDay && (
                  <p
                    className={`text-sm font-semibold mt-4 mb-2 ${
                      isToday(parseISO(ev.startAt)) ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {isToday(parseISO(ev.startAt)) ? "Today" : dayLabel}
                  </p>
                )}
                <button
                  onClick={() => setSelectedEvent(ev)}
                  className="w-full text-left flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div
                    className="w-1 self-stretch rounded-full flex-shrink-0"
                    style={{ backgroundColor: providerColor(ev.provider, ev.color) }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{ev.title}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                      {ev.allDay ? (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> All day
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(parseISO(ev.startAt), "h:mm a")} – {format(parseISO(ev.endAt), "h:mm a")}
                        </span>
                      )}
                      {ev.location && (
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="w-3 h-3 flex-shrink-0" /> {ev.location}
                        </span>
                      )}
                      {ev.attendees.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" /> {ev.attendees.length} attendee{ev.attendees.length !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs flex-shrink-0">
                    {PROVIDER_LABELS[ev.provider] ?? ev.provider}
                  </Badge>
                </button>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                setCurrentDate((d) => (view === "week" ? addDays(d, -7) : subMonths(d, 1)))
              }
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                setCurrentDate((d) => (view === "week" ? addDays(d, 7) : addMonths(d, 1)))
              }
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <h1 className="text-lg font-semibold">
            {view === "week"
              ? `${format(startOfWeek(currentDate), "MMM d")} – ${format(endOfWeek(currentDate), "MMM d, yyyy")}`
              : format(currentDate, "MMMM yyyy")}
          </h1>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
            Today
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex border rounded-md overflow-hidden">
            {(["month", "week", "agenda"] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 text-sm capitalize transition-colors ${
                  view === v
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-foreground"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
            {syncing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            <span className="hidden sm:inline ml-1">Sync</span>
          </Button>
          <Button size="sm" onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline ml-1">New Event</span>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {view === "month" && <MonthView />}
          {view === "week" && <WeekView />}
          {view === "agenda" && <AgendaView />}
        </>
      )}

      {/* Event Detail Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <DialogContent className="max-w-lg">
          {selectedEvent && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: providerColor(selectedEvent.provider, selectedEvent.color) }}
                    />
                    <DialogTitle className="text-base leading-tight">{selectedEvent.title}</DialogTitle>
                  </div>
                  <Badge variant="outline" className="text-xs flex-shrink-0">
                    {PROVIDER_LABELS[selectedEvent.provider] ?? selectedEvent.provider}
                  </Badge>
                </div>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    {selectedEvent.allDay ? (
                      <p>All day · {format(parseISO(selectedEvent.startAt), "EEEE, MMMM d, yyyy")}</p>
                    ) : (
                      <>
                        <p>{format(parseISO(selectedEvent.startAt), "EEEE, MMMM d, yyyy")}</p>
                        <p>
                          {format(parseISO(selectedEvent.startAt), "h:mm a")} –{" "}
                          {format(parseISO(selectedEvent.endAt), "h:mm a")}
                        </p>
                      </>
                    )}
                  </div>
                </div>
                {selectedEvent.location && (
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <p>{selectedEvent.location}</p>
                  </div>
                )}
                {selectedEvent.description && (
                  <div className="bg-muted/50 rounded-md p-3 text-foreground text-xs leading-relaxed">
                    {selectedEvent.description}
                  </div>
                )}
                {selectedEvent.attendees.length > 0 && (
                  <div className="flex items-start gap-2">
                    <Users className="w-4 h-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                    <div className="space-y-1">
                      {selectedEvent.attendees.map((a, i) => (
                        <p key={i} className="text-xs">
                          {a.name || a.email}
                          {a.name && <span className="text-muted-foreground ml-1">({a.email})</span>}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter className="flex flex-row justify-between gap-2 flex-wrap">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteEvent(selectedEvent.id)}
                  disabled={selectedEvent.provider !== "local"}
                >
                  Delete
                </Button>
                <div className="flex gap-2">
                  {selectedEvent.calendarLink && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={selectedEvent.calendarLink} target="_blank" rel="noreferrer">
                        <ExternalLink className="w-3.5 h-3.5 mr-1" /> Open
                      </a>
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => setSelectedEvent(null)}>
                    Close
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Event Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input
                placeholder="Event title"
                value={createForm.title}
                onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start</Label>
                <Input
                  type="datetime-local"
                  value={createForm.startAt}
                  onChange={(e) => setCreateForm((f) => ({ ...f, startAt: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>End</Label>
                <Input
                  type="datetime-local"
                  value={createForm.endAt}
                  onChange={(e) => setCreateForm((f) => ({ ...f, endAt: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Input
                placeholder="Add location"
                value={createForm.location}
                onChange={(e) => setCreateForm((f) => ({ ...f, location: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                placeholder="Add description"
                value={createForm.description}
                onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="space-y-1.5 flex-1">
                <Label>Color</Label>
                <input
                  type="color"
                  value={createForm.color}
                  onChange={(e) => setCreateForm((f) => ({ ...f, color: e.target.value }))}
                  className="w-full h-9 rounded border cursor-pointer"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer mt-5">
                <input
                  type="checkbox"
                  checked={createForm.allDay}
                  onChange={(e) => setCreateForm((f) => ({ ...f, allDay: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm">All day</span>
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={saving || !createForm.title}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Create Event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
