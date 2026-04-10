import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  aiConversationsTable,
  aiMessagesTable,
  messagesTable,
  contactsTable,
} from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { ai as geminiAi } from "@workspace/integrations-gemini-ai";
import { whatsappService } from "../services/whatsapp.js";

const router: IRouter = Router();

type Provider = "openai" | "claude" | "gemini";

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
    .limit(25);

  const contacts = await db
    .select({ name: contactsTable.name, email: contactsTable.email, company: contactsTable.company })
    .from(contactsTable)
    .limit(30);

  const waChats = whatsappService.getChats();
  const waMessages: Array<{ chatId: string; chatName: string; text: string; fromMe: boolean; timestamp: number }> = [];
  for (const chat of waChats.slice(0, 5)) {
    const msgs = whatsappService.getMessages(chat.id);
    for (const m of msgs.slice(-5)) {
      const text = (m.message?.conversation ?? m.message?.extendedTextMessage?.text ?? "").trim();
      if (text) {
        waMessages.push({
          chatId: chat.id,
          chatName: chat.name ?? chat.id,
          text,
          fromMe: m.key?.fromMe ?? false,
          timestamp: Number(m.messageTimestamp ?? 0),
        });
      }
    }
  }
  waMessages.sort((a, b) => b.timestamp - a.timestamp);

  let context = "You are a smart communications assistant for CommsHub.\n";
  context += "You help users manage their email, WhatsApp, and phone communications.\n";
  context += "You have full memory of all past messages in this conversation.\n\n";

  if (recentMessages.length > 0) {
    context += "=== Recent Email Messages ===\n";
    for (const m of recentMessages) {
      const date = m.receivedAt ? new Date(m.receivedAt).toLocaleDateString() : "";
      context += `[${date}] ${m.folder.toUpperCase()} - From: ${m.fromName} <${m.fromEmail}> | Subject: ${m.subject}`;
      if (m.bodyText) context += ` | Preview: ${m.bodyText.slice(0, 150)}`;
      context += "\n";
    }
    context += "\n";
  }

  if (waMessages.length > 0) {
    context += "=== Recent WhatsApp Messages ===\n";
    for (const m of waMessages) {
      const date = m.timestamp ? new Date(m.timestamp * 1000).toLocaleDateString() : "";
      const direction = m.fromMe ? "You" : m.chatName;
      context += `[${date}] ${direction}: ${m.text.slice(0, 150)}\n`;
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
    "You can help with: summarizing emails, drafting replies, finding contacts, managing priorities, searching WhatsApp conversations, and anything related to communications.";

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
    const { content, provider = "openai" } = req.body as { content: string; provider?: Provider };

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

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    let fullResponse = "";

    if (provider === "claude") {
      const claudeMessages = history.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      const stream = anthropic.messages.stream({
        model: "claude-sonnet-4-6",
        max_tokens: 8192,
        system: systemContext,
        messages: claudeMessages,
      });

      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          fullResponse += event.delta.text;
          res.write(`data: ${JSON.stringify({ content: event.delta.text })}\n\n`);
        }
      }
    } else if (provider === "gemini") {
      const geminiContents = history.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

      const geminiStream = await geminiAi.models.generateContentStream({
        model: "gemini-2.5-flash",
        contents: [
          { role: "user", parts: [{ text: systemContext }] },
          { role: "model", parts: [{ text: "Understood. I am ready to help with communications." }] },
          ...geminiContents,
        ],
        config: { maxOutputTokens: 8192 },
      });

      for await (const chunk of geminiStream) {
        const text = chunk.text;
        if (text) {
          fullResponse += text;
          res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
        }
      }
    } else {
      const chatMessages: any[] = [
        { role: "system", content: systemContext },
        ...history.map((m) => ({ role: m.role, content: m.content })),
      ];

      const stream = await openai.chat.completions.create({
        model: "gpt-4o",
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
