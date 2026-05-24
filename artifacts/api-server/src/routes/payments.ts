import { Router, type IRouter } from "express";
import { createHmac } from "crypto";
import { db, usersTable } from "@workspace/db";
import { storageQuotasTable, subscriptionsTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { logger } from "../lib/logger";

const FREE_QUOTA_BYTES = 1 * 1024 * 1024 * 1024;
const PRO_QUOTA_BYTES = 25 * 1024 * 1024 * 1024;
const FREE_AI_REQUESTS_PER_DAY = 20;

const PRO_PLANS = {
  monthly: { usd: 799, inr: 49900, label: "Pro Monthly" },
  annual: { usd: 5999, inr: 399900, label: "Pro Annual" },
};

// Startup validation: detect copy-paste mistakes between monthly/annual plan IDs.
(function validateRazorpayPlanIds() {
  const monthlyInr = process.env.RAZORPAY_PLAN_ID_MONTHLY_INR;
  const annualInr = process.env.RAZORPAY_PLAN_ID_ANNUAL_INR;
  const monthlyUsd = process.env.RAZORPAY_PLAN_ID_MONTHLY_USD;
  const annualUsd = process.env.RAZORPAY_PLAN_ID_ANNUAL_USD;
  if (monthlyInr && annualInr && monthlyInr === annualInr) {
    logger.warn(
      { monthlyInr, annualInr },
      "RAZORPAY_PLAN_ID_ANNUAL_INR is identical to RAZORPAY_PLAN_ID_MONTHLY_INR — annual checkout will charge the monthly price. Create a separate annual plan in Razorpay and update the secret.",
    );
  }
  if (monthlyUsd && annualUsd && monthlyUsd === annualUsd) {
    logger.warn(
      { monthlyUsd, annualUsd },
      "RAZORPAY_PLAN_ID_ANNUAL_USD is identical to RAZORPAY_PLAN_ID_MONTHLY_USD — annual checkout will charge the monthly price.",
    );
  }
})();

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

function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return true;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
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

async function getLatestSubscription(userId: string) {
  const [sub] = await db
    .select()
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.userId, userId))
    .orderBy(desc(subscriptionsTable.createdAt))
    .limit(1);
  return sub ?? null;
}

async function handleWebhookEvent(event: string, body: any): Promise<void> {
  const subscriptionEntity = body?.payload?.subscription?.entity;
  const paymentEntity = body?.payload?.payment?.entity;
  const rzpSubscriptionId: string | undefined =
    subscriptionEntity?.id ?? paymentEntity?.subscription_id;

  if (!rzpSubscriptionId) {
    logger.warn({ event }, "Webhook missing subscription ID, skipping");
    return;
  }

  const [sub] = await db
    .select()
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.razorpaySubscriptionId, rzpSubscriptionId))
    .limit(1);

  if (!sub) {
    logger.warn({ event, rzpSubscriptionId }, "Webhook: no matching subscription found");
    return;
  }

  const userId = sub.userId;

  if (event === "subscription.activated") {
    const currentEnd: number | undefined = subscriptionEntity?.current_end;
    const renewsAt = currentEnd ? new Date(currentEnd * 1000) : null;
    await db.update(usersTable).set({ isPro: true }).where(eq(usersTable.id, userId));
    await db
      .update(subscriptionsTable)
      .set({ plan: "pro", status: "active", expiresAt: renewsAt, cancelAtPeriodEnd: false })
      .where(eq(subscriptionsTable.id, sub.id));
    await db
      .update(storageQuotasTable)
      .set({ totalBytes: PRO_QUOTA_BYTES, planName: "Pro" })
      .where(eq(storageQuotasTable.userId, userId));
    logger.info({ userId, rzpSubscriptionId }, "Subscription activated → pro");

  } else if (event === "subscription.charged") {
    const currentEnd: number | undefined = subscriptionEntity?.current_end ?? paymentEntity?.subscription_id ? undefined : undefined;
    const chargedEnd: number | undefined = subscriptionEntity?.current_end;
    const renewsAt = chargedEnd ? new Date(chargedEnd * 1000) : null;
    await db
      .update(subscriptionsTable)
      .set({ expiresAt: renewsAt, status: "active", cancelAtPeriodEnd: false })
      .where(eq(subscriptionsTable.id, sub.id));
    logger.info({ userId, renewsAt }, "Subscription charged → renewsAt updated");

  } else if (event === "subscription.cancelled") {
    await db
      .update(subscriptionsTable)
      .set({ cancelAtPeriodEnd: true })
      .where(eq(subscriptionsTable.id, sub.id));
    logger.info({ userId }, "Subscription cancelled → cancelAtPeriodEnd=true");

  } else if (event === "subscription.completed" || event === "subscription.expired" || event === "subscription.halted") {
    await db.update(usersTable).set({ isPro: false }).where(eq(usersTable.id, userId));
    await db
      .update(subscriptionsTable)
      .set({ plan: "free", status: "cancelled", cancelledAt: new Date(), cancelAtPeriodEnd: false, expiresAt: null, razorpaySubscriptionId: null })
      .where(eq(subscriptionsTable.id, sub.id));
    await db
      .update(storageQuotasTable)
      .set({ totalBytes: FREE_QUOTA_BYTES, planName: "Free" })
      .where(eq(storageQuotasTable.userId, userId));
    logger.info({ userId, event }, "Subscription ended → downgraded to free");
  }
}

