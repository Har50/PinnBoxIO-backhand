import { pgTable, text, serial, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { accountsTable } from "./accounts";
import { aiConversationsTable } from "./conversations";

export const messagesTable = pgTable("messages", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").notNull().references(() => accountsTable.id, { onDelete: "cascade" }),
  folder: text("folder").notNull().default("inbox"),
  subject: text("subject").notNull(),
  fromName: text("from_name").notNull(),
  fromEmail: text("from_email").notNull(),
  toList: text("to_list").notNull(),
  ccList: text("cc_list"),
  bodyText: text("body_text"),
  bodyHtml: text("body_html"),
  isRead: boolean("is_read").notNull().default(false),
  isStarred: boolean("is_starred").notNull().default(false),
  hasAttachments: boolean("has_attachments").notNull().default(false),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertMessageSchema = createInsertSchema(messagesTable).omit({ id: true, createdAt: true });
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messagesTable.$inferSelect;

export const aiMessagesTable = pgTable("ai_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id")
    .notNull()
    .references(() => aiConversationsTable.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertAiMessageSchema = createInsertSchema(aiMessagesTable).omit({
  id: true,
  createdAt: true,
});

export type AiMessage = typeof aiMessagesTable.$inferSelect;
export type InsertAiMessage = z.infer<typeof insertAiMessageSchema>;
