import { boolean, integer, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";

export const subscriptionsTable = pgTable("subscriptions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  plan: varchar("plan", { length: 16 }).notNull().default("free"),
  billingCycle: varchar("billing_cycle", { length: 16 }),
  currency: varchar("currency", { length: 8 }),
  status: varchar("status", { length: 16 }).notNull().default("active"),
  razorpayOrderId: varchar("razorpay_order_id"),
  razorpayPaymentId: varchar("razorpay_payment_id"),
  razorpaySubscriptionId: varchar("razorpay_subscription_id"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type Subscription = typeof subscriptionsTable.$inferSelect;
export type InsertSubscription = typeof subscriptionsTable.$inferInsert;
