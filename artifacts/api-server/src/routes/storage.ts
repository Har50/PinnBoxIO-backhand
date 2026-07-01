import { Router, type IRouter } from "express";
import express from "express";
import { randomBytes } from "crypto";
import { db } from "@workspace/db";
import { storageFilesTable, storageQuotasTable } from "@workspace/db/schema";
import { eq, and, sql, ne, desc } from "drizzle-orm";
import { objectStorageClient, signObjectURL } from "../lib/objectStorage";
import * as localStorage from "../lib/localFileStorage";
import { openai } from "@workspace/integrations-openai-ai-server";

const FILE_CATEGORIES = ["invoice", "contract", "receipt", "report", "presentation", "spreadsheet", "photo", "video", "audio", "code", "document", "other"] as const;
type FileCategory = typeof FILE_CATEGORIES[number];

async function categorizeFile(name: string, mimeType: string): Promise<string | null> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: `Classify this file into exactly one category.\nFile name: "${name}"\nMIME type: "${mimeType}"\n\nCategories: invoice, contract, receipt, report, presentation, spreadsheet, photo, video, audio, code, document, other\n\nRespond with ONLY the category name, nothing else.`,
      }],
      max_tokens: 10,
      temperature: 0,
    });
    const cat = response.choices[0]?.message?.content?.trim().toLowerCase() ?? "";
    return FILE_CATEGORIES.includes(cat as FileCategory) ? cat : "other";
  } catch {
    return null;
  }
}

const router: IRouter = Router();

const FREE_QUOTA_BYTES = 1 * 1024 * 1024 * 1024; // 1 GB

async function signedUrl(storageKey: string, method: "GET" | "PUT" | "DELETE", ttlSec: number): Promise<string> {
  const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
  if (!bucketId) throw new Error("Object storage not configured");
  return signObjectURL({ bucketName: bucketId, objectName: storageKey, method, ttlSec });
}

const LEGACY_FREE_QUOTA_BYTES = 2 * 1024 * 1024 * 1024; // old incorrect 2 GB value

