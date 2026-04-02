import { Router, type IRouter } from "express";
import healthRouter from "./health";
import accountsRouter from "./accounts";
import messagesRouter from "./messages";
import contactsRouter from "./contacts";
import searchRouter from "./search";
import statsRouter from "./stats";

const router: IRouter = Router();

router.use(healthRouter);
router.use(accountsRouter);
router.use(messagesRouter);
router.use(contactsRouter);
router.use(searchRouter);
router.use(statsRouter);

export default router;
