import { Router, type IRouter } from "express";
import { eq, and, desc, ilike, or, count, sql, lte, isNull } from "drizzle-orm";
import { db, accountsTable, messagesTable, attachmentsTable, imapCredentialsTable, scheduledSendsTable } from "@workspace/db";
import { getGmailMessage, listGmailMessages, sendGmailMessage, deleteGmailMessage, createGmailDraft } from "../services/gmail";
import { getOutlookMessage, listOutlookMessages, sendOutlookMessage, deleteOutlookMessage, createOutlookDraft } from "../services/outlook";
import { logger } from "../lib/logger";
import { listImapMessages, getImapMessage, isImapVirtualAccountId, isImapVirtualMsgId, credentialIdFromVirtualAccountId } from "../services/imap";
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
    const imapCreds = await db.select({ id: imapCredentialsTable.id }).from(imapCredentialsTable).where(eq(imapCredentialsTable.userId, userId));

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

  const { id } = params.data;
  const userId = req.userId as string;

  if (id < 0) {
    if (isImapVirtualMsgId(id)) {
      res.status(400).json({ error: "IMAP messages cannot be deleted via this endpoint" });
      return;
    }
    const [gmailOk, outlookOk] = await Promise.all([
      deleteGmailMessage(userId, id).catch(() => false),
      deleteOutlookMessage(userId, id).catch(() => false),
    ]);
    if (gmailOk || outlookOk) {
      res.sendStatus(204);
    } else {
      res.status(404).json({ error: "Message not found or could not be deleted" });
    }
    return;
  }

  const [deleted] = await db.delete(messagesTable).where(eq(messagesTable.id, id)).returning();
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

// Save draft
router.post("/messages/save-draft", async (req: any, res) => {
  const userId = req.userId as string;
  const { to = "", subject = "", body = "", provider, accountId: rawAccountId } = req.body as {
    to?: string;
    subject?: string;
    body?: string;
    provider?: "gmail" | "outlook" | "local";
    accountId?: number;
  };

  try {
    if (provider === "outlook") {
      const result = await createOutlookDraft(userId, to, subject, body);
      if (!result.success) return res.status(500).json({ error: result.error ?? "Failed to save draft" });
      return res.json({ saved: true });
    }

    if (provider === "gmail" || (!rawAccountId && provider !== "local")) {
      const result = await createGmailDraft(userId, to, subject, body);
      if (!result.success) return res.status(500).json({ error: result.error ?? "Failed to save draft" });
      return res.json({ saved: true });
    }

    // Local account — save to DB
    let accountId = rawAccountId;
    if (!accountId) {
      const [firstAccount] = await db.select().from(accountsTable).where(eq(accountsTable.userId, userId)).limit(1);
      if (!firstAccount) return res.status(400).json({ error: "No account found to save draft to" });
      accountId = firstAccount.id;
    }
    const [account] = await db.select().from(accountsTable).where(and(eq(accountsTable.id, accountId), eq(accountsTable.userId, userId)));
    if (!account) return res.status(404).json({ error: "Account not found" });

    await db.insert(messagesTable).values({
      accountId,
      folder: "Drafts",
      subject: subject || "(No Subject)",
      fromName: account.name,
      fromEmail: account.email ?? "",
      toList: to,
      bodyText: body || null,
      receivedAt: new Date(),
    });
    res.json({ saved: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Failed to save draft" });
  }
});

// Schedule send
router.post("/messages/schedule-send", async (req: any, res) => {
  const userId = req.userId as string;
  const { to, subject, body, provider = "gmail", accountId, scheduledAt } = req.body as {
    to: string;
    subject: string;
    body: string;
    provider?: string;
    accountId?: number;
    scheduledAt: string;
  };

  if (!to || !subject || !scheduledAt) {
    return res.status(400).json({ error: "to, subject, and scheduledAt are required" });
  }

  const sendAt = new Date(scheduledAt);
  if (isNaN(sendAt.getTime())) return res.status(400).json({ error: "Invalid scheduledAt date" });

  try {
    await db.insert(scheduledSendsTable).values({
      userId,
      to,
      subject,
      body: body || " ",
      provider,
      accountId: accountId ?? null,
      scheduledAt: sendAt,
    });
    res.json({ scheduled: true, scheduledAt: sendAt.toISOString() });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Failed to schedule send" });
  }
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

// Scheduled send polling worker — runs every 60 s
async function runScheduledSendWorker() {
  try {
    const now = new Date();
    const due = await db
      .select()
      .from(scheduledSendsTable)
      .where(and(lte(scheduledSendsTable.scheduledAt, now), isNull(scheduledSendsTable.sentAt)));

    for (const job of due) {
      let result: { success: boolean; error?: string };
      if (job.provider === "outlook") {
        result = await sendOutlookMessage(job.userId, job.to, job.subject, job.body);
      } else if (job.provider === "gmail") {
        result = await sendGmailMessage(job.userId, job.to, job.subject, job.body);
      } else {
        // local account — mark sent without sending (already composed)
        result = { success: true };
      }

      await db
        .update(scheduledSendsTable)
        .set({ sentAt: new Date(), error: result.success ? null : (result.error ?? "Unknown error") })
        .where(eq(scheduledSendsTable.id, job.id));

      if (!result.success) {
        logger.warn({ jobId: job.id, error: result.error }, "Scheduled send failed");
      }
    }
  } catch (err) {
    logger.warn({ err }, "Scheduled send worker error");
  }
}

setInterval(runScheduledSendWorker, 60_000);
