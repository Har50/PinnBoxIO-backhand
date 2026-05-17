import { pgTable, serial, varchar, timestamp } from "drizzle-orm/pg-core";

export const waitlistTable = pgTable("waitlist", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type WaitlistEntry = typeof waitlistTable.$inferSelect;
