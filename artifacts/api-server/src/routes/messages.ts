import { Router, type IRouter } from "express";
import { eq, and, desc, ilike, or, count, sql } from "drizzle-orm";
import { db, accountsTable, messagesTable, attachmentsTable } from "@workspace/db";
import { getGmailMessage, listGmailMessages, sendGmailMessage } from "../services/gmail";
import { getOutlookMessage, listOutlookMessages, sendOutlookMessage } from "../services/outlook";
import { listImapMessages, getImapMessage, isImapVirtualAccountId, isImapVirtualMsgId, credentialIdFromVirtualAccountId } from "../services/imap";
import { db as _db, imapCredentialsTable } from "@workspace/db";
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

router.get("/messages/folder-counts", async (req: any, res): Promise<void> => {
  const userId: string = req.userId;
  const accountIdRaw = req.query.accountId ? Number(req.query.accountId) : undefined;

  const folders = ["Inbox", "Sent", "Drafts", "Archive", "Trash", "Spam"];

  const conditions = [eq(accountsTable.userId, userId)];
  if (accountIdRaw) conditions.push(eq(messagesTable.accountId, accountIdRaw));

  const totalRows = await db
    .select({ folder: messagesTable.folder, cnt: count() })
    .from(messagesTable)
    .innerJoin(accountsTable, and(eq(messagesTable.accountId, accountsTable.id), eq(accountsTable.userId, userId)))
    .where(and(...conditions))
    .groupBy(messagesTable.folder);

  const unreadRows = await db
    .select({ folder: messagesTable.folder, cnt: count() })
    .from(messagesTable)
    .innerJoin(accountsTable, and(eq(messagesTable.accountId, accountsTable.id), eq(accountsTable.userId, userId)))
    .where(and(...conditions, eq(messagesTable.isRead, false)))
    .groupBy(messagesTable.folder);

  const totalMap = new Map(totalRows.map((r) => [r.folder, Number(r.cnt)]));
  const unreadMap = new Map(unreadRows.map((r) => [r.folder, Number(r.cnt)]));

  const result = folders.map((folder) => ({
    folder,
    total: totalMap.get(folder) ?? 0,
    unread: unreadMap.get(folder) ?? 0,
  }));

  res.json(result);
});

router.get("/messages/recent", async (req: any, res): Promise<void> => {
  const userId: string = req.userId;
  const query = GetRecentMessagesQueryParams.safeParse(req.query);
  const limit = query.success && query.data.limit ? query.data.limit : 20;

  const msgs = await db
    .select({ msg: messagesTable, account: accountsTable })
    .from(messagesTable)
    .innerJoin(accountsTable, and(eq(messagesTable.accountId, accountsTable.id), eq(accountsTable.userId, userId)))
    .orderBy(desc(messagesTable.receivedAt))
    .limit(limit);

  const results = await Promise.all(msgs.map(({ msg, account }) => buildMessageResponse(msg, account)));
  res.json(results);
});

