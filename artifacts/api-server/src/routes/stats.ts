import { Router, type IRouter } from "express";
import { eq, count, sql } from "drizzle-orm";
import { db, accountsTable, messagesTable, contactsTable } from "@workspace/db";
import { GetOverviewStatsResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/stats/overview", async (_req, res): Promise<void> => {
  const [totalMsgRow] = await db.select({ cnt: count() }).from(messagesTable);
  const [totalUnreadRow] = await db
    .select({ cnt: count() })
    .from(messagesTable)
    .where(eq(messagesTable.isRead, false));
  const [totalStarredRow] = await db
    .select({ cnt: count() })
    .from(messagesTable)
    .where(eq(messagesTable.isStarred, true));
  const [totalContactsRow] = await db.select({ cnt: count() }).from(contactsTable);

  const accounts = await db.select().from(accountsTable);

  const breakdown = await Promise.all(
    accounts.map(async (account) => {
      const [totalRow] = await db
        .select({ cnt: count() })
        .from(messagesTable)
        .where(eq(messagesTable.accountId, account.id));
      const [unreadRow] = await db
        .select({ cnt: count() })
        .from(messagesTable)
        .where(
          sql`${messagesTable.accountId} = ${account.id} AND ${messagesTable.isRead} = false`
        );
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

  res.json(
    GetOverviewStatsResponse.parse({
      totalAccounts: accounts.length,
      totalMessages: Number(totalMsgRow?.cnt ?? 0),
      totalUnread: Number(totalUnreadRow?.cnt ?? 0),
      totalStarred: Number(totalStarredRow?.cnt ?? 0),
      totalContacts: Number(totalContactsRow?.cnt ?? 0),
      accountBreakdown: breakdown,
    })
  );
});

export default router;
