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

const router: IRouter = Router();

router.use(healthRouter);
router.use(linkedinPublicRouter);
router.use(authOAuthRouter);

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  (req as any).userId = userId;
  next();
}

router.use(requireAuth);
router.use(accountsRouter);
router.use(messagesRouter);
router.use(contactsRouter);
router.use(searchRouter);
router.use(statsRouter);
router.use(aiRouter);
router.use(whatsappRouter);
router.use(linkedinRouter);
router.use(storageRouter);

export default router;
