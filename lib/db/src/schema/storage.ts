import { sql } from "drizzle-orm";
import { bigint, boolean, index, integer, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";

export const storageQuotasTable = pgTable("storage_quotas", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  totalBytes: bigint("total_bytes", { mode: "number" }).notNull().default(2 * 1024 * 1024 * 1024),
  usedBytes: bigint("used_bytes", { mode: "number" }).notNull().default(0),
  planName: varchar("plan_name").notNull().default("Free"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const storageFilesTable = pgTable(
  "storage_files",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: varchar("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    name: varchar("name").notNull(),
    mimeType: varchar("mime_type").notNull().default("application/octet-stream"),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull().default(0),
    storageKey: varchar("storage_key").notNull(),
    folder: varchar("folder").notNull().default("/"),
    category: varchar("category"),
    isPublic: boolean("is_public").notNull().default(false),
    shareToken: varchar("share_token"),
    downloadCount: integer("download_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_storage_files_user").on(table.userId),
    index("idx_storage_files_folder").on(table.userId, table.folder),
  ],
);

export type StorageQuota = typeof storageQuotasTable.$inferSelect;
export type StorageFile = typeof storageFilesTable.$inferSelect;
export type InsertStorageFile = typeof storageFilesTable.$inferInsert;
