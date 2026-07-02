import { type Request, type Response, type NextFunction } from "express";
import { logger } from "../lib/logger";

export const CLERK_PROXY_PATH = "/api/__clerk";

const FAPI_BASE_URL = "https://frontend-api.clerk.services";

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

function fapiUrlFromPublishableKey(publishableKey: string): string {
  try {
    const decoded = Buffer.from(publishableKey.split("_")[2] || "", "base64url").toString("utf-8");
    const parts = decoded.split("$");
    const frontendApi = parts[0] || "";
    if (frontendApi.startsWith("clerk.") && frontendApi.endsWith(".lcl.dev")) {
      return "https://api.lclclerk.com";
    }
    if (frontendApi.endsWith(".lclstage.dev")) {
      return "https://api.lclstageclerk.com";
    }
    if (frontendApi.endsWith(".stgstage.dev")) {
      return "https://api.stgstageclerk.com";
    }
  } catch {
    // fall through to default
  }
  return FAPI_BASE_URL;
}

export function clerkProxyMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const path = req.originalUrl || req.url || "";

    if (path !== CLERK_PROXY_PATH && !path.startsWith(CLERK_PROXY_PATH + "/")) {
      return next();
    }

    const secretKey = process.env.CLERK_SECRET_KEY;
    if (!secretKey) {
      return next();
    }

    const publishableKey =
      process.env.CLERK_PUBLISHABLE_KEY || process.env.VITE_CLERK_PUBLISHABLE_KEY || "";
    if (!publishableKey) {
      res.status(500).json({ errors: [{ code: "proxy_configuration_error", message: "Missing publishableKey" }] });
      return;
    }

    const queryString = new URL(req.url || req.originalUrl || "", "http://localhost").search;
    const targetPath = path.slice(CLERK_PROXY_PATH.length) || "/";
    const fapiBaseUrl = fapiUrlFromPublishableKey(publishableKey);
    const targetUrl = new URL(`${fapiBaseUrl}${targetPath}${queryString}`);

    const protocol = (req.headers["x-forwarded-proto"] || req.protocol || "https") as string;
    const host = (req.headers["x-forwarded-host"] || req.headers.host || "pinnboxio.net") as string;
    const proxyUrl = `${protocol}://${host}${CLERK_PROXY_PATH}`;

    const clientIp =
      (req.headers["cf-connecting-ip"] as string) ||
      (req.headers["x-real-ip"] as string) ||
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "";

    const bodyChunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => {
      bodyChunks.push(chunk);
    });

    req.on("end", async () => {
      const rawBody = Buffer.concat(bodyChunks);

      // Build fetch headers
      const fetchHeaders = new Headers();
      fetchHeaders.set("Clerk-Proxy-Url", proxyUrl);
      fetchHeaders.set("Clerk-Secret-Key", secretKey);
      fetchHeaders.set("Host", targetUrl.host);
      fetchHeaders.set("Accept-Encoding", "identity");
      if (clientIp) {
        fetchHeaders.set("X-Forwarded-For", clientIp);
      }
      fetchHeaders.set("X-Forwarded-Host", host);
      fetchHeaders.set("X-Forwarded-Proto", protocol);

      for (const [key, value] of Object.entries(req.headers)) {
        if (HOP_BY_HOP_HEADERS.has(key.toLowerCase())) continue;
        if (["host", "connection", "content-length", "transfer-encoding"].includes(key.toLowerCase())) continue;
        if (value === undefined) continue;
        const val = Array.isArray(value) ? value.join(", ") : value;
        if (typeof val === "string") {
          fetchHeaders.set(key, val);
        }
      }

      const fetchOptions: RequestInit & { duplex?: string } = {
        method: req.method,
        headers: fetchHeaders,
        redirect: "manual",
      };

      if (rawBody.length > 0) {
        fetchOptions.body = rawBody;
        fetchOptions.duplex = "half";
      }

      try {
        const response = await fetch(targetUrl.toString(), fetchOptions);

        for (const [key, value] of response.headers.entries()) {
          if (HOP_BY_HOP_HEADERS.has(key.toLowerCase())) continue;
          if (key.toLowerCase() === "content-encoding") continue;
          if (key.toLowerCase() === "content-length") continue;
          if (key.toLowerCase() === "location") {
            try {
              const locationUrl = new URL(value, fapiBaseUrl);
              if (locationUrl.host === targetUrl.host) {
                const rewrittenLocation = `${proxyUrl}${locationUrl.pathname}${locationUrl.search}${locationUrl.hash}`;
                res.setHeader("Location", rewrittenLocation);
                continue;
              }
            } catch {
              // use original location
            }
          }
          if (key.toLowerCase() === "set-cookie") {
            res.appendHeader(key, value);
          } else {
            res.setHeader(key, value);
          }
        }

        res.status(response.status);
        if (response.body) {
          const reader = response.body.getReader();
          const stream = new (require("node:stream").Readable)({
            async read() {
              try {
                const { done, value } = await reader.read();
                if (done) {
                  this.push(null);
                } else {
                  this.push(Buffer.from(value));
                }
              } catch (error) {
                this.destroy(error instanceof Error ? error : new Error(String(error)));
              }
            },
          });
          stream.pipe(res);
        } else {
          res.end();
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        logger.error({ err: message, method: req.method, path, target: targetUrl.toString() }, "Clerk proxy error");
        res.status(502).json({
          errors: [
            {
              code: "proxy_request_failed",
              message: `Failed to proxy request to Clerk FAPI: ${message}`,
            },
          ],
        });
      }
    });

    req.on("error", (err: Error) => {
      logger.error({ err: String(err), method: req.method, path }, "Clerk proxy request stream error");
      next(err);
    });
  };
}
