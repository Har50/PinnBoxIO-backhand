import { Router, type IRouter } from "express";
import { eq, ilike, or, count, max, desc, and } from "drizzle-orm";
import { db, accountsTable, messagesTable, contactsTable, attachmentsTable, usersTable } from "@workspace/db";
import { whatsappService } from "../services/whatsapp.js";
import { listGmailMessages } from "../services/gmail";
import { listOutlookMessages } from "../services/outlook";
import { linkedInService } from "../services/linkedin";

const router: IRouter = Router();

const FREE_SEARCH_PER_DAY = 3;

// In-memory daily counter: Map<"userId:YYYY-MM-DD", number>
const searchUsage = new Map<string, number>();

function todayKey(userId: string): string {
  const d = new Date();
  return `${userId}:${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

async function getSearchAccess(userId: string | undefined): Promise<{ allowed: boolean; isPro: boolean; usedToday: number; limit: number | null }> {
  if (!userId) {
    return { allowed: true, isPro: false, usedToday: 0, limit: null };
  }

  const [user] = await db.select({ isPro: usersTable.isPro }).from(usersTable).where(eq(usersTable.id, userId));
  if (user?.isPro) {
    return { allowed: true, isPro: true, usedToday: 0, limit: null };
  }

  const key = todayKey(userId);
  const used = searchUsage.get(key) ?? 0;
  return {
    allowed: used < FREE_SEARCH_PER_DAY,
    isPro: false,
    usedToday: used,
    limit: FREE_SEARCH_PER_DAY,
  };
}

function incrementSearch(userId: string) {
  const key = todayKey(userId);
  searchUsage.set(key, (searchUsage.get(key) ?? 0) + 1);
}

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

  const access = await getSearchAccess(userId);
  if (!access.allowed) {
    res.status(402).json({
      error: "Daily search limit reached. Upgrade to Pro for unlimited search.",
      code: "SEARCH_DAILY_LIMIT_REACHED",
      usedToday: access.usedToday,
      limit: access.limit,
    });
    return;
  }

  if (userId) {
    incrementSearch(userId);
  }

  let messages: unknown[] = [];
  let contacts: unknown[] = [];
  let whatsappMessages: unknown[] = [];
  let linkedinMessages: unknown[] = [];

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

  if (!type || type === "whatsapp" || type === "all") {
    const lowerQ = q.toLowerCase();
    const chats = whatsappService.getChats();
    for (const chat of chats) {
      const msgs = whatsappService.getMessages(chat.id);
      for (const m of msgs) {
        const text = (
          m.message?.conversation ??
          m.message?.extendedTextMessage?.text ??
          ""
        ).trim();
        if (text.toLowerCase().includes(lowerQ)) {
          whatsappMessages.push({
            id: m.key?.id ?? "",
            chatId: chat.id,
            chatName: chat.name ?? chat.id,
            text,
            fromMe: m.key?.fromMe ?? false,
            timestamp: m.messageTimestamp
              ? new Date(Number(m.messageTimestamp) * 1000).toISOString()
              : null,
          });
          if (whatsappMessages.length >= 20) break;
        }
      }
      if (whatsappMessages.length >= 20) break;
    }
  }

  if (userId && (!type || type === "linkedin" || type === "all")) {
    try {
      await linkedInService.ensureSession(userId);
      if (linkedInService.getStatus(userId) === "connected") {
        const lowerQ = q.toLowerCase();
        const conversations = await linkedInService.getConversations(userId);
        for (const conv of conversations) {
          if (linkedinMessages.length >= 20) break;
          const inLast = (conv.lastMessage ?? "").toLowerCase().includes(lowerQ);
          const inName = (conv.participantName ?? "").toLowerCase().includes(lowerQ);
          if (inLast || inName) {
            linkedinMessages.push({
              id: conv.id,
              conversationId: conv.id,
              participantName: conv.participantName,
              participantPicture: conv.participantPicture,
              text: conv.lastMessage ?? "",
              timestamp: conv.lastActivityAt
                ? new Date(conv.lastActivityAt).toISOString()
                : null,
              unreadCount: conv.unreadCount,
            });
          }
        }
      }
    } catch (err) {
      // LinkedIn messaging may require partner approval — silently skip
    }
  }

  res.json({
    query: q,
    messages,
    contacts,
    whatsappMessages,
    linkedinMessages,
    totalMessages: messages.length,
    totalContacts: contacts.length,
    totalWhatsapp: whatsappMessages.length,
    totalLinkedin: linkedinMessages.length,
    searchAccess: {
      isPro: access.isPro,
      usedToday: access.usedToday + 1,
      limit: access.limit,
    },
  });
});

export default router;
