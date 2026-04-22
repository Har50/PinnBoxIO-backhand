import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { storageFilesTable, storageQuotasTable } from "@workspace/db/schema";
import { eq, and, sql, ne } from "drizzle-orm";
import { objectStorageClient } from "../lib/objectStorage";

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

function normalisePath(raw: string): string {
  const p = ("/" + raw).replace(/\/+/g, "/").replace(/\/$/, "") || "/";
  return p;
}

router.get("/storage/quota", async (req: any, res) => {
  try {
    const quota = await getOrCreateQuota(req.user.id);
    res.json({ quota });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** List all virtual folders for the user (derived from distinct folder paths on files). */
router.get("/storage/folders", async (req: any, res) => {
  try {
    const parentFolder = normalisePath((req.query.folder as string) || "/");

    const rows = await db
      .selectDistinct({ folder: storageFilesTable.folder })
      .from(storageFilesTable)
      .where(eq(storageFilesTable.userId, req.user.id));

    const allFolders = new Set(rows.map((r) => r.folder));

    // Derive immediate children of parentFolder
    const children = new Set<string>();
    for (const f of allFolders) {
      if (f === parentFolder) continue;
      // Check if f starts with parentFolder
      const prefix = parentFolder === "/" ? "/" : parentFolder + "/";
      if (!f.startsWith(prefix)) continue;
      const rest = f.slice(prefix.length);
      const child = prefix + rest.split("/")[0];
      children.add(child);
    }

    const folders = Array.from(children).sort().map((path) => {
      const name = path.split("/").filter(Boolean).pop() ?? path;
      return { path, name };
    });

    res.json({ folders });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** Create a virtual folder by uploading a zero-byte sentinel file. */
router.post("/storage/folders", async (req: any, res) => {
  try {
    const { name, parentFolder = "/" } = req.body;
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "name is required" });
    }

    const cleanName = name.trim().replace(/[/\\:*?"<>|]/g, "").slice(0, 128);
    if (!cleanName) return res.status(400).json({ error: "Invalid folder name" });

    const parent = normalisePath(parentFolder);
    const folderPath = parent === "/" ? `/${cleanName}` : `${parent}/${cleanName}`;

    // Check folder doesn't already exist
    const existing = await db
      .select({ id: storageFilesTable.id })
      .from(storageFilesTable)
      .where(and(eq(storageFilesTable.userId, req.user.id), eq(storageFilesTable.folder, folderPath)))
      .limit(1);
    if (existing.length > 0) {
      return res.json({ folder: { path: folderPath, name: cleanName } });
    }

    // Insert a zero-byte .pinnbox-folder sentinel so the folder is discoverable
    const storageKey = `user/${req.user.id}/folders${folderPath}/.pinnbox-folder`;
    const [file] = await db
      .insert(storageFilesTable)
      .values({
        userId: req.user.id,
        name: ".pinnbox-folder",
        mimeType: "application/x-pinnbox-folder",
        sizeBytes: 0,
        storageKey,
        folder: folderPath,
      })
      .returning();

    res.json({ folder: { path: folderPath, name: cleanName }, file });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** Move a file to a different folder. */
router.patch("/storage/files/:id/move", async (req: any, res) => {
  try {
    const fileId = parseInt(req.params.id);
    const { folder } = req.body;
    if (!folder) return res.status(400).json({ error: "folder is required" });

    const [file] = await db
      .select()
      .from(storageFilesTable)
      .where(and(eq(storageFilesTable.id, fileId), eq(storageFilesTable.userId, req.user.id)));

    if (!file) return res.status(404).json({ error: "File not found" });

    const [updated] = await db
      .update(storageFilesTable)
      .set({ folder: normalisePath(folder) })
      .where(eq(storageFilesTable.id, fileId))
      .returning();

    res.json({ file: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/storage/files", async (req: any, res) => {
  try {
    const folder = normalisePath((req.query.folder as string) || "/");
    const files = await db
      .select()
      .from(storageFilesTable)
      .where(
        and(
          eq(storageFilesTable.userId, req.user.id),
          eq(storageFilesTable.folder, folder),
          ne(storageFilesTable.name, ".pinnbox-folder"),
        )
      );
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
      .values({ userId: req.user.id, name, mimeType: mimeType || "application/octet-stream", sizeBytes, storageKey, folder: normalisePath(folder) })
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

/** Delete all files in a folder (and the folder itself). */
router.delete("/storage/folders", async (req: any, res) => {
  try {
    const folder = normalisePath((req.query.folder as string) || "");
    if (!folder || folder === "/") {
      return res.status(400).json({ error: "Cannot delete root folder" });
    }

    const filesInFolder = await db
      .select()
      .from(storageFilesTable)
      .where(and(eq(storageFilesTable.userId, req.user.id), eq(storageFilesTable.folder, folder)));

    let freedBytes = 0;
    for (const file of filesInFolder) {
      try {
        const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
        if (bucketId) {
          const bucket = objectStorageClient.bucket(bucketId);
          await bucket.file(file.storageKey).delete({ ignoreNotFound: true });
        }
      } catch {}
      freedBytes += file.sizeBytes;
    }

    await db.delete(storageFilesTable).where(
      and(eq(storageFilesTable.userId, req.user.id), eq(storageFilesTable.folder, folder))
    );

    if (freedBytes > 0) {
      await db
        .update(storageQuotasTable)
        .set({ usedBytes: sql`GREATEST(0, used_bytes - ${freedBytes})` })
        .where(eq(storageQuotasTable.userId, req.user.id));
    }

    res.json({ success: true, deletedFiles: filesInFolder.length });
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
  res.status(410).json({ error: "Web storage checkout is unavailable. Storage upgrades are managed through the mobile app." });
});

export default router;
