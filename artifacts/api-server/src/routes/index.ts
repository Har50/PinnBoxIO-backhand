import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import { eq, and, ne } from "drizzle-orm";
import { db, usersTable, mobileSessionsTable } from "@workspace/db";
import healthRouter from "./health";
import accountsRouter from "./accounts";
import messagesRouter from "./messages";
import contactsRouter from "./contacts";
import searchRouter from "./search";
import statsRouter from "./stats";
import aiRouter from "./ai";
import { linkedinPublicRouter, linkedinRouter } from "./linkedin";
import storageRouter, { storagePublicRouter } from "./storage";
import authOAuthRouter from "./auth-oauth";
import authImapRouter from "./auth-imap";
import mobileAuthRouter, { getMobileSessionUser } from "./mobile-auth";
import preferencesRouter from "./preferences";
import calendarRouter from "./calendar";
import paymentsRouter from "./payments";
import { ensureUser } from "../services/tokenManager";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// In-memory set of user IDs whose email has been successfully synced this
// server session. Only added once email is confirmed stored, so that a
// transient Clerk API failure doesn't permanently prevent mobile↔web linking.
const seenUsers = new Set<string>();

// Tracks Replit user IDs already checked for Clerk counterparts this session.
// Prevents repeated DB lookups on every request.
const checkedReplicUsers = new Set<string>();

router.use(healthRouter);
router.use(linkedinPublicRouter);
router.use(storagePublicRouter);
router.use(authOAuthRouter);
router.use(mobileAuthRouter);

/**
 * After storing a Clerk user's email, find any Replit-OIDC users that share
 * the same email and migrate their mobile sessions to the Clerk user ID.
 * This ensures existing mobile sessions immediately resolve to the correct
 * (Clerk) user without requiring the user to sign out and back in.
 */
async function migrateLinkedMobileSessions(clerkUserId: string, email: string): Promise<void> {
  try {
    const linkedUsers = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(and(eq(usersTable.email, email), ne(usersTable.id, clerkUserId)));

    for (const { id: replitUserId } of linkedUsers) {
      const updated = await db
        .update(mobileSessionsTable)
        .set({ userId: clerkUserId })
        .where(eq(mobileSessionsTable.userId, replitUserId))
        .returning({ id: mobileSessionsTable.id });

      if (updated.length > 0) {
        logger.info(
          { replitUserId, clerkUserId, migratedSessions: updated.length },
          "Migrated mobile sessions to canonical Clerk user ID"
        );
        checkedReplicUsers.delete(replitUserId);
      }
    }
  } catch (err) {
    logger.warn({ err, clerkUserId }, "Failed to migrate mobile sessions after email sync");
  }
}

/**
 * For mobile (Replit OIDC) users: check if a Clerk account shares the same
 * email. If so, migrate the mobile session to the Clerk user ID so data is
 * shared across platforms — even for sessions that were created before the
 * Clerk user's email was stored in our database.
 *
 * Returns the canonical user ID (Clerk ID if linked, Replit sub otherwise).
 */
async function resolveAndMigrateMobileSession(
  bearerToken: string,
  replitUserId: string
): Promise<string> {
  try {
    const [user] = await db
      .select({ id: usersTable.id, email: usersTable.email })
      .from(usersTable)
      .where(eq(usersTable.id, replitUserId));

    if (!user?.email) return replitUserId;

    const [clerkUser] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(and(eq(usersTable.email, user.email), ne(usersTable.id, replitUserId)));

    if (!clerkUser) return replitUserId;

    logger.info(
      { replitUserId, clerkUserId: clerkUser.id },
      "Mobile session late-bind: migrating session to Clerk user ID"
    );

    await db
      .update(mobileSessionsTable)
      .set({ userId: clerkUser.id })
      .where(eq(mobileSessionsTable.token, bearerToken));

    return clerkUser.id;
  } catch (err) {
    logger.warn({ err, replitUserId }, "Mobile session late-bind failed, using Replit user ID");
    return replitUserId;
  }
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  // First try Clerk (web app)
  const auth = getAuth(req);
  const clerkUserId = auth?.userId;

  if (clerkUserId) {
    (req as any).userId = clerkUserId;
    if (!seenUsers.has(clerkUserId)) {
      // Fetch the user's primary email from Clerk and store it so that when
      // the same user signs in on mobile (Replit OIDC), resolveCanonicalUserId
      // can match them by email and share the same storage/data across platforms.
      // Only mark as seen once the email is successfully stored.
      clerkClient.users.getUser(clerkUserId)
        .then(async (clerkUser) => {
          const email = clerkUser.emailAddresses?.[0]?.emailAddress ?? null;
          logger.info({ clerkUserId, email: email ?? "(none)" }, "Clerk email sync: fetched user");
          await ensureUser(clerkUserId, { email });
          if (email) {
            seenUsers.add(clerkUserId);
            await migrateLinkedMobileSessions(clerkUserId, email);
          }
        })
        .catch((err) => {
          logger.warn({ err: String(err), clerkUserId }, "Clerk email sync failed — will retry on next request");
          ensureUser(clerkUserId).catch(() => {});
        });
    }
    next();
    return;
  }

  // Fall back to mobile session token
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.replace(/^Bearer\s+/i, "");

  if (!bearerToken) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  getMobileSessionUser(bearerToken).then(async (userId) => {
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // If this Replit user hasn't been checked yet, see if there's a Clerk
    // account with the same email and migrate the session if so.
    let canonicalUserId = userId;
    if (!checkedReplicUsers.has(userId)) {
      checkedReplicUsers.add(userId);
      canonicalUserId = await resolveAndMigrateMobileSession(bearerToken, userId);
    }

    (req as any).userId = canonicalUserId;
    if (!seenUsers.has(canonicalUserId)) {
      seenUsers.add(canonicalUserId);
      ensureUser(canonicalUserId).catch(() => {});
    }
    next();
  }).catch(() => {
    res.status(401).json({ error: "Unauthorized" });
  });
}

router.use(requireAuth);
router.use(authImapRouter);
router.use(accountsRouter);
router.use(messagesRouter);
router.use(contactsRouter);
router.use(searchRouter);
router.use(statsRouter);
router.use(aiRouter);
router.use(linkedinRouter);
router.use(storageRouter);
router.use(paymentsRouter);
router.use(preferencesRouter);
router.use(calendarRouter);

export default router;