// ─── Public routes (no auth) ─────────────────────────────────────────────────

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

// Webhook — public, no auth, signature verified internally
paymentsPublicRouter.post("/subscription/webhook", async (req, res) => {
  try {
    const signature = req.headers["x-razorpay-signature"] as string;
    const rawBody = JSON.stringify(req.body);

    if (!verifyWebhookSignature(rawBody, signature)) {
      return res.status(400).json({ error: "Invalid webhook signature" });
    }

    const event = req.body?.event as string;
    logger.info({ event }, "Razorpay subscription webhook received");

    await handleWebhookEvent(event, req.body);

    res.json({ acknowledged: true });
  } catch (err: any) {
    logger.error({ err }, "Razorpay subscription webhook failed");
    res.status(500).json({ error: err.message });
  }
});

// ─── Authenticated routes ─────────────────────────────────────────────────────

const router: IRouter = Router();

router.get("/payments/razorpay/config", (_req, res) => {
  res.json({ keyId: process.env.RAZORPAY_KEY_ID });
});

// GET /api/subscription/status
router.get("/subscription/status", async (req: any, res) => {
  try {
    const [user] = await db
      .select({ isPro: usersTable.isPro })
      .from(usersTable)
      .where(eq(usersTable.id, req.userId));

    const quota = await getOrCreateQuota(req.userId);
    const latestSub = await getLatestSubscription(req.userId);

    const isPro = user?.isPro ?? false;

    res.json({
      plan: isPro ? "pro" : "free",
      renewsAt: latestSub?.expiresAt ?? null,
      cancelAtPeriodEnd: latestSub?.cancelAtPeriodEnd ?? false,
      billingCycle: latestSub?.billingCycle ?? null,
      currency: latestSub?.currency ?? null,
      queriesLimit: isPro ? null : FREE_AI_REQUESTS_PER_DAY,
      storageUsedBytes: quota.usedBytes,
      storageTotalBytes: quota.totalBytes,
    });
  } catch (err: any) {
    logger.error({ err }, "subscription status failed");
    res.status(500).json({ error: err.message });
  }
});

