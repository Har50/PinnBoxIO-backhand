import { pgTable, text, serial, timestamp, boolean, varchar, jsonb } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";

export const autoRepliesTable = pgTable("auto_replies", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  isEnabled: boolean("is_enabled").notNull().default(false),
  subject: text("subject").notNull().default("Re: {{subject}}"),
  body: text("body").notNull().default("Thanks for your message. I'm currently away and will get back to you soon."),
  startDate: timestamp("start_date", { withTimezone: true }),
  endDate: timestamp("end_date", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type AutoReply = typeof autoRepliesTable.$inferSelect;

export const emailWorkflowsTable = pgTable("email_workflows", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  isEnabled: boolean("is_enabled").notNull().default(true),
  triggerType: text("trigger_type").notNull(),
  triggerValue: text("trigger_value"),
  actionType: text("action_type").notNull(),
  actionValue: text("action_value"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type EmailWorkflow = typeof emailWorkflowsTable.$inferSelect;
