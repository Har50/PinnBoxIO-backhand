import { Router, type IRouter } from "express";
import { eq, ilike, or, count, max, desc } from "drizzle-orm";
import { db, accountsTable, messagesTable, contactsTable, attachmentsTable } from "@workspace/db";
import { SearchAllQueryParams, SearchAllResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/search", async (req, res): Promise<void> => {
  const query = SearchAllQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { q, type, accountId } = query.data;

  let messages: unknown[] = [];
  let contacts: unknown[] = [];

  if (!type || type === "messages" || type === "all") {
    const msgConditions = [
      or(
        ilike(messagesTable.subject, `%${q}%`),
        ilike(messagesTable.fromName, `%${q}%`),
        ilike(messagesTable.fromEmail, `%${q}%`),
        ilike(messagesTable.bodyText, `%${q}%`),
        ilike(messagesTable.toList, `%${q}%`)
      ),
    ];
    if (accountId) msgConditions.push(eq(messagesTable.accountId, accountId));

    const msgs = await db
      .select({ msg: messagesTable, account: accountsTable })
      .from(messagesTable)
      .innerJoin(accountsTable, eq(messagesTable.accountId, accountsTable.id))
      .where(msgConditions.length === 1 ? msgConditions[0] : (msgConditions[0]))
      .orderBy(desc(messagesTable.receivedAt))
      .limit(30);

    messages = await Promise.all(
      msgs.map(async ({ msg, account }) => {
        const attachments = await db
          .select()
          .from(attachmentsTable)
          .where(eq(attachmentsTable.messageId, msg.id));
        return {
          id: msg.id,
          accountId: msg.accountId,
          accountEmail: account.email,
          accountName: account.name,
          accountColor: account.color,
          folder: msg.folder,
          subject: msg.subject,
          fromName: msg.fromName,
          fromEmail: msg.fromEmail,
          toList: msg.toList,
          ccList: msg.ccList ?? null,
          bodyText: msg.bodyText ?? null,
          bodyHtml: msg.bodyHtml ?? null,
          isRead: msg.isRead,
          isStarred: msg.isStarred,
          hasAttachments: msg.hasAttachments,
          attachments: attachments.map((a) => ({
            id: a.id,
            messageId: a.messageId,
            filename: a.filename,
            mimeType: a.mimeType,
            size: a.size,
            url: a.url ?? null,
          })),
          receivedAt: msg.receivedAt.toISOString(),
          createdAt: msg.createdAt.toISOString(),
        };
      })
    );
  }

  if (!type || type === "contacts" || type === "all") {
    const ctcts = await db
      .select()
      .from(contactsTable)
      .where(
        or(
          ilike(contactsTable.name, `%${q}%`),
          ilike(contactsTable.email, `%${q}%`),
          ilike(contactsTable.company, `%${q}%`),
          ilike(contactsTable.notes, `%${q}%`)
        )
      )
      .limit(20);

    const messageCounts = await db
      .select({ fromEmail: messagesTable.fromEmail, cnt: count(), lastAt: max(messagesTable.receivedAt) })
      .from(messagesTable)
      .groupBy(messagesTable.fromEmail);

    const countMap = new Map(messageCounts.map((r) => [r.fromEmail, { cnt: Number(r.cnt), lastAt: r.lastAt }]));

    contacts = ctcts.map((c) => {
      const stats = countMap.get(c.email);
      return {
        ...c,
        messageCount: stats?.cnt ?? 0,
        lastMessageAt: stats?.lastAt ? stats.lastAt.toISOString() : null,
        createdAt: c.createdAt.toISOString(),
      };
    });
  }

  res.json(
    SearchAllResponse.parse({
      messages,
      contacts,
      query: q,
      totalMessages: messages.length,
      totalContacts: contacts.length,
    })
  );
});

export default router;
