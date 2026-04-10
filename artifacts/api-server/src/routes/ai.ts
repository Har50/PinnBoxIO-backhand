import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  aiConversationsTable,
  aiMessagesTable,
  messagesTable,
  contactsTable,
} from "@workspace/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

async function getUserContext(userId: string): Promise<string> {
  const recentMessages = await db
    .select({
      subject: messagesTable.subject,
      fromName: messagesTable.fromName,
      fromEmail: messagesTable.fromEmail,
      folder: messagesTable.folder,
      bodyText: messagesTable.bodyText,
      receivedAt: messagesTable.receivedAt,
    })
    .from(messagesTable)
    .orderBy(desc(messagesTable.receivedAt))
    .limit(10);

  const contacts = await db
    .select({ name: contactsTable.name, email: contactsTable.email, company: contactsTable.company })
    .from(contactsTable)
    .limit(20);

  let context = "You are a smart communications assistant for CommsHub.\n";
  context += "You help users manage their email, WhatsApp, and phone communications.\n\n";

  if (recentMessages.length > 0) {
    context += "=== Recent Messages ===\n";
    for (const m of recentMessages) {
      const date = m.receivedAt ? new Date(m.receivedAt).toLocaleDateString() : "";
      context += `[${date}] ${m.folder.toUpperCase()} - From: ${m.fromName} <${m.fromEmail}> | Subject: ${m.subject}`;
      if (m.bodyText) context += ` | Preview: ${m.bodyText.slice(0, 100)}`;
      context += "\n";
    }
    context += "\n";
  }

  if (contacts.length > 0) {
    context += "=== Contacts ===\n";
    for (const c of contacts) {
      context += `${c.name} <${c.email}>`;
      if (c.company) context += ` (${c.company})`;
      context += "\n";
    }
    context += "\n";
  }

  context +=
    "You can help with: summarizing emails, drafting replies, finding contacts, managing priorities, and anything related to communications.";

  return context;
}

router.get("/ai/conversations", async (req: any, res) => {
  try {
    const conversations = await db
      .select()
      .from(aiConversationsTable)
      .where(eq(aiConversationsTable.userId, req.user.id))
      .orderBy(desc(aiConversationsTable.createdAt));
    res.json(conversations);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/ai/conversations", async (req: any, res) => {
  try {
    const { title } = req.body;
    const [conversation] = await db
      .insert(aiConversationsTable)
      .values({ userId: req.user.id, title: title || "New conversation" })
      .returning();
    res.status(201).json(conversation);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/ai/conversations/:id", async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const [conversation] = await db
      .select()
      .from(aiConversationsTable)
      .where(eq(aiConversationsTable.id, id));

    if (!conversation || conversation.userId !== req.user.id) {
      return res.status(404).json({ error: "Not found" });
    }

    const messages = await db
      .select()
      .from(aiMessagesTable)
      .where(eq(aiMessagesTable.conversationId, id))
      .orderBy(aiMessagesTable.createdAt);

    res.json({ ...conversation, messages });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/ai/conversations/:id", async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const [conversation] = await db
      .select()
      .from(aiConversationsTable)
      .where(eq(aiConversationsTable.id, id));

    if (!conversation || conversation.userId !== req.user.id) {
      return res.status(404).json({ error: "Not found" });
    }

    await db.delete(aiConversationsTable).where(eq(aiConversationsTable.id, id));
    res.status(204).end();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/ai/conversations/:id/messages", async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const { content } = req.body;

    if (!content) return res.status(400).json({ error: "content is required" });

    const [conversation] = await db
      .select()
      .from(aiConversationsTable)
      .where(eq(aiConversationsTable.id, id));

    if (!conversation || conversation.userId !== req.user.id) {
      return res.status(404).json({ error: "Not found" });
    }

    await db.insert(aiMessagesTable).values({ conversationId: id, role: "user", content });

    const history = await db
      .select()
      .from(aiMessagesTable)
      .where(eq(aiMessagesTable.conversationId, id))
      .orderBy(aiMessagesTable.createdAt);

    const systemContext = await getUserContext(req.user.id);

    const chatMessages: any[] = [
      { role: "system", content: systemContext },
      ...history.map((m) => ({ role: m.role, content: m.content })),
    ];

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    let fullResponse = "";

    const stream = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 8192,
      messages: chatMessages,
      stream: true,
    });

    for await (const chunk of stream) {
      const chunkContent = chunk.choices[0]?.delta?.content;
      if (chunkContent) {
        fullResponse += chunkContent;
        res.write(`data: ${JSON.stringify({ content: chunkContent })}\n\n`);
      }
    }

    await db
      .insert(aiMessagesTable)
      .values({ conversationId: id, role: "assistant", content: fullResponse });

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err: any) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

export default router;
