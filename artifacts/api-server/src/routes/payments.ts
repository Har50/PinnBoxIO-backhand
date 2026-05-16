import { Router, type IRouter } from "express";
import { createHmac } from "crypto";
import { db, usersTable } from "@workspace/db";
import { storageQuotasTable, subscriptionsTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { logger } from "../lib/logger";

const FREE_QUOTA_BYTES = 1 * 1024 * 1024 * 1024;
const PRO_QUOTA_BYTES = 25 * 1024 * 1024 * 1024;
const FREE_AI_REQUESTS_PER_DAY = 20;

const STORAGE_PLANS = [
  { gb: 10, label: "10 GB", priceInr: 29900 },
  { gb: 50, label: "50 GB", priceInr: 69900 },
  { gb: 100, label: "100 GB", priceInr: 99900 },
];

const PRO_PLANS = {
  monthly: { usd: 799, inr: 49900, label: "Pro Monthly" },
  annual: { usd: 5999, inr: 399900, label: "Pro Annual" },
};

const pendingOrders = new Map<string, { userId: string; billingCycle: string; currency: string; expiresAt: number }>();

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

export const paymentsPublicRouter: IRouter = Router();

paymentsPublicRouter.get("/payments/razorpay/checkout", (req, res) => {
  const { orderId, amount, currency, keyId, description } = req.query as Record<string, string>;
  if (!orderId || !amount || !currency || !keyId) {
    return res.status(400).send("<p>Invalid checkout parameters.</p>");
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PinnboxIO Pro — Checkout</title>
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #0f0f14; color: #e2e8f0; min-height: 100vh;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 24px; text-align: center;
    }
    .logo { width: 56px; height: 56px; border-radius: 16px; background: #6366f1; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 28px; }
    h1 { font-size: 22px; font-weight: 700; margin-bottom: 8px; }
    p { color: #94a3b8; font-size: 14px; line-height: 1.6; max-width: 300px; }
    .spinner { width: 36px; height: 36px; border: 3px solid #6366f130; border-top-color: #6366f1; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 20px auto 0; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .icon { font-size: 48px; margin-bottom: 12px; }
    .btn { margin-top: 20px; padding: 12px 28px; background: #6366f1; color: #fff; border: none; border-radius: 12px; font-size: 15px; font-weight: 600; cursor: pointer; }
    #state-loading, #state-success, #state-error, #state-cancelled { display: none; flex-direction: column; align-items: center; }
    #state-loading { display: flex; }
  </style>
</head>
<body>
  <div id="state-loading">
    <div class="logo">★</div>
    <h1>PinnboxIO Pro</h1>
    <p>Opening secure payment gateway…</p>
    <div class="spinner"></div>
  </div>
  <div id="state-success">
    <div class="icon">🎉</div>
    <h1>You're now Pro!</h1>
    <p>Your subscription is active. Close this window to continue using PinnboxIO.</p>
  </div>
  <div id="state-error">
    <div class="icon">⚠️</div>
    <h1>Payment Failed</h1>
    <p id="error-msg">Something went wrong. Please try again.</p>
    <button class="btn" onclick="window.location.reload()">Try Again</button>
  </div>
  <div id="state-cancelled">
    <div class="icon">✕</div>
    <h1>Payment Cancelled</h1>
    <p>No charge was made. You can close this window.</p>
  </div>
  <script>
    function show(id) {
      ["state-loading","state-success","state-error","state-cancelled"].forEach(function(s) {
        document.getElementById(s).style.display = s === id ? "flex" : "none";
      });
    }
    show("state-loading");
    var options = {
      key: ${JSON.stringify(keyId)},
      amount: ${JSON.stringify(String(amount))},
      currency: ${JSON.stringify(currency)},
      name: "PinnboxIO",
      description: ${JSON.stringify(description ?? "Pro Subscription")},
      order_id: ${JSON.stringify(orderId)},
      theme: { color: "#6366f1" },
      handler: async function(response) {
        try {
          var res = await fetch("/api/payments/razorpay/pro/verify-anon", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            })
          });
          if (res.ok) {
            show("state-success");
          } else {
            var data = await res.json().catch(function() { return {}; });
            document.getElementById("error-msg").textContent = data.error || "Verification failed. Please contact support.";
            show("state-error");
          }
        } catch(e) {
          document.getElementById("error-msg").textContent = "Network error. Please try again.";
          show("state-error");
        }
      },
      modal: { ondismiss: function() { show("state-cancelled"); } }
    };
    var rzp = new Razorpay(options);
    rzp.open();
  </script>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html");
  res.send(html);
});

paymentsPublicRouter.post("/payments/razorpay/pro/verify-anon", async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
      return res.status(400).json({ error: "Payment verification failed" });
    }

    const pending = pendingOrders.get(razorpay_order_id);
    if (!pending || pending.expiresAt < Date.now()) {
      return res.status(400).json({ error: "Order session not found or expired. Please contact support." });
    }

    const { userId, billingCycle, currency } = pending;
    pendingOrders.delete(razorpay_order_id);

    const now = new Date();
    const expiresAt = new Date(now);
    if (billingCycle === "annual") {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    } else {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    }

    await db.update(usersTable).set({ isPro: true }).where(eq(usersTable.id, userId));

    await db.insert(subscriptionsTable).values({
      userId,
      plan: "pro",
      billingCycle,
      currency,
      status: "active",
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      expiresAt,
    } as any);

    await db
      .update(storageQuotasTable)
      .set({ totalBytes: PRO_QUOTA_BYTES, planName: "Pro" })
      .where(eq(storageQuotasTable.userId, userId));

    res.json({ success: true });
  } catch (err: any) {
    logger.error({ err }, "Razorpay pro verify-anon failed");
    res.status(500).json({ error: err.message });
  }
});

