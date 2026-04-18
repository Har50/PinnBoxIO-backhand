import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import accountsRouter from "./accounts";
import messagesRouter from "./messages";
import contactsRouter from "./contacts";
import searchRouter from "./search";
import statsRouter from "./stats";
import stripeRouter from "./stripe";
import aiRouter from "./ai";
import whatsappRouter from "./whatsapp";
import { linkedinPublicRouter, linkedinRouter } from "./linkedin";
import storageRouter from "./storage";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(linkedinPublicRouter);

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

router.use(requireAuth);
router.use(accountsRouter);
router.use(messagesRouter);
router.use(contactsRouter);
router.use(searchRouter);
router.use(statsRouter);
router.use(stripeRouter);
router.use(aiRouter);
router.use(whatsappRouter);
router.use(linkedinRouter);
router.use(storageRouter);

export default router;
