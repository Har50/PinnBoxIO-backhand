import { Router, type IRouter } from "express";
import { eq, count, and } from "drizzle-orm";
import { db, accountsTable, messagesTable } from "@workspace/db";
import { getGmailAccount } from "../services/gmail";
import { getOutlookAccount } from "../services/outlook";
import {
  CreateAccountBody,
  GetAccountParams,
  DeleteAccountParams,
  GetAccountsResponse,
  GetAccountResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/accounts", async (req, res): Promise<void> => {
  const accounts = await db.select().from(accountsTable).orderBy(accountsTable.createdAt);
  const [gmailAccount, outlookAccount] = await Promise.all([getGmailAccount(), getOutlookAccount()]);

  // Get unread counts per account
  const unreadCounts = await db
    .select({ accountId: messagesTable.accountId, cnt: count() })
    .from(messagesTable)
    .where(eq(messagesTable.isRead, false))
    .groupBy(messagesTable.accountId);

  const unreadMap = new Map(unreadCounts.map((r) => [r.accountId, Number(r.cnt)]));

  const result = accounts.map((a) => ({
    ...a,
    unreadCount: unreadMap.get(a.id) ?? 0,
    createdAt: a.createdAt.toISOString(),
  }));

  res.json(GetAccountsResponse.parse([gmailAccount, outlookAccount, ...result].filter(Boolean)));
});

router.post("/accounts", async (req, res): Promise<void> => {
  const parsed = CreateAccountBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [account] = await db.insert(accountsTable).values(parsed.data).returning();

  res.status(201).json(
    GetAccountResponse.parse({
      ...account,
      unreadCount: 0,
      createdAt: account.createdAt.toISOString(),
    })
  );
});

router.get("/accounts/:id", async (req, res): Promise<void> => {
  const params = GetAccountParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [account] = await db.select().from(accountsTable).where(eq(accountsTable.id, params.data.id));
  if (!account) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  const [unreadRow] = await db
    .select({ cnt: count() })
    .from(messagesTable)
    .where(and(eq(messagesTable.accountId, account.id), eq(messagesTable.isRead, false)));

  res.json(
    GetAccountResponse.parse({
      ...account,
      unreadCount: Number(unreadRow?.cnt ?? 0),
      createdAt: account.createdAt.toISOString(),
    })
  );
});

router.delete("/accounts/:id", async (req, res): Promise<void> => {
  const params = DeleteAccountParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db.delete(accountsTable).where(eq(accountsTable.id, params.data.id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