router.get("/messages", async (req: any, res): Promise<void> => {
  const userId: string = req.userId;
  const query = GetMessagesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { accountId, folder, limit = 50, offset = 0 } = query.data;

  if (accountId === -1) {
    const gmailMessages = await listGmailMessages(userId, folder, limit ?? 25);
    if (gmailMessages) {
      res.json(GetMessagesResponse.parse(gmailMessages));
      return;
    }
  }

  if (accountId === -2) {
    const outlookMessages = await listOutlookMessages(userId, folder, limit ?? 25);
    if (outlookMessages) {
      res.json(GetMessagesResponse.parse(outlookMessages));
      return;
    }
  }

  if (accountId && isImapVirtualAccountId(accountId)) {
    const credentialId = credentialIdFromVirtualAccountId(accountId);
    if (credentialId) {
      const imapMessages = await listImapMessages(userId, credentialId, folder ?? "Inbox", limit ?? 25);
      if (imapMessages) {
        res.json(GetMessagesResponse.parse(imapMessages));
        return;
      }
    }
    res.json(GetMessagesResponse.parse({ messages: [], total: 0, hasMore: false }));
    return;
  }

  if (!accountId) {
    const imapCreds = await _db.select({ id: imapCredentialsTable.id }).from(imapCredentialsTable).where(eq(imapCredentialsTable.userId, userId));

    const [gmailMessages, outlookMessages, ...imapResultsList] = await Promise.all([
      listGmailMessages(userId, folder, limit ?? 25),
      listOutlookMessages(userId, folder, limit ?? 25),
      ...imapCreds.map((c) => listImapMessages(userId, c.id, folder ?? "Inbox", Math.min(limit ?? 25, 25))),
    ]);
    if (gmailMessages || outlookMessages || imapResultsList.some(Boolean)) {
      const imapMsgs = imapResultsList.flatMap((r) => r?.messages ?? []);
      const messages = [...(gmailMessages?.messages ?? []), ...(outlookMessages?.messages ?? []), ...imapMsgs]
        .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())
        .slice(0, limit ?? 50);
      res.json(
        GetMessagesResponse.parse({
          messages,
          total: (gmailMessages?.total ?? 0) + (outlookMessages?.total ?? 0) + imapResultsList.reduce((s, r) => s + (r?.total ?? 0), 0),
          hasMore: Boolean(gmailMessages?.hasMore || outlookMessages?.hasMore || imapResultsList.some((r) => r?.hasMore)),
        })
      );
      return;
    }
  }

  const conditions = [eq(accountsTable.userId, userId)];
  if (accountId) conditions.push(eq(messagesTable.accountId, accountId));
  if (folder) conditions.push(eq(messagesTable.folder, folder));

  const [totalRow] = await db
    .select({ cnt: count() })
    .from(messagesTable)
    .innerJoin(accountsTable, eq(messagesTable.accountId, accountsTable.id))
    .where(and(...conditions));

  const msgs = await db
    .select({ msg: messagesTable, account: accountsTable })
    .from(messagesTable)
    .innerJoin(accountsTable, and(eq(messagesTable.accountId, accountsTable.id), eq(accountsTable.userId, userId)))
    .where(and(...conditions))
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

router.post("/messages", async (req: any, res): Promise<void> => {
  const userId: string = req.userId;
  const parsed = CreateMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [account] = await db
    .select()
    .from(accountsTable)
    .where(and(eq(accountsTable.id, parsed.data.accountId), eq(accountsTable.userId, userId)));

  if (!account) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  const [msg] = await db
    .insert(messagesTable)
    .values({ ...parsed.data, receivedAt: new Date(parsed.data.receivedAt) })
    .returning();

  const response = await buildMessageResponse(msg, account);
  res.status(201).json(GetMessageResponse.parse(response));
});

router.get("/messages/:id", async (req: any, res): Promise<void> => {
  const userId: string = req.userId;
  const params = GetMessageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (params.data.id < 0) {
    if (isImapVirtualMsgId(params.data.id)) {
      const imapMessage = await getImapMessage(userId, params.data.id);
      if (imapMessage) {
        res.json(GetMessageResponse.parse(imapMessage));
        return;
      }
      res.status(404).json({ error: "Message not found" });
      return;
    }
    const [gmailMessage, outlookMessage] = await Promise.all([
      getGmailMessage(userId, params.data.id),
      getOutlookMessage(userId, params.data.id),
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
    .innerJoin(accountsTable, and(eq(messagesTable.accountId, accountsTable.id), eq(accountsTable.userId, userId)))
    .where(eq(messagesTable.id, params.data.id));

  if (!row) {
    res.status(404).json({ error: "Message not found" });
    return;
  }

  res.json(GetMessageResponse.parse(await buildMessageResponse(row.msg, row.account)));
});

router.patch("/messages/:id", async (req: any, res): Promise<void> => {
  const userId: string = req.userId;
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

  const [account] = await db
    .select()
    .from(accountsTable)
    .where(and(eq(accountsTable.id, msg.accountId), eq(accountsTable.userId, userId)));

  res.json(UpdateMessageResponse.parse(await buildMessageResponse(msg, account!)));
});

router.delete("/messages/:id", async (req: any, res): Promise<void> => {
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

// Send email via Gmail or Outlook
router.post("/messages/send", async (req: any, res) => {
  const { to, subject, body, provider = "gmail" } = req.body as {
    to: string;
    subject: string;
    body: string;
    provider?: "gmail" | "outlook";
  };

  if (!to || !subject || !body) {
    return res.status(400).json({ error: "to, subject, and body are required" });
  }

  const userId = req.userId as string;
  let result: { success: boolean; error?: string };

  if (provider === "outlook") {
    result = await sendOutlookMessage(userId, to, subject, body);
  } else {
    result = await sendGmailMessage(userId, to, subject, body);
  }

  if (!result.success) {
    return res.status(500).json({ error: result.error ?? "Failed to send email" });
  }
  res.json({ sent: true });
});

export default router;
