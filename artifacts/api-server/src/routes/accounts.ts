import { Router, type IRouter } from "express";
import { eq, count, and } from "drizzle-orm";
import { db, accountsTable, messagesTable } from "@workspace/db";
import { getGmailAccount, isGmailConnected } from "../services/gmail";
import { getOutlookAccount, isOutlookConnected } from "../services/outlook";
import {
  CreateAccountBody,
  GetAccountParams,
  DeleteAccountParams,
  GetAccountsResponse,
  GetAccountResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/accounts", async (req: any, res): Promise<void> => {
  const userId: string = req.userId;

  const accounts = await db
    .select()
    .from(accountsTable)
    .where(eq(accountsTable.userId, userId))
    .orderBy(accountsTable.createdAt);

  const [gmailAccount, outlookAccount] = await Promise.all([
    getGmailAccount(userId),
    getOutlookAccount(userId),
  ]);

  const unreadCounts = await db
    .select({ accountId: messagesTable.accountId, cnt: count() })
    .from(messagesTable)
    .innerJoin(accountsTable, and(eq(messagesTable.accountId, accountsTable.id), eq(accountsTable.userId, userId)))
    .where(eq(messagesTable.isRead, false))
    .groupBy(messagesTable.accountId);

  const unreadMap = new Map(unreadCounts.map((r) => [r.accountId, Number(r.cnt)]));

  const result = accounts.map((a) => ({
    ...a,
    unreadCount: unreadMap.get(a.id) ?? 0,
    createdAt: a.createdAt.toISOString(),
  }));

  const gmailConnected = gmailAccount !== null;
  const outlookConnected = outlookAccount !== null;

  res.json(
    GetAccountsResponse.parse([
      gmailAccount,
      outlookAccount,
      ...result,
    ].filter(Boolean))
  );
});

router.get("/accounts/connected", async (req: any, res): Promise<void> => {
  const userId: string = req.userId;
  const [gmail, outlook] = await Promise.all([
    isGmailConnected(userId),
    isOutlookConnected(userId),
  ]);
  res.json({ gmail, outlook });
});

router.post("/accounts", async (req: any, res): Promise<void> => {
  const parsed = CreateAccountBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const userId: string = req.userId;
  const [account] = await db
    .insert(accountsTable)
    .values({ ...parsed.data, userId })
    .returning();

  res.status(201).json(
    GetAccountResponse.parse({
      ...account,
      unreadCount: 0,
      createdAt: account.createdAt.toISOString(),
    })
  );
});

router.get("/accounts/:id", async (req: any, res): Promise<void> => {
  const params = GetAccountParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const userId: string = req.userId;
  const [account] = await db
    .select()
    .from(accountsTable)
    .where(and(eq(accountsTable.id, params.data.id), eq(accountsTable.userId, userId)));

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

router.delete("/accounts/:id", async (req: any, res): Promise<void> => {
  const params = DeleteAccountParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const userId: string = req.userId;
  const [deleted] = await db
    .delete(accountsTable)
    .where(and(eq(accountsTable.id, params.data.id), eq(accountsTable.userId, userId)))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
