import * as fs from "node:fs/promises";
import * as path from "node:path";
import { createReadStream } from "node:fs";
import { Readable } from "node:stream";

const storageDir = () => process.env.STORAGE_DIR || path.resolve(process.cwd(), "data", "storage");

function objectPath(bucketName: string, objectName: string): string {
  return path.join(storageDir(), bucketName, objectName);
}

export async function objectExists(bucketName: string, objectName: string): Promise<boolean> {
  try {
    await fs.access(objectPath(bucketName, objectName));
    return true;
  } catch {
    return false;
  }
}

export async function objectRead(bucketName: string, objectName: string, options?: { start?: number; end?: number }): Promise<Buffer> {
  const filePath = objectPath(bucketName, objectName);
  if (options?.start != null || options?.end != null) {
    const fd = await fs.open(filePath, "r");
    try {
      const stat = await fd.stat();
      const start = options?.start ?? 0;
      const end = options?.end ?? stat.size - 1;
      const length = end - start + 1;
      const buf = Buffer.alloc(length);
      await fd.read(buf, 0, length, start);
      return buf;
    } finally {
      await fd.close();
    }
  }
  return fs.readFile(filePath);
}

export function objectStream(bucketName: string, objectName: string): Readable {
  return createReadStream(objectPath(bucketName, objectName));
}

export async function objectDelete(bucketName: string, objectName: string): Promise<void> {
  const filePath = objectPath(bucketName, objectName);
  try {
    await fs.unlink(filePath);
  } catch (err: any) {
    if (err.code !== "ENOENT") throw err;
  }
  // Clean up empty parent dirs
  let dir = path.dirname(filePath);
  while (dir.startsWith(storageDir())) {
    try {
      const entries = await fs.readdir(dir);
      if (entries.length > 0) break;
      await fs.rmdir(dir);
      dir = path.dirname(dir);
    } catch {
      break;
    }
  }
}

export async function objectWrite(bucketName: string, objectName: string, data: Buffer | string): Promise<void> {
  const filePath = objectPath(bucketName, objectName);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, data);
}

export async function objectMetadata(bucketName: string, objectName: string): Promise<{ size: number; mtime: Date } | null> {
  try {
    const stat = await fs.stat(objectPath(bucketName, objectName));
    return { size: stat.size, mtime: stat.mtime };
  } catch {
    return null;
  }
}
