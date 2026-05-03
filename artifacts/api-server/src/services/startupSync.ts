import { clerkClient } from "@clerk/express";
import { and, eq, isNull, like, ne } from "drizzle-orm";
import { db, usersTable, mobileSessionsTable } from "@workspace/db";
import { logger } from "../lib/logger";

/**
 * On startup, find all Clerk users (IDs starting with "user_") that have no
 * email stored, fetch their email from the Clerk API, and persist it.
 *
 * Handles the case where a Replit OIDC user already claimed the same email:
 *   1. Migrate all mobile sessions from the Replit user → Clerk user
 *   2. Clear the email from the Replit user (un-claim it)
 *   3. Set the email on the Clerk user (now the canonical account)
 *
 * This runs at every server startup so any deployment automatically heals
 * broken mobile↔web account links.
 */
export async function syncClerkEmailsOnStartup(): Promise<void> {
  try {
    const clerkUsersWithoutEmail = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(and(like(usersTable.id, "user_%"), isNull(usersTable.email)));

    if (clerkUsersWithoutEmail.length === 0) {
      logger.info("Startup email sync: all Clerk users already have emails stored");
      return;
    }

    logger.info(
      { count: clerkUsersWithoutEmail.length },
      "Startup email sync: found Clerk users missing email — fetching from Clerk API"
    );

    for (const { id: clerkUserId } of clerkUsersWithoutEmail) {
      try {
        const clerkUser = await clerkClient.users.getUser(clerkUserId);
        const email = clerkUser.emailAddresses?.[0]?.emailAddress ?? null;

        if (!email) {
          logger.warn({ clerkUserId }, "Startup email sync: Clerk user has no email address");
          continue;
        }

        logger.info({ clerkUserId, email }, "Startup email sync: fetched Clerk email");

        // Find any Replit OIDC users that already hold this email address.
        // This happens when the user signed into mobile before the Clerk email
        // was recorded — the Replit user claimed the email first.
        const conflictingUsers = await db
          .select({ id: usersTable.id })
          .from(usersTable)
          .where(and(eq(usersTable.email, email), ne(usersTable.id, clerkUserId)));

        for (const { id: replitUserId } of conflictingUsers) {
          // 1. Migrate mobile sessions to the Clerk (canonical) user
          const migrated = await db
            .update(mobileSessionsTable)
            .set({ userId: clerkUserId })
            .where(eq(mobileSessionsTable.userId, replitUserId))
            .returning({ id: mobileSessionsTable.id });

          if (migrated.length > 0) {
            logger.info(
              { replitUserId, clerkUserId, migratedSessions: migrated.length },
              "Startup email sync: migrated mobile sessions to Clerk user"
            );
          }

          // 2. Clear the email from the Replit user so the Clerk user can claim it
          await db
            .update(usersTable)
            .set({ email: null })
            .where(eq(usersTable.id, replitUserId));

          logger.info(
            { replitUserId },
            "Startup email sync: cleared email from Replit user (Clerk user is now canonical)"
          );
        }

        // 3. Set the email on the Clerk user
        await db
          .update(usersTable)
          .set({ email })
          .where(eq(usersTable.id, clerkUserId));

        logger.info({ clerkUserId, email }, "Startup email sync: stored email on Clerk user");
      } catch (err) {
        logger.warn({ err: String(err), clerkUserId }, "Startup email sync: failed for user, skipping");
      }
    }

    logger.info("Startup email sync: complete");
  } catch (err) {
    logger.warn({ err: String(err) }, "Startup email sync: failed entirely, skipping");
  }
}
