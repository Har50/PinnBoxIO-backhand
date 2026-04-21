import { Router, type IRouter } from "express";
import { eq, and, desc, ilike, or, count, sql } from "drizzle-orm";
import { db, accountsTable, messagesTable, attachmentsTable } from "@workspace/db";
import { getGmailMessage, listGmailMessages } from "../services/gmail";
import { getOutlookMessage, listOutlookMessages } from "../services/outlook";
import {
  CreateMessageBody,
  UpdateMessageBody,
  UpdateMessageParams,
  GetMessageParams,
  DeleteMessageParams,
  GetMessagesQueryParams,
  GetRecentMessagesQueryParams,
  GetMessagesResponse,
  GetMessageResponse,
  UpdateMessageResponse,
  AddAttachmentParams,
  AddAttachmentBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function buildMessageResponse(msg: typeof messagesTable.$inferSelect, account: typeof accountsTable.$inferSelect) {
  const attachments = await db.select().from(attachmentsTable).where(eq(attachmentsTable.messageId, msg.id));
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
}

router.get("/messages/recent", async (req, res): Promise<void> => {
  const query = GetRecentMessagesQueryParams.safeParse(req.query);
  const limit = query.success && query.data.limit ? query.data.limit : 20;

  const msgs = await db
    .select({
      msg: messagesTable,
      account: accountsTable,
    })
    .from(messagesTable)
    .innerJoin(accountsTable, eq(messagesTable.accountId, accountsTable.id))
    .orderBy(desc(messagesTable.receivedAt))
    .limit(limit);

  const results = await Promise.all(msgs.map(({ msg, account }) => buildMessageResponse(msg, account)));
  res.json(results);
});

router.get("/messages", async (req, res): Promise<void> => {
  const query = GetMessagesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { accountId, folder, limit = 50, offset = 0 } = query.data;
  if (accountId === -1) {
    const gmailMessages = await listGmailMessages(folder, limit ?? 25);
    if (gmailMessages) {
      res.json(GetMessagesResponse.parse(gmailMessages));
      return;
    }
  }

  if (accountId === -2) {
    const outlookMessages = await listOutlookMessages(folder, limit ?? 25);
    if (outlookMessages) {
      res.json(GetMessagesResponse.parse(outlookMessages));
      return;
    }
  }

  if (!accountId) {
    const [gmailMessages, outlookMessages] = await Promise.all([
      listGmailMessages(folder, limit ?? 25),
      listOutlookMessages(folder, limit ?? 25),
    ]);
    if (gmailMessages || outlookMessages) {
      const messages = [...(gmailMessages?.messages ?? []), ...(outlookMessages?.messages ?? [])]
        .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())
        .slice(0, limit ?? 50);
      res.json(
        GetMessagesResponse.parse({
          messages,
          total: (gmailMessages?.total ?? 0) + (outlookMessages?.total ?? 0),
          hasMore: Boolean(gmailMessages?.hasMore || outlookMessages?.hasMore),
        })
      );
      return;
    }
  }

  const conditions = [];
  if (accountId) conditions.push(eq(messagesTable.accountId, accountId));
  if (folder) conditions.push(eq(messagesTable.folder, folder));

  const [totalRow] = await db
    .select({ cnt: count() })
    .from(messagesTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  const msgs = await db
    .select({ msg: messagesTable, account: accountsTable })
    .from(messagesTable)
    .innerJoin(accountsTable, eq(messagesTable.accountId, accountsTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(messagesTable.receivedAt))
    .limit(limit ?? 50)
    .offset(offset ?? 0);

  const total = Number(totalRow?.cnt ?? 0);
  const messages = await Promise.all(msgs.map(({ msg, account }) => buildMessageResponse(msg, account)));

  res.json(
    GetMessagesResponse.parse({
      messages,
      total,
      hasMore: (offset ?? 0) + messages.length < total,
    })
  );
});

router.post("/messages", async (req, res): Promise<void> => {
  const parsed = CreateMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [account] = await db.select().from(accountsTable).where(eq(accountsTable.id, parsed.data.accountId));
  if (!account) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  const [msg] = await db
    .insert(messagesTable)
    .values({
      ...parsed.data,
      receivedAt: new Date(parsed.data.receivedAt),
    })
    .returning();

  const response = await buildMessageResponse(msg, account);
  res.status(201).json(GetMessageResponse.parse(response));
});

router.get("/messages/:id", async (req, res): Promise<void> => {
  const params = GetMessageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (params.data.id < 0) {
    const [gmailMessage, outlookMessage] = await Promise.all([
      getGmailMessage(params.data.id),
      getOutlookMessage(params.data.id),
    ]);
    const message = gmailMessage ?? outlookMessage;
    if (!message) {
      res.status(404).json({ error: "Message not found" });
      return;
    }
    res.json(GetMessageResponse.parse(message));
    return;
  }

  const [row] = await db
    .select({ msg: messagesTable, account: accountsTable })
    .from(messagesTable)
    .innerJoin(accountsTable, eq(messagesTable.accountId, accountsTable.id))
    .where(eq(messagesTable.id, params.data.id));

  if (!row) {
    res.status(404).json({ error: "Message not found" });
    return;
  }

  const response = await buildMessageResponse(row.msg, row.account);
  res.json(GetMessageResponse.parse(response));
});

router.patch("/messages/:id", async (req, res): Promise<void> => {
  const params = UpdateMessageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.isRead != null) updateData.isRead = parsed.data.isRead;
  if (parsed.data.isStarred != null) updateData.isStarred = parsed.data.isStarred;
  if (parsed.data.folder != null) updateData.folder = parsed.data.folder;

  const [msg] = await db
    .update(messagesTable)
    .set(updateData)
    .where(eq(messagesTable.id, params.data.id))
    .returning();

  if (!msg) {
    res.status(404).json({ error: "Message not found" });
    return;
  }

  const [account] = await db.select().from(accountsTable).where(eq(accountsTable.id, msg.accountId));
  const response = await buildMessageResponse(msg, account!);
  res.json(UpdateMessageResponse.parse(response));
});

router.delete("/messages/:id", async (req, res): Promise<void> => {
  const params = DeleteMessageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db.delete(messagesTable).where(eq(messagesTable.id, params.data.id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "Message not found" });
    return;
  }

  res.sendStatus(204);
});

router.post("/messages/:id/attachments", async (req, res): Promise<void> => {
  const params = AddAttachmentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = AddAttachmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [msg] = await db.select().from(messagesTable).where(eq(messagesTable.id, params.data.id));
  if (!msg) {
    res.status(404).json({ error: "Message not found" });
    return;
  }

  const [att] = await db
    .insert(attachmentsTable)
    .values({ messageId: params.data.id, ...parsed.data })
    .returning();

  // Update hasAttachments flag
  await db.update(messagesTable).set({ hasAttachments: true }).where(eq(messagesTable.id, params.data.id));

  res.status(201).json({
    id: att.id,
    messageId: att.messageId,
    filename: att.filename,
    mimeType: att.mimeType,
    size: att.size,
    url: att.url ?? null,
  });
});

export default router;
