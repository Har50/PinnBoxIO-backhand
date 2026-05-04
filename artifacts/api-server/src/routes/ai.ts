import { Router, type IRouter } from "express";
import multer from "multer";
import { Readable } from "stream";
import { db } from "@workspace/db";
import {
  aiConversationsTable,
  aiMessagesTable,
  messagesTable,
  contactsTable,
  storageFilesTable,
  usersTable,
} from "@workspace/db/schema";
import { and, count, desc, eq, gte } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { ai as geminiAi } from "@workspace/integrations-gemini-ai";
import { listGmailMessages } from "../services/gmail";
import { listOutlookMessages } from "../services/outlook";
import { objectStorageClient } from "../lib/objectStorage";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

type Provider = "openai" | "claude" | "gemini";

const FREE_AI_REQUESTS_PER_DAY = 200;

function isTextLikeFile(name: string, mimeType: string) {
  const lowerName = name.toLowerCase();
  const lowerMime = mimeType.toLowerCase();
  return (
    lowerMime.startsWith("text/") ||
    lowerMime.includes("json") ||
    lowerMime.includes("csv") ||
    lowerName.endsWith(".txt") ||
    lowerName.endsWith(".md") ||
    lowerName.endsWith(".csv") ||
    lowerName.endsWith(".json")
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function getTextFileSnippet(storageKey: string, maxChars = 1200) {
  const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
  if (!bucketId) return null;

  try {
    const [buffer] = await objectStorageClient.bucket(bucketId).file(storageKey).download({ start: 0, end: 8191 });
    return buffer.toString("utf8").replace(/\s+/g, " ").trim().slice(0, maxChars) || null;
  } catch {
    return null;
  }
}

async function getUserAiAccess(userId: string) {
  const [user] = await db.select({ isPro: usersTable.isPro }).from(usersTable).where(eq(usersTable.id, userId));
  if (user?.isPro) {
    return { allowed: true, isPro: true, usedToday: 0, limit: null as number | null };
  }

  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const [usage] = await db
    .select({ cnt: count() })
    .from(aiMessagesTable)
    .innerJoin(aiConversationsTable, eq(aiMessagesTable.conversationId, aiConversationsTable.id))
    .where(
      and(
        eq(aiConversationsTable.userId, userId),
        eq(aiMessagesTable.role, "user"),
        gte(aiMessagesTable.createdAt, startOfDay),
      ),
    );

  const usedToday = Number(usage?.cnt ?? 0);
  return {
    allowed: usedToday < FREE_AI_REQUESTS_PER_DAY,
    isPro: false,
    usedToday,
    limit: FREE_AI_REQUESTS_PER_DAY,
  };
}

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
    .limit(50);

  const contacts = await db
    .select({ name: contactsTable.name, email: contactsTable.email, phone: contactsTable.phone, company: contactsTable.company, notes: contactsTable.notes })
    .from(contactsTable)
    .limit(50);

  const storedFiles = await db
    .select({
      name: storageFilesTable.name,
      mimeType: storageFilesTable.mimeType,
      sizeBytes: storageFilesTable.sizeBytes,
      storageKey: storageFilesTable.storageKey,
      folder: storageFilesTable.folder,
      createdAt: storageFilesTable.createdAt,
    })
    .from(storageFilesTable)
    .where(eq(storageFilesTable.userId, userId))
    .orderBy(desc(storageFilesTable.updatedAt))
    .limit(30);

  const textFileSnippets = await Promise.all(
    storedFiles
      .filter((file) => file.sizeBytes <= 1024 * 1024 && isTextLikeFile(file.name, file.mimeType))
      .slice(0, 5)
      .map(async (file) => ({
        name: file.name,
        folder: file.folder,
        snippet: await getTextFileSnippet(file.storageKey),
      })),
  );

  const [gmailInbox, outlookInbox] = await Promise.all([
    listGmailMessages("Inbox", 10).catch(() => null),
    listOutlookMessages("Inbox", 10).catch(() => null),
  ]);

  let context = "You are a smart communications assistant for PinnboxIO. Answer EXACTLY what the user asks — do not add unsolicited drafts or generic advice.\n";
  context += "You help users manage email, contacts, and cloud storage.\n\n";
  context += "RULES (follow strictly):\n";
  context += "1. Answer the user's specific question first. Only write an email draft if they explicitly ask for one.\n";
  context += "2. When asked to write or send an email, always produce the COMPLETE draft in the special block below — never truncate.\n";
  context += "3. Match the requested tone exactly. Default: concise, professional, human.\n";
  context += "4. You CAN send emails. Use the special format below when the user wants to send.\n";
  context += "5. If details are missing (recipient email, etc.), ask for them before drafting.\n";
  context += "6. Keep answers short unless the user asks for detail. Never pad with filler.\n\n";
  context += "EMAIL DRAFT FORMAT — use this EXACTLY when producing an email to send:\n";
  context += "<email-draft>{\"to\":\"recipient@example.com\",\"subject\":\"Subject here\",\"body\":\"Full email body here\"}</email-draft>\n\n";

  if (recentMessages.length > 0) {
    context += "=== Recent Email Messages ===\n";
    for (const m of recentMessages) {
      const date = m.receivedAt ? new Date(m.receivedAt).toLocaleDateString() : "";
      context += `[${date}] ${m.folder.toUpperCase()} - From: ${m.fromName} <${m.fromEmail}> | Subject: ${m.subject}`;
      if (m.bodyText) context += ` | Preview: ${m.bodyText.slice(0, 300)}`;
      context += "\n";
    }
    context += "\n";
  }

  const liveMessages = [...(gmailInbox?.messages ?? []), ...(outlookInbox?.messages ?? [])]
    .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())
    .slice(0, 20);

  if (liveMessages.length > 0) {
    context += "=== Live Connected Gmail/Outlook Inbox Samples ===\n";
    for (const m of liveMessages) {
      const date = m.receivedAt ? new Date(m.receivedAt).toLocaleDateString() : "";
      context += `[${date}] ${m.accountName} - From: ${m.fromName} <${m.fromEmail}> | Subject: ${m.subject}`;
      if (m.bodyText) context += ` | Preview: ${m.bodyText.slice(0, 300)}`;
      context += "\n";
    }
    context += "\n";
  }

  if (contacts.length > 0) {
    context += "=== Contacts ===\n";
    for (const c of contacts) {
      context += `${c.name} <${c.email}>`;
      if (c.phone) context += ` | Phone: ${c.phone}`;
      if (c.company) context += ` (${c.company})`;
      if (c.notes) context += ` | Notes: ${c.notes.slice(0, 180)}`;
      context += "\n";
    }
    context += "\n";
  }

  if (storedFiles.length > 0) {
    context += "=== Stored Cloud Files ===\n";
    for (const file of storedFiles) {
      const date = file.createdAt ? new Date(file.createdAt).toLocaleDateString() : "";
      context += `[${date}] ${file.folder}/${file.name} | ${file.mimeType} | ${formatBytes(file.sizeBytes)}\n`;
    }
    context += "\n";
  }

  const snippets = textFileSnippets.filter((file) => file.snippet);
  if (snippets.length > 0) {
    context += "=== Searchable Text File Snippets ===\n";
    for (const file of snippets) {
      context += `${file.folder}/${file.name}: ${file.snippet}\n`;
    }
    context += "\n";
  }

  context +=
    "You can help with: summarizing emails, drafting replies, writing tailored new emails, finding contacts, managing priorities, referencing stored files, and anything related to communications.";

  return context;
}

