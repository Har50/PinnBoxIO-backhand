import * as fs from "node:fs/promises";
import * as path from "node:path";
import { randomUUID } from "crypto";
import {
  ObjectAclPolicy,
  ObjectPermission,
  canAccessObject,
  getObjectAclPolicy,
  setObjectAclPolicy,
} from "./objectAcl";
import * as localStorage from "./localFileStorage";

const storageDir = () => process.env.STORAGE_DIR || path.resolve(process.cwd(), "data", "storage");

export const objectStorageClient = {
  bucket: (bucketName: string) => ({
    file: (objectName: string) => ({
      download: (options?: { start?: number; end?: number }) =>
        localStorage.objectRead(bucketName, objectName, options).then((buf) => [buf] as [Buffer]),
      delete: (opts?: { ignoreNotFound?: boolean }) =>
        localStorage.objectDelete(bucketName, objectName).catch((err) => {
          if (!opts?.ignoreNotFound) throw err;
        }),
      exists: () => localStorage.objectExists(bucketName, objectName),
      createReadStream: () => localStorage.objectStream(bucketName, objectName),
      getMetadata: async () => {
        const meta = await localStorage.objectMetadata(bucketName, objectName);
        return [
          {
            contentType: "application/octet-stream",
            size: meta?.size ?? 0,
            ...(meta ? { updated: meta.mtime.toISOString() } : {}),
          },
        ] as [any];
      },
    }),
    getFiles: async () => {
      const dir = path.join(storageDir(), bucketName);
      const files: any[] = [];
      try {
        const entries = await fs.readdir(dir, { recursive: true, withFileTypes: true });
        for (const entry of entries) {
          if (entry.isFile()) {
            const relativePath = path.relative(dir, path.join(entry.parentPath, entry.name));
            files.push({
              name: relativePath.replace(/\\/g, "/"),
              delete: () => localStorage.objectDelete(bucketName, relativePath.replace(/\\/g, "/")),
            });
          }
        }
      } catch {}
      return [files] as [any[]];
    },
  }),
};

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export { signObjectURL };

export class ObjectStorageService {
  constructor() {}

  getPublicObjectSearchPaths(): Array<string> {
    const pathsStr = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
    const paths = Array.from(
      new Set(
        pathsStr
          .split(",")
          .map((path) => path.trim())
          .filter((path) => path.length > 0)
      )
    );
    if (paths.length === 0) {
      throw new Error(
        "PUBLIC_OBJECT_SEARCH_PATHS not set. Create a bucket in 'Object Storage' " +
          "tool and set PUBLIC_OBJECT_SEARCH_PATHS env var (comma-separated paths)."
      );
    }
    return paths;
  }

  getPrivateObjectDir(): string {
    const dir = process.env.PRIVATE_OBJECT_DIR || "";
    if (!dir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' " +
          "tool and set PRIVATE_OBJECT_DIR env var."
      );
    }
    return dir;
  }

  async searchPublicObject(filePath: string) {
    for (const searchPath of this.getPublicObjectSearchPaths()) {
      const fullPath = `${searchPath}/${filePath}`;
      const { bucketName, objectName } = parseObjectPath(fullPath);
      const exists = await localStorage.objectExists(bucketName, objectName);
      if (exists) {
        return { bucketName, objectName };
      }
    }
    return null;
  }

  async downloadObject(
    obj: { bucketName: string; objectName: string },
    cacheTtlSec: number = 3600
  ): Promise<Response> {
    const meta = await localStorage.objectMetadata(obj.bucketName, obj.objectName);
    const nodeStream = localStorage.objectStream(obj.bucketName, obj.objectName);
    const webStream = Readable.toWeb(nodeStream) as ReadableStream;

    const headers: Record<string, string> = {
      "Content-Type": "application/octet-stream",
      "Cache-Control": `public, max-age=${cacheTtlSec}`,
    };
    if (meta?.size) {
      headers["Content-Length"] = String(meta.size);
    }

    return new Response(webStream, { headers });
  }

  async getObjectEntityUploadURL(): Promise<string> {
    const privateObjectDir = this.getPrivateObjectDir();
    if (!privateObjectDir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' " +
          "tool and set PRIVATE_OBJECT_DIR env var."
      );
    }

    const objectId = randomUUID();
    const fullPath = `${privateObjectDir}/uploads/${objectId}`;
    const { bucketName, objectName } = parseObjectPath(fullPath);

    return signObjectURL({
      bucketName,
      objectName,
      method: "PUT",
      ttlSec: 900,
    });
  }

  async getObjectEntityFile(objectPath: string) {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }

    const parts = objectPath.slice(1).split("/");
    if (parts.length < 2) {
      throw new ObjectNotFoundError();
    }

    const entityId = parts.slice(1).join("/");
    let entityDir = this.getPrivateObjectDir();
    if (!entityDir.endsWith("/")) {
      entityDir = `${entityDir}/`;
    }
    const objectEntityPath = `${entityDir}${entityId}`;
    const { bucketName, objectName } = parseObjectPath(objectEntityPath);
    const exists = await localStorage.objectExists(bucketName, objectName);
    if (!exists) {
      throw new ObjectNotFoundError();
    }
    return { bucketName, objectName };
  }

  normalizeObjectEntityPath(rawPath: string): string {
    if (!rawPath.startsWith("https://storage.googleapis.com/")) {
      return rawPath;
    }
    const url = new URL(rawPath);
    const rawObjectPath = url.pathname;

    let objectEntityDir = this.getPrivateObjectDir();
    if (!objectEntityDir.endsWith("/")) {
      objectEntityDir = `${objectEntityDir}/`;
    }

    if (!rawObjectPath.startsWith(objectEntityDir)) {
      return rawObjectPath;
    }

    const entityId = rawObjectPath.slice(objectEntityDir.length);
    return `/objects/${entityId}`;
  }

  async trySetObjectEntityAclPolicy(
    rawPath: string,
    aclPolicy: ObjectAclPolicy
  ): Promise<string> {
    const normalizedPath = this.normalizeObjectEntityPath(rawPath);
    if (!normalizedPath.startsWith("/")) {
      return normalizedPath;
    }

    const objectFile = await this.getObjectEntityFile(normalizedPath);
    // ACL stored as metadata not supported on local fs — skip
    return normalizedPath;
  }

  async canAccessObjectEntity({
    userId,
    objectFile,
    requestedPermission,
  }: {
    userId?: string;
    objectFile: { bucketName: string; objectName: string };
    requestedPermission?: ObjectPermission;
  }): Promise<boolean> {
    return canAccessObject({
      userId,
      objectFile,
      requestedPermission: requestedPermission ?? ObjectPermission.READ,
    });
  }
}

function parseObjectPath(path: string): {
  bucketName: string;
  objectName: string;
} {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  const pathParts = path.split("/");
  if (pathParts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }

  const bucketName = pathParts[1];
  const objectName = pathParts.slice(2).join("/");

  return {
    bucketName,
    objectName,
  };
}

function signObjectURL({
  bucketName,
  objectName,
  method,
  ttlSec,
}: {
  bucketName: string;
  objectName: string;
  method: "GET" | "PUT" | "DELETE" | "HEAD";
  ttlSec: number;
}): string {
  const baseUrl = (process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 10000}`).replace(/\/$/, "");
  const action = method === "PUT" ? "upload" : method === "DELETE" ? "delete" : "download";
  return `${baseUrl}/api/storage/object/${action}/${bucketName}/${objectName}`;
}
