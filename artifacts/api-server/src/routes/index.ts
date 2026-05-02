import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { getAuth, clerkClient } from "@clerk/express";
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
import mobileAuthRouter, { getMobileSessionUser } from "./mobile-auth";
import preferencesRouter from "./preferences";
import { ensureUser } from "../services/tokenManager";

const router: IRouter = Router();

// In-memory set of user IDs already upserted this server session — avoids a
// DB round-trip on every request while still guaranteeing new users get a row.
const seenUsers = new Set<string>();

router.use(healthRouter);
router.use(linkedinPublicRouter);
router.use(storagePublicRouter);
router.use(authOAuthRouter);
router.use(mobileAuthRouter);

function requireAuth(req: Request, res: Response, next: NextFunction) {
  // First try Clerk (web app)
  const auth = getAuth(req);
  const clerkUserId = auth?.userId;

  if (clerkUserId) {
    (req as any).userId = clerkUserId;
    if (!seenUsers.has(clerkUserId)) {
      seenUsers.add(clerkUserId);
      // Fetch the user's primary email from Clerk and store it so that when
      // the same user signs in on mobile (Replit OIDC), resolveCanonicalUserId
      // can match them by email and share the same storage/data across platforms.
      clerkClient.users.getUser(clerkUserId)
        .then((clerkUser) => {
          const email = clerkUser.emailAddresses?.[0]?.emailAddress ?? null;
          return ensureUser(clerkUserId, { email });
        })
        .catch(() => ensureUser(clerkUserId));
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

  getMobileSessionUser(bearerToken).then((userId) => {
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    (req as any).userId = userId;
    if (!seenUsers.has(userId)) {
      seenUsers.add(userId);
      ensureUser(userId).catch(() => {});
    }
    next();
  }).catch(() => {
    res.status(401).json({ error: "Unauthorized" });
  });
}

router.use(requireAuth);
router.use(accountsRouter);
router.use(messagesRouter);
router.use(contactsRouter);
router.use(searchRouter);
router.use(statsRouter);
router.use(aiRouter);
router.use(linkedinRouter);
router.use(storageRouter);
router.use(preferencesRouter);

export default router;