router.get("/ai/conversations", async (req: any, res) => {
  try {
    const conversations = await db
      .select()
      .from(aiConversationsTable)
      .where(eq(aiConversationsTable.userId, req.userId))
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
      .values({ userId: req.userId, title: title || "New conversation" })
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

    if (!conversation || conversation.userId !== req.userId) {
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

    if (!conversation || conversation.userId !== req.userId) {
      return res.status(404).json({ error: "Not found" });
    }

    await db.delete(aiConversationsTable).where(eq(aiConversationsTable.id, id));
    res.status(204).end();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

type Attachment = { name: string; mimeType: string; data: string /* base64 */ };

router.post("/ai/conversations/:id/messages", async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const { content, provider = "openai", attachments = [] } = req.body as {
      content: string;
      provider?: Provider;
      attachments?: Attachment[];
    };

    if (!content) return res.status(400).json({ error: "content is required" });

    const [conversation] = await db
      .select()
      .from(aiConversationsTable)
      .where(eq(aiConversationsTable.id, id));

    if (!conversation || conversation.userId !== req.userId) {
      return res.status(404).json({ error: "Not found" });
    }

    const access = await getUserAiAccess(req.userId);
    if (!access.allowed) {
      res.status(402).json({
        error: "Daily free AI limit reached. Upgrade to Pro for unlimited AI with email, contact, and storage context.",
        code: "AI_DAILY_LIMIT_REACHED",
        limit: access.limit,
        usedToday: access.usedToday,
      });
      return;
    }

    await db.insert(aiMessagesTable).values({ conversationId: id, role: "user", content });

    const history = await db
      .select()
      .from(aiMessagesTable)
      .where(eq(aiMessagesTable.conversationId, id))
      .orderBy(aiMessagesTable.createdAt);

    const systemContext = await getUserContext(req.userId);

    // Build the latest user message content with any attachments
    const imageAttachments = attachments.filter((a) => a.mimeType.startsWith("image/"));
    const textAttachments = attachments.filter((a) => !a.mimeType.startsWith("image/"));
    const textAttachmentContext = textAttachments.length > 0
      ? "\n\n[Attached files]\n" + textAttachments.map((a) => `${a.name}:\n${Buffer.from(a.data, "base64").toString("utf8").slice(0, 3000)}`).join("\n\n")
      : "";
    const enrichedContent = content + textAttachmentContext;

    // Web browsers send Accept: text/event-stream for true SSE.
    // React Native / mobile does not, but we still stream chunks so the proxy
    // never sees an idle connection and drops it mid-response.
    const isWebSse = req.headers.accept?.includes("text/event-stream");

    if (isWebSse) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
    } else {
      // Mobile: chunked plain-text so bytes flow continuously and the proxy
      // stays alive even for long AI responses.
      res.setHeader("Content-Type", "text/plain");
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("Transfer-Encoding", "chunked");
    }

    let fullResponse = "";

    const writeChunk = (text: string) => {
      fullResponse += text;
      res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
    };

    if (provider === "claude") {
      const claudeMessages: any[] = history.slice(0, -1).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      const latestContent: any[] = imageAttachments.map((a) => ({
        type: "image",
        source: { type: "base64", media_type: a.mimeType as any, data: a.data },
      }));
      latestContent.push({ type: "text", text: enrichedContent });
      claudeMessages.push({ role: "user", content: latestContent });

      const stream = anthropic.messages.stream({
        model: "claude-sonnet-4-6",
        max_tokens: 8192,
        system: systemContext,
        messages: claudeMessages,
      });

      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          writeChunk(event.delta.text);
        }
      }
    } else if (provider === "gemini") {
      const geminiContents = history.slice(0, -1).map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));
      const latestParts: any[] = imageAttachments.map((a) => ({
        inlineData: { mimeType: a.mimeType, data: a.data },
      }));
      latestParts.push({ text: enrichedContent });
      geminiContents.push({ role: "user", parts: latestParts });

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
        if (chunk.text) writeChunk(chunk.text);
      }
    } else {
      const chatMessages: any[] = [
        { role: "system", content: systemContext },
        ...history.slice(0, -1).map((m) => ({ role: m.role, content: m.content })),
      ];
      if (imageAttachments.length > 0) {
        const latestParts: any[] = imageAttachments.map((a) => ({
          type: "image_url",
          image_url: { url: `data:${a.mimeType};base64,${a.data}`, detail: "auto" },
        }));
        latestParts.push({ type: "text", text: enrichedContent });
        chatMessages.push({ role: "user", content: latestParts });
      } else {
        chatMessages.push({ role: "user", content: enrichedContent });
      }

      const stream = await openai.chat.completions.create({
        model: "gpt-4o",
        max_completion_tokens: 8192,
        messages: chatMessages,
        stream: true,
      });

      for await (const chunk of stream) {
        const chunkContent = chunk.choices[0]?.delta?.content;
        if (chunkContent) writeChunk(chunkContent);
      }
    }

    await db
      .insert(aiMessagesTable)
      .values({ conversationId: id, role: "assistant", content: fullResponse });

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err: any) {
    res.status(500).json({ error: err.message || "AI request failed" });
  }
});

router.post("/ai/transcribe", upload.single("audio"), async (req, res) => {
  const userId = (req as any).userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const file = (req as any).file as Express.Multer.File | undefined;
  if (!file) { res.status(400).json({ error: "No audio file provided" }); return; }

  try {
    const readable = new Readable();
    readable.push(file.buffer);
    readable.push(null);
    (readable as any).name = file.originalname || "recording.m4a";

    const { toFile } = await import("openai");
    const audioFile = await toFile(file.buffer, file.originalname || "recording.m4a", { type: file.mimetype || "audio/m4a" });

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      response_format: "text",
    });

    res.json({ text: transcription });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Transcription failed" });
  }
});

export default router;
