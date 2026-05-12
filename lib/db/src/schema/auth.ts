import { sql } from "drizzle-orm";
import { boolean, index, integer, jsonb, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessionsTable = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const usersTable = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  isPro: boolean("is_pro").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type UpsertUser = typeof usersTable.$inferInsert;
export type User = typeof usersTable.$inferSelect;

export const userOAuthTokensTable = pgTable("user_oauth_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  provider: varchar("provider").notNull(),
  email: varchar("email"),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  scope: varchar("scope"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type UserOAuthToken = typeof userOAuthTokensTable.$inferSelect;

export const mobileSessionsTable = pgTable(
  "mobile_sessions",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    token: varchar("token", { length: 128 }).notNull().unique(),
    userId: varchar("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
  },
  (table) => [index("IDX_mobile_sessions_token").on(table.token)],
);

export type MobileSession = typeof mobileSessionsTable.$inferSelect;

export const mobilePkceSessionsTable = pgTable("mobile_pkce_sessions", {
  state: varchar("state", { length: 128 }).primaryKey(),
  codeVerifier: text("code_verifier").notNull(),
  nonce: varchar("nonce", { length: 128 }).notNull(),
  redirectUri: text("redirect_uri").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export type MobilePkceSession = typeof mobilePkceSessionsTable.$inferSelect;

export const mobileTokenResultsTable = pgTable("mobile_token_results", {
  state: varchar("state", { length: 128 }).primaryKey(),
  status: varchar("status", { length: 16 }).notNull(),
  token: text("token"),
  error: varchar("error", { length: 64 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export type MobileTokenResult = typeof mobileTokenResultsTable.$inferSelect;

export const imapCredentialsTable = pgTable("imap_credentials", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  email: varchar("email").notNull(),
  displayName: varchar("display_name"),
  host: varchar("host").notNull(),
  port: integer("port").notNull().default(993),
  secure: boolean("secure").notNull().default(true),
  username: varchar("username").notNull(),
  password: text("password").notNull(),
  color: varchar("color").notNull().default("#6366f1"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type ImapCredential = typeof imapCredentialsTable.$inferSelect;