// POST /api/subscription/create-order  — creates a Razorpay Subscription (hosted checkout)
router.post("/subscription/create-order", async (req: any, res) => {
  try {
    const { planKey, currency: reqCurrency } = req.body as { planKey?: string; currency?: string };

    const isAnnual = planKey === "pro_annual";
    const billingCycle = isAnnual ? "annual" : "monthly";
    const currency = reqCurrency === "usd" ? "usd" : "inr";

    let planId: string | undefined;
    if (currency === "inr") {
      planId = isAnnual
        ? process.env.RAZORPAY_PLAN_ID_ANNUAL_INR
        : process.env.RAZORPAY_PLAN_ID_MONTHLY_INR;
    } else {
      planId = isAnnual
        ? process.env.RAZORPAY_PLAN_ID_ANNUAL_USD
        : process.env.RAZORPAY_PLAN_ID_MONTHLY_USD;
    }

    if (!planId) {
      return res.status(500).json({
        error: "Subscription plan not configured. Please contact support.",
      });
    }

    // Guard against the annual plan ID being set to the monthly plan ID (or vice-versa).
    const oppositePlanId = currency === "inr"
      ? (isAnnual ? process.env.RAZORPAY_PLAN_ID_MONTHLY_INR : process.env.RAZORPAY_PLAN_ID_ANNUAL_INR)
      : (isAnnual ? process.env.RAZORPAY_PLAN_ID_MONTHLY_USD : process.env.RAZORPAY_PLAN_ID_ANNUAL_USD);
    if (oppositePlanId && oppositePlanId === planId) {
      logger.error(
        { planKey, planId, currency },
        "Annual and monthly plan IDs are identical — refusing to create order to avoid charging the wrong amount.",
      );
      return res.status(500).json({
        error: "Subscription plan misconfigured. Please contact support.",
      });
    }

    const rzp = getRazorpay();

    logger.info(
      { planKey, currency, planIdLength: planId.length, planIdPrefix: planId.slice(0, 8) },
      "subscription create-order: using plan",
    );

    const subscription = await rzp.subscriptions.create({
      plan_id: planId,
      total_count: isAnnual ? 12 : 120,
      quantity: 1,
      notes: {
        userId: req.userId,
        billingCycle,
        currency,
      },
    });

    // Store a pending subscription record so the webhook can match it
    await db.insert(subscriptionsTable).values({
      userId: req.userId,
      plan: "free",
      billingCycle,
      currency,
      status: "created",
      razorpaySubscriptionId: subscription.id,
    } as any);

    const checkoutUrl: string = subscription.short_url;

    res.json({ checkoutUrl, subscriptionId: subscription.id });
  } catch (err: any) {
    logger.error({ err }, "subscription create-order failed");
    res.status(500).json({ error: err.message });
  }
});

// POST /api/subscription/restore  — check Razorpay for active subscriptions by user email
router.post("/subscription/restore", async (req: any, res) => {
  try {
    const [user] = await db
      .select({ email: usersTable.email, isPro: usersTable.isPro })
      .from(usersTable)
      .where(eq(usersTable.id, req.userId));

    if (!user?.email) {
      return res.json({ plan: "free" });
    }

    const rzp = getRazorpay();

    const response = await rzp.subscriptions.all({ count: 20 });
    const subscriptions: any[] = response?.items ?? [];

    const active = subscriptions.find(
      (s: any) =>
        (s.status === "active" || s.status === "authenticated") &&
        (s.notes?.userId === req.userId || s.customer_id != null)
    );

    if (!active) {
      return res.json({ plan: user.isPro ? "pro" : "free" });
    }

    const existingSub = await getLatestSubscription(req.userId);
    const renewsAt = active.current_end ? new Date(active.current_end * 1000) : null;

    await db.update(usersTable).set({ isPro: true }).where(eq(usersTable.id, req.userId));

    if (existingSub) {
      await db
        .update(subscriptionsTable)
        .set({
          plan: "pro",
          status: "active",
          razorpaySubscriptionId: active.id,
          expiresAt: renewsAt,
          cancelAtPeriodEnd: false,
        })
        .where(eq(subscriptionsTable.id, existingSub.id));
    } else {
      const cycle = active.plan_id?.includes("annual") ? "annual" : "monthly";
      await db.insert(subscriptionsTable).values({
        userId: req.userId,
        plan: "pro",
        billingCycle: cycle,
        currency: "inr",
        status: "active",
        razorpaySubscriptionId: active.id,
        expiresAt: renewsAt,
      } as any);
    }

    await db
      .update(storageQuotasTable)
      .set({ totalBytes: PRO_QUOTA_BYTES, planName: "Pro" })
      .where(eq(storageQuotasTable.userId, req.userId));

    res.json({ plan: "pro", renewsAt });
  } catch (err: any) {
    logger.error({ err }, "subscription restore failed");
    res.status(500).json({ error: err.message });
  }
});

