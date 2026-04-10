import Stripe from "stripe";

async function getStripeSecretKey(): Promise<string> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? "depl " + process.env.WEB_REPL_RENEWAL
      : null;

  if (!xReplitToken) throw new Error("X-Replit-Token not found");

  const url = new URL(`https://${hostname}/api/v2/connection`);
  url.searchParams.set("include_secrets", "true");
  url.searchParams.set("connector_names", "stripe");
  url.searchParams.set("environment", "development");

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json", "X-Replit-Token": xReplitToken },
  });
  const data = await res.json();
  const conn = data.items?.[0];
  if (!conn?.settings?.secret) throw new Error("Stripe dev connection not found");
  return conn.settings.secret;
}

async function main() {
  console.log("Seeding Stripe products...");
  const secretKey = await getStripeSecretKey();
  const stripe = new Stripe(secretKey, { apiVersion: "2025-08-27.basil" as any });

  const existing = await stripe.products.list({ limit: 20 });
  const hasProProduct = existing.data.some((p) => p.name === "CommsHub Pro");

  if (hasProProduct) {
    console.log("Pro product already exists in Stripe. Listing products:");
    for (const product of existing.data.filter((p) => p.active)) {
      const prices = await stripe.prices.list({ product: product.id, active: true });
      console.log(`  - ${product.name} (${product.id})`);
      for (const price of prices.data) {
        const interval = price.recurring?.interval;
        const amount = (price.unit_amount! / 100).toFixed(2);
        console.log(`    Price: $${amount}/${interval} (${price.id})`);
      }
    }
    return;
  }

  const product = await stripe.products.create({
    name: "CommsHub Pro",
    description: "AI-powered communications assistant with premium features",
    metadata: { tier: "pro" },
  });
  console.log(`Created product: ${product.name} (${product.id})`);

  const monthlyPrice = await stripe.prices.create({
    product: product.id,
    unit_amount: 799,
    currency: "usd",
    recurring: { interval: "month" },
    nickname: "Monthly Pro",
  });
  console.log(`Created monthly price: $7.99/mo (${monthlyPrice.id})`);

  const yearlyPrice = await stripe.prices.create({
    product: product.id,
    unit_amount: 7188,
    currency: "usd",
    recurring: { interval: "year" },
    nickname: "Annual Pro",
  });
  console.log(`Created annual price: $71.88/yr (${yearlyPrice.id})`);

  console.log("\nDone! Now set up the Stripe webhook to sync data to the database.");
  console.log("Product ID:", product.id);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
