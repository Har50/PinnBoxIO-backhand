import { Router, type IRouter } from "express";
import { eq, ilike, or, count, max, sql, and } from "drizzle-orm";
import { db, contactsTable, messagesTable } from "@workspace/db";
import {
  CreateContactBody,
  UpdateContactBody,
  GetContactParams,
  UpdateContactParams,
  DeleteContactParams,
  GetContactsQueryParams,
  GetContactsResponse,
  GetContactResponse,
  UpdateContactResponse,
} from "@workspace/api-zod";
import { listGmailMessageSenders } from "../services/gmail";
import { listOutlookMessageSenders } from "../services/outlook";

const router: IRouter = Router();

router.get("/contacts", async (req, res): Promise<void> => {
  const query = GetContactsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const q = query.data.q;
  let contacts;
  if (q) {
    contacts = await db
      .select()
      .from(contactsTable)
      .where(
        or(
          ilike(contactsTable.name, `%${q}%`),
          ilike(contactsTable.email, `%${q}%`),
          ilike(contactsTable.company, `%${q}%`)
        )
      )
      .orderBy(contactsTable.name);
  } else {
    contacts = await db.select().from(contactsTable).orderBy(contactsTable.name);
  }

  // Get total + unread message counts per contact email
  const messageCounts = await db
    .select({
      fromEmail: messagesTable.fromEmail,
      cnt: count(),
      lastAt: max(messagesTable.receivedAt),
    })
    .from(messagesTable)
    .groupBy(messagesTable.fromEmail);

  const unreadCounts = await db
    .select({ fromEmail: messagesTable.fromEmail, cnt: count() })
    .from(messagesTable)
    .where(eq(messagesTable.isRead, false))
    .groupBy(messagesTable.fromEmail);

  const countMap = new Map(messageCounts.map((r) => [r.fromEmail, { cnt: Number(r.cnt), lastAt: r.lastAt }]));
  const unreadMap = new Map(unreadCounts.map((r) => [r.fromEmail, Number(r.cnt)]));

  const result = contacts.map((c) => {
    const stats = countMap.get(c.email);
    return {
      ...c,
      messageCount: stats?.cnt ?? 0,
      unreadCount: unreadMap.get(c.email) ?? 0,
      lastMessageAt: stats?.lastAt ? stats.lastAt.toISOString() : null,
      createdAt: c.createdAt.toISOString(),
    };
  });

  res.json(GetContactsResponse.parse(result));
});

router.post("/contacts/sync", async (req, res): Promise<void> => {
  const existingContacts = await db.select({ email: contactsTable.email }).from(contactsTable);
  const existingEmails = new Set(existingContacts.map((c) => c.email.toLowerCase()));

  const dbSenders = await db
    .select({ fromEmail: messagesTable.fromEmail, fromName: messagesTable.fromName })
    .from(messagesTable)
    .groupBy(messagesTable.fromEmail, messagesTable.fromName);

  const [gmailSenders, outlookSenders] = await Promise.all([
    listGmailMessageSenders(25),
    listOutlookMessageSenders(25),
  ]);

  const allSenders: Array<{ name: string; email: string }> = [
    ...dbSenders.map((s) => ({ name: s.fromName ?? s.fromEmail, email: s.fromEmail })),
    ...gmailSenders,
    ...outlookSenders,
  ];

  const seen = new Set<string>();
  const toInsert: Array<{ name: string; email: string }> = [];
  for (const sender of allSenders) {
    const key = sender.email.toLowerCase();
    if (!existingEmails.has(key) && !seen.has(key) && sender.email && sender.email !== "unknown@example.com") {
      seen.add(key);
      toInsert.push(sender);
    }
  }

  let added = 0;
  for (const s of toInsert) {
    try {
      await db.insert(contactsTable).values({ name: s.name, email: s.email }).onConflictDoNothing();
      added++;
    } catch {
    }
  }

  res.json({ added, total: toInsert.length });
});

router.post("/contacts", async (req, res): Promise<void> => {
  const parsed = CreateContactBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [contact] = await db.insert(contactsTable).values(parsed.data).returning();

  res.status(201).json(
    GetContactResponse.parse({
      ...contact,
      messageCount: 0,
      lastMessageAt: null,
      createdAt: contact.createdAt.toISOString(),
    })
  );
});

router.get("/contacts/:id", async (req, res): Promise<void> => {
  const params = GetContactParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [contact] = await db.select().from(contactsTable).where(eq(contactsTable.id, params.data.id));
  if (!contact) {
    res.status(404).json({ error: "Contact not found" });
    return;
  }

  const [stats] = await db
    .select({ cnt: count(), lastAt: max(messagesTable.receivedAt) })
    .from(messagesTable)
    .where(eq(messagesTable.fromEmail, contact.email));

  const [unreadRow] = await db
    .select({ cnt: count() })
    .from(messagesTable)
    .where(and(eq(messagesTable.fromEmail, contact.email), eq(messagesTable.isRead, false)));

  res.json(
    GetContactResponse.parse({
      ...contact,
      messageCount: Number(stats?.cnt ?? 0),
      unreadCount: Number(unreadRow?.cnt ?? 0),
      lastMessageAt: stats?.lastAt ? stats.lastAt.toISOString() : null,
      createdAt: contact.createdAt.toISOString(),
    })
  );
});

router.patch("/contacts/:id", async (req, res): Promise<void> => {
  const params = UpdateContactParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateContactBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.name != null) updateData.name = parsed.data.name;
  if (parsed.data.email != null) updateData.email = parsed.data.email;
  if (parsed.data.phone !== undefined) updateData.phone = parsed.data.phone;
  if (parsed.data.company !== undefined) updateData.company = parsed.data.company;
  if (parsed.data.avatarUrl !== undefined) updateData.avatarUrl = parsed.data.avatarUrl;
  if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes;

  const [contact] = await db
    .update(contactsTable)
    .set(updateData)
    .where(eq(contactsTable.id, params.data.id))
    .returning();

  if (!contact) {
    res.status(404).json({ error: "Contact not found" });
    return;
  }

  const [stats] = await db
    .select({ cnt: count(), lastAt: max(messagesTable.receivedAt) })
    .from(messagesTable)
    .where(eq(messagesTable.fromEmail, contact.email));

  const [unreadRow2] = await db
    .select({ cnt: count() })
    .from(messagesTable)
    .where(and(eq(messagesTable.fromEmail, contact.email), eq(messagesTable.isRead, false)));

  res.json(
    UpdateContactResponse.parse({
      ...contact,
      messageCount: Number(stats?.cnt ?? 0),
      unreadCount: Number(unreadRow2?.cnt ?? 0),
      lastMessageAt: stats?.lastAt ? stats.lastAt.toISOString() : null,
      createdAt: contact.createdAt.toISOString(),
    })
  );
});

router.delete("/contacts/:id", async (req, res): Promise<void> => {
  const params = DeleteContactParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db.delete(contactsTable).where(eq(contactsTable.id, params.data.id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "Contact not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
