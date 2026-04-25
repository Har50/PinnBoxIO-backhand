import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { getAuth } from "@clerk/express";
import healthRouter from "./health";
import accountsRouter from "./accounts";
import messagesRouter from "./messages";
import contactsRouter from "./contacts";
import searchRouter from "./search";
import statsRouter from "./stats";
import aiRouter from "./ai";
import whatsappRouter from "./whatsapp";
import { linkedinPublicRouter, linkedinRouter } from "./linkedin";
import storageRouter from "./storage";
import authOAuthRouter from "./auth-oauth";
import { ensureUser } from "../services/tokenManager";

const router: IRouter = Router();

// In-memory set of user IDs already upserted this server session — avoids a
// DB round-trip on every request while still guaranteeing new users get a row.
const seenUsers = new Set<string>();

router.use(healthRouter);
router.use(linkedinPublicRouter);
router.use(authOAuthRouter);
// WhatsApp is a shared single-instance connection — status/events are server-wide
router.use(whatsappRouter);

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  (req as any).userId = userId;

  // Lazily create the user row on first request — fire-and-forget, does not
  // block the request and is a no-op (ON CONFLICT DO NOTHING) for known users.
  if (!seenUsers.has(userId)) {
    seenUsers.add(userId);
    ensureUser(userId).catch(() => {});
  }

  next();
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

export default router;