const router: IRouter = Router();

router.get("/payments/razorpay/config", (_req, res) => {
  res.json({ keyId: process.env.RAZORPAY_KEY_ID });
});

router.get("/subscription/status", async (req: any, res) => {
  try {
    const [user] = await db
      .select({ isPro: usersTable.isPro })
      .from(usersTable)
      .where(eq(usersTable.id, req.userId));

    const quota = await getOrCreateQuota(req.userId);

    const [latestSub] = await db
      .select()
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.userId, req.userId))
      .orderBy(desc(subscriptionsTable.createdAt))
      .limit(1);

    const isPro = user?.isPro ?? false;

    res.json({
      plan: isPro ? "pro" : "free",
      billingCycle: latestSub?.billingCycle ?? null,
      currency: latestSub?.currency ?? null,
      expiresAt: latestSub?.expiresAt ?? null,
      queriesLimit: isPro ? null : FREE_AI_REQUESTS_PER_DAY,
      storageUsedBytes: quota.usedBytes,
      storageTotalBytes: quota.totalBytes,
    });
  } catch (err: any) {
    logger.error({ err }, "subscription status failed");
    res.status(500).json({ error: err.message });
  }
});

router.post("/subscription/cancel", async (req: any, res) => {
  try {
    await db.update(usersTable).set({ isPro: false }).where(eq(usersTable.id, req.userId));
    await db
      .update(subscriptionsTable)
      .set({ status: "cancelled", cancelledAt: new Date() })
      .where(eq(subscriptionsTable.userId, req.userId));
    await db
      .update(storageQuotasTable)
      .set({ totalBytes: FREE_QUOTA_BYTES, planName: "Free" })
      .where(eq(storageQuotasTable.userId, req.userId));
    res.json({ success: true });
  } catch (err: any) {
    logger.error({ err }, "subscription cancel failed");
    res.status(500).json({ error: err.message });
  }
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
    const billingCycle: string = req.body.billingCycle === "annual" ? "annual" : "monthly";
    const currency: string = req.body.currency === "usd" ? "usd" : "inr";

    const prices = PRO_PLANS[billingCycle as "monthly" | "annual"];
    const amount = currency === "usd" ? prices.usd : prices.inr;
    const rzpCurrency = currency === "usd" ? "USD" : "INR";

    const rzp = getRazorpay();
    const order = await rzp.orders.create({
      amount,
      currency: rzpCurrency,
      receipt: `pro_${billingCycle}_${Date.now().toString().slice(-10)}`,
    });

    pendingOrders.set(order.id, {
      userId: req.userId,
      billingCycle,
      currency,
      expiresAt: Date.now() + 30 * 60 * 1000,
    });

    const proto = (req.headers["x-forwarded-proto"] as string) ?? "https";
    const host = req.headers.host ?? "";
    const baseUrl = `${proto}://${host}`;
    const qs = new URLSearchParams({
      orderId: order.id,
      amount: String(order.amount),
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID ?? "",
      description: prices.label,
    }).toString();

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      checkoutUrl: `${baseUrl}/api/payments/razorpay/checkout?${qs}`,
    });
  } catch (err: any) {
    logger.error({ err }, "Razorpay Pro order creation failed");
    res.status(500).json({ error: err.message });
  }
});

router.post("/payments/razorpay/pro/verify", async (req: any, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, billingCycle, currency } = req.body;

    if (!verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
      return res.status(400).json({ error: "Payment verification failed" });
    }

    const cycle = billingCycle === "annual" ? "annual" : "monthly";
    const curr = currency === "usd" ? "usd" : "inr";

    const now = new Date();
    const expiresAt = new Date(now);
    if (cycle === "annual") {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    } else {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    }

    await db.update(usersTable).set({ isPro: true }).where(eq(usersTable.id, req.userId));

    await db.insert(subscriptionsTable).values({
      userId: req.userId,
      plan: "pro",
      billingCycle: cycle,
      currency: curr,
      status: "active",
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      expiresAt,
    } as any);

    await db
      .update(storageQuotasTable)
      .set({ totalBytes: PRO_QUOTA_BYTES, planName: "Pro" })
      .where(eq(storageQuotasTable.userId, req.userId));

    res.json({ success: true });
  } catch (err: any) {
    logger.error({ err }, "Razorpay Pro verify failed");
    res.status(500).json({ error: err.message });
  }
});

router.post("/payments/razorpay/webhook", async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (secret) {
      const signature = req.headers["x-razorpay-signature"] as string;
      const body = JSON.stringify(req.body);
      const expected = createHmac("sha256", secret).update(body).digest("hex");
      if (signature !== expected) {
        return res.status(400).json({ error: "Invalid webhook signature" });
      }
    }

    const event = req.body?.event as string;
    logger.info({ event }, "Razorpay webhook received");

    if (event === "subscription.cancelled" || event === "subscription.expired") {
      const subscriptionId = req.body?.payload?.subscription?.entity?.id as string;
      if (subscriptionId) {
        const [sub] = await db
          .select({ userId: subscriptionsTable.userId })
          .from(subscriptionsTable)
          .where(eq(subscriptionsTable.razorpayOrderId, subscriptionId))
          .limit(1);
        if (sub) {
          await db.update(usersTable).set({ isPro: false }).where(eq(usersTable.id, sub.userId));
          await db
            .update(subscriptionsTable)
            .set({ status: "cancelled", cancelledAt: new Date() })
            .where(eq(subscriptionsTable.userId, sub.userId));
        }
      }
    }

    res.json({ acknowledged: true });
  } catch (err: any) {
    logger.error({ err }, "Razorpay webhook failed");
    res.status(500).json({ error: err.message });
  }
});

export default router;