async function getOrCreateQuota(userId: string) {
  const [existing] = await db
    .select()
    .from(storageQuotasTable)
    .where(eq(storageQuotasTable.userId, userId));

  if (existing) {
    // Auto-correct free users who were given the old 2 GB quota
    if (existing.planName === "Free" && existing.totalBytes === LEGACY_FREE_QUOTA_BYTES) {
      const [corrected] = await db
        .update(storageQuotasTable)
        .set({ totalBytes: FREE_QUOTA_BYTES })
        .where(eq(storageQuotasTable.userId, userId))
        .returning();
      return corrected;
    }
    return existing;
  }

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
    const quota = await getOrCreateQuota(req.userId);
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
      .where(eq(storageFilesTable.userId, req.userId));

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
      .where(and(eq(storageFilesTable.userId, req.userId), eq(storageFilesTable.folder, folderPath)))
      .limit(1);
    if (existing.length > 0) {
      return res.json({ folder: { path: folderPath, name: cleanName } });
    }

    // Insert a zero-byte .pinnbox-folder sentinel so the folder is discoverable
    const storageKey = `user/${req.userId}/folders${folderPath}/.pinnbox-folder`;
    const [file] = await db
      .insert(storageFilesTable)
      .values({
        userId: req.userId,
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
      .where(and(eq(storageFilesTable.id, fileId), eq(storageFilesTable.userId, req.userId)));

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
          eq(storageFilesTable.userId, req.userId),
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

    const quota = await getOrCreateQuota(req.userId);
    if (quota.usedBytes + sizeBytes > quota.totalBytes) {
      return res.status(400).json({ error: "Storage quota exceeded. Please upgrade your plan." });
    }

    const storageKey = `user/${req.userId}/${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
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
      .values({ userId: req.userId, name, mimeType: mimeType || "application/octet-stream", sizeBytes, storageKey, folder: normalisePath(folder) })
      .returning();

    await db
      .update(storageQuotasTable)
      .set({ usedBytes: sql`used_bytes + ${sizeBytes}` })
      .where(eq(storageQuotasTable.userId, req.userId));

    categorizeFile(name, mimeType || "application/octet-stream").then((category) => {
      if (category) {
        db.update(storageFilesTable).set({ category }).where(eq(storageFilesTable.id, file.id)).catch(() => {});
      }
    }).catch(() => {});

    res.json({ file });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/storage/search", async (req: any, res) => {
  try {
    const { query } = req.body;
    if (!query?.trim()) return res.status(400).json({ error: "query is required" });

    const allFiles = await db
      .select({
        id: storageFilesTable.id,
        name: storageFilesTable.name,
        mimeType: storageFilesTable.mimeType,
        sizeBytes: storageFilesTable.sizeBytes,
        folder: storageFilesTable.folder,
        category: storageFilesTable.category,
        createdAt: storageFilesTable.createdAt,
        storageKey: storageFilesTable.storageKey,
        isPublic: storageFilesTable.isPublic,
        shareToken: storageFilesTable.shareToken,
        downloadCount: storageFilesTable.downloadCount,
        updatedAt: storageFilesTable.updatedAt,
      })
      .from(storageFilesTable)
      .where(eq(storageFilesTable.userId, req.userId))
      .orderBy(desc(storageFilesTable.updatedAt))
      .limit(200);

    if (allFiles.length === 0) return res.json({ files: [] });

    const fileList = allFiles.map((f) =>
      `id:${f.id} name:"${f.name}" type:${f.mimeType} size:${f.sizeBytes}B folder:"${f.folder}" category:"${f.category ?? "unknown"}" uploaded:${f.createdAt ? new Date(f.createdAt).toLocaleDateString() : "unknown"}`
    ).join("\n");

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a file search assistant. Given a user query and a list of files, return a JSON array of file IDs that match the query. Consider the file name, type, category, folder, and upload date. Be generous — include any file that could plausibly match. Return ONLY a valid JSON array of numbers (the file IDs), nothing else. Example: [1, 5, 12]",
        },
        {
          role: "user",
          content: `Search query: "${query.trim()}"\n\nFiles:\n${fileList}\n\nReturn ONLY a JSON array of matching file IDs.`,
        },
      ],
      max_tokens: 300,
      temperature: 0,
    });

    const raw = response.choices[0]?.message?.content?.trim() ?? "[]";
    let matchedIds: number[] = [];
    try {
      matchedIds = JSON.parse(raw);
      if (!Array.isArray(matchedIds)) matchedIds = [];
    } catch {}

    const matchedFiles = allFiles.filter((f) => matchedIds.includes(f.id));
    res.json({ files: matchedFiles });
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
      .where(and(eq(storageFilesTable.id, fileId), eq(storageFilesTable.userId, req.userId)));

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
      .where(and(eq(storageFilesTable.id, fileId), eq(storageFilesTable.userId, req.userId)));

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
      .where(eq(storageQuotasTable.userId, req.userId));

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
      .where(and(eq(storageFilesTable.userId, req.userId), eq(storageFilesTable.folder, folder)));

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
      and(eq(storageFilesTable.userId, req.userId), eq(storageFilesTable.folder, folder))
    );

    if (freedBytes > 0) {
      await db
        .update(storageQuotasTable)
        .set({ usedBytes: sql`GREATEST(0, used_bytes - ${freedBytes})` })
        .where(eq(storageQuotasTable.userId, req.userId));
    }

    res.json({ success: true, deletedFiles: filesInFolder.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


/** Enable public sharing for a file — generates a stable share token. */
router.post("/storage/files/:id/share", async (req: any, res) => {
  try {
    const fileId = parseInt(req.params.id);
    const [file] = await db
      .select()
      .from(storageFilesTable)
      .where(and(eq(storageFilesTable.id, fileId), eq(storageFilesTable.userId, req.userId)));

    if (!file) return res.status(404).json({ error: "File not found" });

    const token = file.shareToken ?? randomBytes(18).toString("base64url");
    const [updated] = await db
      .update(storageFilesTable)
      .set({ isPublic: true, shareToken: token })
      .where(eq(storageFilesTable.id, fileId))
      .returning();

    res.json({ file: updated, shareToken: token });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** Disable public sharing for a file. Token is cleared so old links break. */
router.delete("/storage/files/:id/share", async (req: any, res) => {
  try {
    const fileId = parseInt(req.params.id);
    const [file] = await db
      .select()
      .from(storageFilesTable)
      .where(and(eq(storageFilesTable.id, fileId), eq(storageFilesTable.userId, req.userId)));

    if (!file) return res.status(404).json({ error: "File not found" });

    const [updated] = await db
      .update(storageFilesTable)
      .set({ isPublic: false, shareToken: null })
      .where(eq(storageFilesTable.id, fileId))
      .returning();

    res.json({ file: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** Object storage routes — no auth (accessed via generated URLs). */
export const storageObjectRouter: IRouter = Router();

storageObjectRouter.put("/storage/object/upload/:bucket/:key*", express.raw({ type: "*/*", limit: "50mb" }), async (req, res) => {
  try {
    const { bucket, key } = req.params;
    await localStorage.objectWrite(bucket, key, req.body as Buffer);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

storageObjectRouter.get("/storage/object/download/:bucket/:key*", async (req, res) => {
  try {
    const { bucket, key } = req.params;
    const meta = await localStorage.objectMetadata(bucket, key);
    if (!meta) return res.status(404).json({ error: "Object not found" });

    const stream = localStorage.objectStream(bucket, key);
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Length", meta.size);
    stream.pipe(res);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

storageObjectRouter.delete("/storage/object/delete/:bucket/:key*", async (req, res) => {
  try {
    const { bucket, key } = req.params;
    await localStorage.objectDelete(bucket, key);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** Router with no auth — must be mounted before the auth middleware. */
export const storagePublicRouter: IRouter = Router();

/** Public download endpoint — no auth, requires a valid share token.
 *  Browsers get a 302 to the signed object URL. Pass ?meta=1 for JSON metadata. */
storagePublicRouter.get("/storage/public/:token", async (req: any, res) => {
  try {
    const token = req.params.token;
    if (!token) return res.status(400).json({ error: "Missing share token" });

    const [file] = await db
      .select()
      .from(storageFilesTable)
      .where(and(eq(storageFilesTable.shareToken, token), eq(storageFilesTable.isPublic, true)));

    if (!file) return res.status(404).json({ error: "File not found or sharing disabled" });

    const downloadUrl = await signedUrl(file.storageKey, "GET", 60 * 60);

    await db
      .update(storageFilesTable)
      .set({ downloadCount: sql`download_count + 1` })
      .where(eq(storageFilesTable.id, file.id));

    if (req.query.meta === "1") {
      return res.json({
        downloadUrl,
        fileName: file.name,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
      });
    }

    res.redirect(302, downloadUrl);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
