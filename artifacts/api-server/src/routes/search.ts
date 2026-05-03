import { Router, type IRouter } from "express";
import { eq, ilike, or, count, max, desc, and } from "drizzle-orm";
import { db, accountsTable, messagesTable, contactsTable, attachmentsTable } from "@workspace/db";
import { listGmailMessages } from "../services/gmail";
import { listOutlookMessages } from "../services/outlook";

const router: IRouter = Router();

type SearchableMessage = {
  subject?: string | null;
  fromName?: string | null;
  fromEmail?: string | null;
  toList?: string | null;
  ccList?: string | null;
  bodyText?: string | null;
};

function matchesMessage(message: SearchableMessage, q: string) {
  const haystack = [
    message.subject,
    message.fromName,
    message.fromEmail,
    message.toList,
    message.ccList,
    message.bodyText,
  ].join(" ").toLowerCase();
  return haystack.includes(q.toLowerCase());
}

router.get("/search", async (req: any, res): Promise<void> => {
  const q = (req.query.q as string || "").trim();
  const type = req.query.type as string | undefined;

  if (!q) {
    res.status(400).json({ error: "q is required" });
    return;
  }

  const userId: string | undefined = (req as any).userId;

  let messages: unknown[] = [];
  let contacts: unknown[] = [];

  if (!type || type === "messages" || type === "all") {
    const msgs = await db
      .select({ msg: messagesTable, account: accountsTable })
      .from(messagesTable)
      .innerJoin(accountsTable, and(eq(messagesTable.accountId, accountsTable.id), eq(accountsTable.userId, userId ?? "")))
      .where(
        or(
          ilike(messagesTable.subject, `%${q}%`),
          ilike(messagesTable.fromName, `%${q}%`),
          ilike(messagesTable.fromEmail, `%${q}%`),
          ilike(messagesTable.bodyText, `%${q}%`),
          ilike(messagesTable.toList, `%${q}%`)
        )
      )
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

    const [gmailMessages, outlookMessages] = await Promise.all([
      listGmailMessages(userId, null, 25),
      listOutlookMessages(userId, null, 25),
    ]);

    const liveMessages = [...(gmailMessages?.messages ?? []), ...(outlookMessages?.messages ?? [])]
      .filter((message) => matchesMessage(message, q))
      .filter((message) => !messages.some((existing: any) => existing.id === message.id))
      .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());

    messages = [...messages, ...liveMessages].slice(0, 50);
  }

  if (!type || type === "contacts" || type === "all") {
    const ctcts = await db
      .select()
      .from(contactsTable)
      .where(
        and(
          eq(contactsTable.userId, userId ?? ""),
          or(
            ilike(contactsTable.name, `%${q}%`),
            ilike(contactsTable.email, `%${q}%`),
            ilike(contactsTable.company, `%${q}%`),
            ilike(contactsTable.notes, `%${q}%`)
          )
        )
      )
      .limit(20);

    const messageCounts = await db
      .select({ fromEmail: messagesTable.fromEmail, cnt: count(), lastAt: max(messagesTable.receivedAt) })
      .from(messagesTable)
      .innerJoin(accountsTable, and(eq(messagesTable.accountId, accountsTable.id), eq(accountsTable.userId, userId ?? "")))
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

  res.json({
    query: q,
    messages,
    contacts,
    totalMessages: messages.length,
    totalContacts: contacts.length,
  });
});

export default router;
