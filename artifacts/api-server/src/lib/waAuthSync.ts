import { objectStorageClient } from "./objectStorage";
import fs from "fs";
import path from "path";
import { logger } from "./logger";

const BUCKET_ID = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID ?? "";
const WA_AUTH_GCS_PREFIX = "wa-auth";

/** Recursively collect all files under a directory. */
function collectFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFiles(full));
    } else {
      results.push(full);
    }
  }
  return results;
}

export async function downloadWaAuthFromStorage(localDir: string): Promise<void> {
  if (!BUCKET_ID) return;
  try {
    fs.mkdirSync(localDir, { recursive: true });
    const bucket = objectStorageClient.bucket(BUCKET_ID);
    const [files] = await bucket.getFiles({ prefix: WA_AUTH_GCS_PREFIX + "/" });
    for (const file of files) {
      const relName = file.name.slice(WA_AUTH_GCS_PREFIX.length + 1);
      if (!relName) continue;
      const localPath = path.join(localDir, relName);
      fs.mkdirSync(path.dirname(localPath), { recursive: true });
      await file.download({ destination: localPath });
    }
    logger.info({ count: files.length }, "WA auth files restored from storage");
  } catch (err) {
    logger.warn({ err }, "Could not restore WA auth from storage (first run?)");
  }
}

export async function uploadWaAuthDirToStorage(localDir: string): Promise<void> {
  if (!BUCKET_ID) return;
  try {
    if (!fs.existsSync(localDir)) return;
    const allFiles = collectFiles(localDir);
    if (allFiles.length === 0) return;
    const bucket = objectStorageClient.bucket(BUCKET_ID);
    await Promise.all(
      allFiles.map((filePath) => {
        const relPath = path.relative(localDir, filePath).replace(/\\/g, "/");
        return bucket.upload(filePath, {
          destination: `${WA_AUTH_GCS_PREFIX}/${relPath}`,
        });
      })
    );
    logger.info({ count: allFiles.length }, "WA auth files synced to storage");
  } catch (err) {
    logger.warn({ err }, "Could not sync WA auth to storage");
  }
}

export async function deleteWaAuthFromStorage(): Promise<void> {
  if (!BUCKET_ID) return;
  try {
    const bucket = objectStorageClient.bucket(BUCKET_ID);
    const [files] = await bucket.getFiles({ prefix: WA_AUTH_GCS_PREFIX + "/" });
    await Promise.all(files.map((f) => f.delete({ ignoreNotFound: true })));
    logger.info("WA auth files deleted from storage");
  } catch (err) {
    logger.warn({ err }, "Could not delete WA auth from storage");
  }
}
