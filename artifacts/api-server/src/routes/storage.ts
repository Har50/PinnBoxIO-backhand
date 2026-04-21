import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { storageFilesTable, storageQuotasTable } from "@workspace/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { objectStorageClient } from "../lib/objectStorage";
import { getUncachableStripeClient } from "../lib/stripeClient";
import { stripeStorage } from "../lib/stripeStorage";

const router: IRouter = Router();

const FREE_QUOTA_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB

const STORAGE_PLANS = [
  { gb: 10, label: "10 GB", priceUsd: 299 },
  { gb: 50, label: "50 GB", priceUsd: 699 },
  { gb: 100, label: "100 GB", priceUsd: 999 },
];

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

async function signedUrl(storageKey: string, method: "GET" | "PUT" | "DELETE", ttlSec: number): Promise<string> {
  const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
  if (!bucketId) throw new Error("Object storage not configured");

  const request = {
    bucket_name: bucketId,
    object_name: storageKey,
    method,
    expires_at: new Date(Date.now() + ttlSec * 1000).toISOString(),
  };

  const response = await fetch(`${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new Error(`Failed to get signed URL: ${response.status}`);
  }

  const { signed_url } = await response.json();
  return signed_url;
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

router.get("/storage/quota", async (req: any, res) => {
  try {
    const quota = await getOrCreateQuota(req.user.id);
    res.json({ quota });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/storage/files", async (req: any, res) => {
  try {
    const folder = (req.query.folder as string) || "/";
    const files = await db
      .select()
      .from(storageFilesTable)
      .where(and(eq(storageFilesTable.userId, req.user.id), eq(storageFilesTable.folder, folder)));
    res.json({ files });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/storage/upload-url", async (req: any, res) => {
  try {
    const { fileName, mimeType, sizeBytes, folder = "/" } = req.body;
    if (!fileName || sizeBytes == null) {
      return res.status(400).json({ error: "fileName and sizeBytes are required" });
    }

    const quota = await getOrCreateQuota(req.user.id);
    if (quota.usedBytes + sizeBytes > quota.totalBytes) {
      return res.status(400).json({ error: "Storage quota exceeded. Please upgrade your plan." });
    }

    const storageKey = `user/${req.user.id}/${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const uploadUrl = await signedUrl(storageKey, "PUT", 15 * 60);

    res.json({ uploadUrl, storageKey });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/storage/files", async (req: any, res) => {
  try {
    const { name, mimeType, sizeBytes, storageKey, folder = "/" } = req.body;
    if (!name || !storageKey || sizeBytes == null) {
      return res.status(400).json({ error: "name, storageKey, and sizeBytes are required" });
    }

    const [file] = await db
      .insert(storageFilesTable)
      .values({ userId: req.user.id, name, mimeType: mimeType || "application/octet-stream", sizeBytes, storageKey, folder })
      .returning();

    await db
      .update(storageQuotasTable)
      .set({ usedBytes: sql`used_bytes + ${sizeBytes}` })
      .where(eq(storageQuotasTable.userId, req.user.id));

    res.json({ file });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/storage/files/:id/download-url", async (req: any, res) => {
  try {
    const fileId = parseInt(req.params.id);
    const [file] = await db
      .select()
      .from(storageFilesTable)
      .where(and(eq(storageFilesTable.id, fileId), eq(storageFilesTable.userId, req.user.id)));

    if (!file) return res.status(404).json({ error: "File not found" });

    const downloadUrl = await signedUrl(file.storageKey, "GET", 60 * 60);

    await db
      .update(storageFilesTable)
      .set({ downloadCount: sql`download_count + 1` })
      .where(eq(storageFilesTable.id, fileId));

    res.json({ downloadUrl, fileName: file.name });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/storage/files/:id", async (req: any, res) => {
  try {
    const fileId = parseInt(req.params.id);
    const [file] = await db
      .select()
      .from(storageFilesTable)
      .where(and(eq(storageFilesTable.id, fileId), eq(storageFilesTable.userId, req.user.id)));

    if (!file) return res.status(404).json({ error: "File not found" });

    try {
      const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
      if (bucketId) {
        const bucket = objectStorageClient.bucket(bucketId);
        await bucket.file(file.storageKey).delete({ ignoreNotFound: true });
      }
    } catch {}

    await db.delete(storageFilesTable).where(eq(storageFilesTable.id, fileId));
    await db
      .update(storageQuotasTable)
      .set({ usedBytes: sql`GREATEST(0, used_bytes - ${file.sizeBytes})` })
      .where(eq(storageQuotasTable.userId, req.user.id));

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/storage/plans", async (_req, res) => {
  try {
    res.json({ plans: STORAGE_PLANS.map((p) => ({ ...p, priceId: null, currency: "usd", unitAmount: p.priceUsd })) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/storage/revenuecat/activate", async (req: any, res) => {
  try {
    const { gb } = req.body;
    const plan = STORAGE_PLANS.find((p) => p.gb === gb);
    if (!plan) return res.status(400).json({ error: "Invalid storage plan" });

    const totalBytes = plan.gb * 1024 * 1024 * 1024;
    const existing = await getOrCreateQuota(req.user.id);

    const [quota] = await db
      .update(storageQuotasTable)
      .set({
        totalBytes: Math.max(existing.totalBytes, totalBytes),
        planName: plan.label,
      })
      .where(eq(storageQuotasTable.userId, req.user.id))
      .returning();

    res.json({ quota });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/storage/checkout", async (req: any, res) => {
  try {
    const { priceId, gb } = req.body;
    if (!priceId && !gb) {
      return res.status(400).json({ error: "priceId or gb is required" });
    }

    const stripe = await getUncachableStripeClient();
    const user = await stripeStorage.getUser(req.user.id);

    let customerId = user?.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user?.email || undefined,
        metadata: { userId: req.user.id },
      });
      await stripeStorage.updateUserStripeInfo(req.user.id, { stripeCustomerId: customer.id });
      customerId = customer.id;
    }

    let targetPriceId = priceId;

    if (!targetPriceId && gb) {
      const plan = STORAGE_PLANS.find((p) => p.gb === gb);
      if (!plan) return res.status(400).json({ error: "Invalid storage plan" });

      const product = await stripe.products.create({
        name: `PinnboxIO Storage — ${plan.label}`,
        description: `${plan.label} of cloud storage for PinnboxIO`,
        metadata: { type: "storage", gb: String(plan.gb) },
      });
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: plan.priceUsd,
        currency: "usd",
        recurring: { interval: "month" },
      });
      targetPriceId = price.id;
    }

    const host = req.get("host");
    const proto = req.protocol;
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: targetPriceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${proto}://${host}/storage?upgraded=success`,
      cancel_url: `${proto}://${host}/storage?upgraded=cancel`,
      metadata: { userId: req.user.id, feature: "storage", gb: gb ? String(gb) : "" },
    });

    res.json({ url: session.url });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