// GET /api/subscription/portal  — redirect to subscription management
router.get("/subscription/portal", async (req: any, res) => {
  try {
    const sub = await getLatestSubscription(req.userId);

    if (sub?.razorpaySubscriptionId) {
      return res.redirect(
        `https://dashboard.razorpay.com/app/subscriptions/${sub.razorpaySubscriptionId}`
      );
    }

    res.redirect("https://dashboard.razorpay.com");
  } catch (err: any) {
    logger.error({ err }, "subscription portal failed");
    res.status(500).json({ error: err.message });
  }
});

// POST /api/subscription/cancel
router.post("/subscription/cancel", async (req: any, res) => {
  try {
    const sub = await getLatestSubscription(req.userId);

    if (sub?.razorpaySubscriptionId) {
      try {
        const rzp = getRazorpay();
        await rzp.subscriptions.cancel(sub.razorpaySubscriptionId, { cancel_at_cycle_end: 1 });
      } catch (rzpErr: any) {
        logger.warn({ rzpErr }, "Razorpay subscription cancel API call failed — updating DB anyway");
      }
      await db
        .update(subscriptionsTable)
        .set({ cancelAtPeriodEnd: true })
        .where(eq(subscriptionsTable.id, sub.id));
      return res.json({ success: true, cancelAtPeriodEnd: true });
    }

    // Legacy: no subscription ID, cancel immediately
    await db.update(usersTable).set({ isPro: false }).where(eq(usersTable.id, req.userId));
    if (sub) {
      await db
        .update(subscriptionsTable)
        .set({ status: "cancelled", plan: "free", cancelledAt: new Date() })
        .where(eq(subscriptionsTable.id, sub.id));
    }
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

// POST /api/payments/razorpay/storage/verify (kept for legacy webhooks in flight)
router.post("/payments/razorpay/storage/verify", async (req: any, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, gb } = req.body;

    if (!verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
      return res.status(400).json({ error: "Payment verification failed" });
    }

    const LEGACY_STORAGE_PLANS = [
      { gb: 10, label: "10 GB" },
      { gb: 50, label: "50 GB" },
      { gb: 100, label: "100 GB" },
    ];
    const plan = LEGACY_STORAGE_PLANS.find((p) => p.gb === gb);
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

// POST /api/payments/razorpay/pro/order  (legacy — one-time order flow)
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

// POST /api/payments/razorpay/pro/verify  (legacy — one-time order flow)
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

// POST /api/payments/razorpay/webhook  (legacy alias — also verified)
router.post("/payments/razorpay/webhook", async (req, res) => {
  try {
    const signature = req.headers["x-razorpay-signature"] as string;
    const rawBody = JSON.stringify(req.body);

    if (!verifyWebhookSignature(rawBody, signature)) {
      return res.status(400).json({ error: "Invalid webhook signature" });
    }

    const event = req.body?.event as string;
    logger.info({ event }, "Razorpay webhook received (legacy path)");

    await handleWebhookEvent(event, req.body);

    res.json({ acknowledged: true });
  } catch (err: any) {
    logger.error({ err }, "Razorpay webhook failed");
    res.status(500).json({ error: err.message });
  }
});

export default router;
