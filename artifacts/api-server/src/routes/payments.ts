import { Router, type IRouter } from "express";
import { createHmac } from "crypto";
import { db, usersTable } from "@workspace/db";
import { storageQuotasTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const FREE_QUOTA_BYTES = 2 * 1024 * 1024 * 1024;

const STORAGE_PLANS = [
  { gb: 10, label: "10 GB", priceInr: 29900 },
  { gb: 50, label: "50 GB", priceInr: 69900 },
  { gb: 100, label: "100 GB", priceInr: 99900 },
];

const PRO_PLAN_PRICE_INR = 79900;

function getRazorpay() {
  const Razorpay = require("razorpay");
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

function verifySignature(orderId: string, paymentId: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;
  const expected = createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return expected === signature;
}

async function getOrCreateQuota(userId: string) {
  const [existing] = await db
    .select()
    .from(storageQuotasTable)
    .where(eq(storageQuotasTable.userId, userId));
  if (existing) return existing;
  const [created] = await db
    .insert(storageQuotasTable)
    .values({ userId, totalBytes: FREE_QUOTA_BYTES, usedBytes: 0, planName: "Free" })
    .returning();
  return created;
}

router.get("/payments/razorpay/config", (_req, res) => {
  res.json({ keyId: process.env.RAZORPAY_KEY_ID });
});

router.post("/payments/razorpay/storage/order", async (req: any, res) => {
  try {
    const { gb } = req.body;
    const plan = STORAGE_PLANS.find((p) => p.gb === gb);
    if (!plan) return res.status(400).json({ error: "Invalid storage plan" });

    const rzp = getRazorpay();
    const order = await rzp.orders.create({
      amount: plan.priceInr,
      currency: "INR",
      receipt: `stor_${gb}gb_${Date.now().toString().slice(-10)}`,
    });

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err: any) {
    logger.error({ err }, "Razorpay storage order creation failed");
    res.status(500).json({ error: err.message });
  }
});

router.post("/payments/razorpay/storage/verify", async (req: any, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, gb } = req.body;

    if (!verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
      return res.status(400).json({ error: "Payment verification failed" });
    }

    const plan = STORAGE_PLANS.find((p) => p.gb === gb);
    if (!plan) return res.status(400).json({ error: "Invalid storage plan" });

    const totalBytes = plan.gb * 1024 * 1024 * 1024;
    const existing = await getOrCreateQuota(req.userId);

    const [updated] = await db
      .update(storageQuotasTable)
      .set({
        totalBytes: Math.max(existing.totalBytes, totalBytes),
        planName: plan.label,
      })
      .where(eq(storageQuotasTable.userId, req.userId))
      .returning();

    res.json({ quota: updated });
  } catch (err: any) {
    logger.error({ err }, "Razorpay storage verify failed");
    res.status(500).json({ error: err.message });
  }
});

router.post("/payments/razorpay/pro/order", async (req: any, res) => {
  try {
    const rzp = getRazorpay();
    const order = await rzp.orders.create({
      amount: PRO_PLAN_PRICE_INR,
      currency: "INR",
      receipt: `pro_${Date.now().toString().slice(-10)}`,
    });

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err: any) {
    logger.error({ err }, "Razorpay Pro order creation failed");
    res.status(500).json({ error: err.message });
  }
});

router.post("/payments/razorpay/pro/verify", async (req: any, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
      return res.status(400).json({ error: "Payment verification failed" });
    }

    await db.update(usersTable).set({ isPro: true }).where(eq(usersTable.id, req.userId));

    res.json({ success: true });
  } catch (err: any) {
    logger.error({ err }, "Razorpay Pro verify failed");
    res.status(500).json({ error: err.message });
  }
});

export default router;
