import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";

export const scheduledSendsTable = pgTable("scheduled_sends", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  to: text("to").notNull(),
  cc: text("cc"),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  provider: text("provider").notNull().default("gmail"),
  accountId: integer("account_id"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
