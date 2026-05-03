import { Router, type IRouter } from "express";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { db, calendarEventsTable } from "@workspace/db";
import { getValidGmailToken, getValidOutlookToken } from "../services/tokenManager";
import { logger } from "../lib/logger";
import { z } from "zod";

const router: IRouter = Router();

const CreateEventBody = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  location: z.string().optional(),
  startAt: z.string(),
  endAt: z.string(),
  allDay: z.boolean().optional().default(false),
  color: z.string().optional().default("#3B82F6"),
});

const UpdateEventBody = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  startAt: z.string().optional(),
  endAt: z.string().optional(),
  allDay: z.boolean().optional(),
  color: z.string().optional(),
});

function buildEventResponse(event: typeof calendarEventsTable.$inferSelect) {
  return {
    id: event.id,
    userId: event.userId,
    title: event.title,
    description: event.description ?? null,
    location: event.location ?? null,
    startAt: event.startAt.toISOString(),
    endAt: event.endAt.toISOString(),
    allDay: event.allDay,
    provider: event.provider,
    externalId: event.externalId ?? null,
    attendees: event.attendees ? JSON.parse(event.attendees) : [],
    calendarLink: event.calendarLink ?? null,
    isOrganizer: event.isOrganizer,
    color: event.color,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
  };
}

type GCalEventDateTime = { dateTime?: string; date?: string; timeZone?: string };
type GCalAttendee = { email?: string; displayName?: string; responseStatus?: string };
type GCalEvent = {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: GCalEventDateTime;
  end?: GCalEventDateTime;
  attendees?: GCalAttendee[];
  htmlLink?: string;
  organizer?: { email?: string; self?: boolean };
  status?: string;
};
type GCalListResponse = { items?: GCalEvent[]; nextPageToken?: string };

async function fetchGoogleCalendarEvents(
  userId: string,
  accessToken: string,
  timeMin: string,
  timeMax: string
): Promise<GCalEvent[]> {
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "100",
  });
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) {
    logger.warn({ userId, status: res.status }, "Google Calendar fetch failed");
    return [];
  }
  const data = (await res.json()) as GCalListResponse;
  return data.items ?? [];
}

type OCalDatetime = { dateTime?: string; date?: string };
type OCalAttendee = { emailAddress?: { name?: string; address?: string }; status?: { response?: string } };
type OCalEvent = {
  id: string;
  subject?: string;
  bodyPreview?: string;
  location?: { displayName?: string };
  start?: OCalDatetime;
  end?: OCalDatetime;
  attendees?: OCalAttendee[];
  webLink?: string;
  isOrganizer?: boolean;
  isAllDay?: boolean;
};
type OCalListResponse = { value?: OCalEvent[] };

async function fetchOutlookCalendarEvents(
  userId: string,
  accessToken: string,
  timeMin: string,
  timeMax: string
): Promise<OCalEvent[]> {
  const params = new URLSearchParams({
    $filter: `start/dateTime ge '${timeMin}' and end/dateTime le '${timeMax}'`,
    $orderby: "start/dateTime",
    $top: "100",
    $select: "id,subject,bodyPreview,location,start,end,attendees,webLink,isOrganizer,isAllDay",
  });
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/me/calendar/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) {
    logger.warn({ userId, status: res.status }, "Outlook Calendar fetch failed");
    return [];
  }
  const data = (await res.json()) as OCalListResponse;
  return data.value ?? [];
}

async function upsertGCalEvents(userId: string, events: GCalEvent[]): Promise<void> {
  for (const ev of events) {
    if (!ev.id || !ev.start) continue;
    const allDay = !ev.start.dateTime;
    const startAt = new Date(ev.start.dateTime ?? ev.start.date ?? "");
    const endAt = new Date((ev.end?.dateTime ?? ev.end?.date) ?? startAt.toISOString());
    if (isNaN(startAt.getTime()) || isNaN(endAt.getTime())) continue;

    const attendees = (ev.attendees ?? []).map((a) => ({
      email: a.email ?? "",
      name: a.displayName ?? "",
      status: a.responseStatus ?? "needsAction",
    }));

    await db
      .insert(calendarEventsTable)
      .values({
        userId,
        title: ev.summary ?? "(No title)",
        description: ev.description ?? null,
        location: ev.location ?? null,
        startAt,
        endAt,
        allDay,
        provider: "gmail",
        externalId: ev.id,
        attendees: JSON.stringify(attendees),
        calendarLink: ev.htmlLink ?? null,
        isOrganizer: ev.organizer?.self ?? false,
        color: "#ea4335",
      })
      .onConflictDoNothing();
  }
}

