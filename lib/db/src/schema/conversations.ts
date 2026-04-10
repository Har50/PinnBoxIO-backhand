import { pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const aiConversationsTable = pgTable("ai_conversations", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertAiConversationSchema = createInsertSchema(aiConversationsTable).omit({
  id: true,
  createdAt: true,
});

export type AiConversation = typeof aiConversationsTable.$inferSelect;
export type InsertAiConversation = z.infer<typeof insertAiConversationSchema>;
