import { boolean, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";

export const userPreferencesTable = pgTable("user_preferences", {
  userId: varchar("user_id")
    .primaryKey()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  emailSummary: boolean("email_summary").notNull().default(true),
  importantMessages: boolean("important_messages").notNull().default(true),
  weeklyDigest: boolean("weekly_digest").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type UserPreferences = typeof userPreferencesTable.$inferSelect;
export type UpsertUserPreferences = typeof userPreferencesTable.$inferInsert;