async function upsertOutlookEvents(userId: string, events: OCalEvent[]): Promise<void> {
  for (const ev of events) {
    if (!ev.id || !ev.start) continue;
    const allDay = ev.isAllDay ?? false;
    const startAt = new Date(ev.start.dateTime ?? ev.start.date ?? "");
    const endAt = new Date((ev.end?.dateTime ?? ev.end?.date) ?? startAt.toISOString());
    if (isNaN(startAt.getTime()) || isNaN(endAt.getTime())) continue;

    const attendees = (ev.attendees ?? []).map((a) => ({
      email: a.emailAddress?.address ?? "",
      name: a.emailAddress?.name ?? "",
      status: a.status?.response ?? "notResponded",
    }));

    await db
      .insert(calendarEventsTable)
      .values({
        userId,
        title: ev.subject ?? "(No title)",
        description: ev.bodyPreview ?? null,
        location: ev.location?.displayName ?? null,
        startAt,
        endAt,
        allDay,
        provider: "outlook",
        externalId: ev.id,
        attendees: JSON.stringify(attendees),
        calendarLink: ev.webLink ?? null,
        isOrganizer: ev.isOrganizer ?? false,
        color: "#0078d4",
      })
      .onConflictDoNothing();
  }
}

router.get("/calendar/events", async (req: any, res): Promise<void> => {
  const userId: string = req.userId;
  const { start, end } = req.query as { start?: string; end?: string };

  const now = new Date();
  const rangeStart = start ? new Date(start) : new Date(now.getFullYear(), now.getMonth(), 1);
  const rangeEnd = end
    ? new Date(end)
    : new Date(now.getFullYear(), now.getMonth() + 2, 0);

  const events = await db
    .select()
    .from(calendarEventsTable)
    .where(
      and(
        eq(calendarEventsTable.userId, userId),
        gte(calendarEventsTable.startAt, rangeStart),
        lte(calendarEventsTable.startAt, rangeEnd)
      )
    )
    .orderBy(desc(calendarEventsTable.startAt));

  res.json(events.map(buildEventResponse));
});

router.post("/calendar/sync", async (req: any, res): Promise<void> => {
  const userId: string = req.userId;
  const now = new Date();
  const timeMin = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const timeMax = new Date(now.getFullYear(), now.getMonth() + 3, 0).toISOString();

  let gmailSynced = 0;
  let outlookSynced = 0;
  const errors: string[] = [];

  try {
    const gmailToken = await getValidGmailToken(userId);
    if (gmailToken) {
      const gEvents = await fetchGoogleCalendarEvents(userId, gmailToken, timeMin, timeMax);
      await upsertGCalEvents(userId, gEvents);
      gmailSynced = gEvents.length;
    }
  } catch (err) {
    logger.warn({ err, userId }, "Google Calendar sync error");
    errors.push("Gmail calendar sync failed");
  }

  try {
    const outlookToken = await getValidOutlookToken(userId);
    if (outlookToken) {
      const oEvents = await fetchOutlookCalendarEvents(userId, outlookToken, timeMin, timeMax);
      await upsertOutlookEvents(userId, oEvents);
      outlookSynced = oEvents.length;
    }
  } catch (err) {
    logger.warn({ err, userId }, "Outlook Calendar sync error");
    errors.push("Outlook calendar sync failed");
  }

  res.json({ gmailSynced, outlookSynced, errors });
});

router.post("/calendar/events", async (req: any, res): Promise<void> => {
  const userId: string = req.userId;
  const body = CreateEventBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const [event] = await db
    .insert(calendarEventsTable)
    .values({
      userId,
      title: body.data.title,
      description: body.data.description ?? null,
      location: body.data.location ?? null,
      startAt: new Date(body.data.startAt),
      endAt: new Date(body.data.endAt),
      allDay: body.data.allDay,
      provider: "local",
      color: body.data.color,
    })
    .returning();

  res.status(201).json(buildEventResponse(event));
});

router.patch("/calendar/events/:id", async (req: any, res): Promise<void> => {
  const userId: string = req.userId;
  const eventId = parseInt(req.params.id, 10);
  if (isNaN(eventId)) {
    res.status(400).json({ error: "Invalid event ID" });
    return;
  }

  const body = UpdateEventBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const existing = await db
    .select()
    .from(calendarEventsTable)
    .where(and(eq(calendarEventsTable.id, eventId), eq(calendarEventsTable.userId, userId)));

  if (!existing.length) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  const updates: Partial<typeof calendarEventsTable.$inferInsert> = { updatedAt: new Date() };
  if (body.data.title !== undefined) updates.title = body.data.title;
  if (body.data.description !== undefined) updates.description = body.data.description;
  if (body.data.location !== undefined) updates.location = body.data.location;
  if (body.data.startAt !== undefined) updates.startAt = new Date(body.data.startAt);
  if (body.data.endAt !== undefined) updates.endAt = new Date(body.data.endAt);
  if (body.data.allDay !== undefined) updates.allDay = body.data.allDay;
  if (body.data.color !== undefined) updates.color = body.data.color;

  const [updated] = await db
    .update(calendarEventsTable)
    .set(updates)
    .where(and(eq(calendarEventsTable.id, eventId), eq(calendarEventsTable.userId, userId)))
    .returning();

  res.json(buildEventResponse(updated));
});

router.delete("/calendar/events/:id", async (req: any, res): Promise<void> => {
  const userId: string = req.userId;
  const eventId = parseInt(req.params.id, 10);
  if (isNaN(eventId)) {
    res.status(400).json({ error: "Invalid event ID" });
    return;
  }

  const deleted = await db
    .delete(calendarEventsTable)
    .where(and(eq(calendarEventsTable.id, eventId), eq(calendarEventsTable.userId, userId)))
    .returning();

  if (!deleted.length) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  res.json({ success: true });
});

export default router;
