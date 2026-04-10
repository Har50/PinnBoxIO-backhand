import { Router, type IRouter } from "express";
import { stripeStorage } from "../lib/stripeStorage";
import { getUncachableStripeClient, getStripePublishableKey } from "../lib/stripeClient";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/stripe/config", async (_req, res) => {
  const publishableKey = await getStripePublishableKey();
  res.json({ publishableKey });
});

router.get("/stripe/products", async (_req, res) => {
  try {
    const rows = await stripeStorage.listProductsWithPrices();
    const productsMap = new Map<string, any>();
    for (const row of rows as any[]) {
      if (!productsMap.has(row.product_id)) {
        productsMap.set(row.product_id, {
          id: row.product_id,
          name: row.product_name,
          description: row.product_description,
          prices: [],
        });
      }
      if (row.price_id) {
        productsMap.get(row.product_id).prices.push({
          id: row.price_id,
          unitAmount: row.unit_amount,
          currency: row.currency,
          recurring: row.recurring,
        });
      }
    }
    res.json({ data: Array.from(productsMap.values()) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/stripe/subscription", async (req: any, res) => {
  try {
    const user = await stripeStorage.getUser(req.user.id);
    if (!user?.stripeSubscriptionId) {
      return res.json({ subscription: null, isPro: user?.isPro || false });
    }
    const subscription = await stripeStorage.getSubscription(user.stripeSubscriptionId);
    res.json({ subscription, isPro: user.isPro || false });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/stripe/checkout", async (req: any, res) => {
  try {
    const { priceId } = req.body;
    if (!priceId) return res.status(400).json({ error: "priceId is required" });

    const user = await stripeStorage.getUser(req.user.id);
    const stripe = await getUncachableStripeClient();

    let customerId = user?.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user?.email || undefined,
        metadata: { userId: req.user.id },
      });
      await stripeStorage.updateUserStripeInfo(req.user.id, {
        stripeCustomerId: customer.id,
      });
      customerId = customer.id;
    }

    const host = req.get("host");
    const proto = req.protocol;
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${proto}://${host}/settings?upgrade=success`,
      cancel_url: `${proto}://${host}/settings?upgrade=cancel`,
    });

    res.json({ url: session.url });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/stripe/portal", async (req: any, res) => {
  try {
    const user = await stripeStorage.getUser(req.user.id);
    if (!user?.stripeCustomerId) {
      return res.status(400).json({ error: "No Stripe customer found" });
    }

    const stripe = await getUncachableStripeClient();
    const host = req.get("host");
    const proto = req.protocol;
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${proto}://${host}/settings`,
    });

    res.json({ url: portalSession.url });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
