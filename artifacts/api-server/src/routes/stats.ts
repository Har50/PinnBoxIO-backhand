import { Router, type IRouter } from "express";
import { eq, count, sql, and } from "drizzle-orm";
import { db, accountsTable, messagesTable, contactsTable } from "@workspace/db";
import { GetOverviewStatsResponse } from "@workspace/api-zod";
import { getGmailAccount, getGmailUnreadCount, getGmailStarredCount } from "../services/gmail";
import { getOutlookAccount, getOutlookUnreadCount, getOutlookStarredCount } from "../services/outlook";

const router: IRouter = Router();

router.get("/stats/overview", async (req: any, res): Promise<void> => {
  const userId: string = req.userId;

  const userAccountsQ = db.select().from(accountsTable).where(eq(accountsTable.userId, userId));

  const [totalMsgRow] = await db
    .select({ cnt: count() })
    .from(messagesTable)
    .innerJoin(accountsTable, and(eq(messagesTable.accountId, accountsTable.id), eq(accountsTable.userId, userId)));

  const [totalUnreadRow] = await db
    .select({ cnt: count() })
    .from(messagesTable)
    .innerJoin(accountsTable, and(eq(messagesTable.accountId, accountsTable.id), eq(accountsTable.userId, userId)))
    .where(eq(messagesTable.isRead, false));

  const [totalStarredRow] = await db
    .select({ cnt: count() })
    .from(messagesTable)
    .innerJoin(accountsTable, and(eq(messagesTable.accountId, accountsTable.id), eq(accountsTable.userId, userId)))
    .where(eq(messagesTable.isStarred, true));

  const [totalContactsRow] = await db
    .select({ cnt: count() })
    .from(contactsTable)
    .where(eq(contactsTable.userId, userId));

  const dbAccounts = await userAccountsQ;

  const [gmailAccount, outlookAccount, gmailUnread, outlookUnread, gmailStarred, outlookStarred] = await Promise.all([
    getGmailAccount(userId),
    getOutlookAccount(userId),
    getGmailUnreadCount(userId),
    getOutlookUnreadCount(userId),
    getGmailStarredCount(userId),
    getOutlookStarredCount(userId),
  ]);

  const dbBreakdown = await Promise.all(
    dbAccounts.map(async (account) => {
      const [totalRow] = await db
        .select({ cnt: count() })
        .from(messagesTable)
        .where(eq(messagesTable.accountId, account.id));
      const [unreadRow] = await db
        .select({ cnt: count() })
        .from(messagesTable)
        .where(sql`${messagesTable.accountId} = ${account.id} AND ${messagesTable.isRead} = false`);
      return {
        accountId: account.id,
        email: account.email,
        name: account.name,
        color: account.color,
        unread: Number(unreadRow?.cnt ?? 0),
        total: Number(totalRow?.cnt ?? 0),
      };
    })
  );

  const liveBreakdown = [];
  if (gmailAccount) {
    liveBreakdown.push({
      accountId: gmailAccount.id,
      email: gmailAccount.email ?? "Gmail",
      name: "Gmail",
      color: "#ea4335",
      unread: gmailUnread,
      total: gmailUnread,
    });
  }
  if (outlookAccount) {
    liveBreakdown.push({
      accountId: outlookAccount.id,
      email: outlookAccount.email ?? "Outlook",
      name: "Outlook",
      color: "#0078d4",
      unread: outlookUnread,
      total: outlookUnread,
    });
  }

  const breakdown = [...liveBreakdown, ...dbBreakdown];
  const totalUnread = Number(totalUnreadRow?.cnt ?? 0) + gmailUnread + outlookUnread;
  const totalStarred = Number(totalStarredRow?.cnt ?? 0) + gmailStarred + outlookStarred;
  const totalAccounts = dbAccounts.length + (gmailAccount ? 1 : 0) + (outlookAccount ? 1 : 0);

  res.json(
    GetOverviewStatsResponse.parse({
      totalAccounts,
      totalMessages: Number(totalMsgRow?.cnt ?? 0),
      totalUnread,
      totalStarred,
      totalContacts: Number(totalContactsRow?.cnt ?? 0),
      accountBreakdown: breakdown,
    })
  );
});

export default router;
