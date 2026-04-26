import { objectStorageClient } from "./objectStorage";
import fs from "fs";
import path from "path";
import { logger } from "./logger";

const BUCKET_ID = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID ?? "";
const WA_AUTH_GCS_PREFIX = "wa-auth";

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
    const files = fs.readdirSync(localDir).filter((f) => f.endsWith(".json"));
    const bucket = objectStorageClient.bucket(BUCKET_ID);
    await Promise.all(
      files.map((fileName) =>
        bucket.upload(path.join(localDir, fileName), {
          destination: `${WA_AUTH_GCS_PREFIX}/${fileName}`,
        })
      )
    );
    logger.info({ count: files.length }, "WA auth files synced to storage");
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
