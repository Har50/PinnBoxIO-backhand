import { type Request, type Response, type NextFunction } from "express";
import { logger } from "../lib/logger";

export const CLERK_PROXY_PATH = "/api/__clerk";

const FAPI_BASE_URL = "https://frontend-api.clerk.services";

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
      process.env.CLERK_PUBLISHABLE_KEY || process.env.VITE_CLERK_PUBLISHABLE_KEY;
    if (!publishableKey) {
      res.status(500).json({ errors: [{ code: "proxy_configuration_error", message: "Missing publishableKey" }] });
      return;
    }

    const targetPath = path.slice(CLERK_PROXY_PATH.length) || "/";
    const targetUrl = new URL(targetPath, FAPI_BASE_URL);
    targetUrl.search = new URL(req.url || req.originalUrl || "", "http://localhost").search;

    const protocol = req.headers["x-forwarded-proto"] || req.protocol || "https";
    const host = req.headers["x-forwarded-host"] || req.headers.host || "pinnboxio.net";
    const proxyUrl = `${protocol}://${host}${CLERK_PROXY_PATH}`;

    const clientIp =
      req.headers["cf-connecting-ip"]?.toString() ||
      req.headers["x-real-ip"]?.toString() ||
      req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "";

    const headers: Record<string, string> = {
      Host: targetUrl.hostname,
      "Clerk-Proxy-Url": proxyUrl,
      "Clerk-Secret-Key": secretKey,
      "X-Forwarded-For": clientIp,
      "Accept-Encoding": "identity",
    };

    if (req.headers["content-type"]) {
      headers["Content-Type"] = req.headers["content-type"] as string;
    }
    if (req.headers["cookie"]) {
      headers["Cookie"] = req.headers["cookie"] as string;
    }
    if (req.headers["user-agent"]) {
      headers["User-Agent"] = req.headers["user-agent"] as string;
    }
    if (req.headers["origin"]) {
      headers["Origin"] = req.headers["origin"] as string;
    }
    if (req.headers["referer"]) {
      headers["Referer"] = req.headers["referer"] as string;
    }
    if (req.headers["authorization"]) {
      headers["Authorization"] = req.headers["authorization"] as string;
    }
    if (!headers["X-Forwarded-Host"]) {
      headers["X-Forwarded-Host"] = Array.isArray(req.headers.host)
        ? req.headers.host[0]
        : req.headers.host || "pinnboxio.net";
    }
    if (!headers["X-Forwarded-Proto"]) {
      headers["X-Forwarded-Proto"] = protocol as string;
    }

    const bodyChunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => {
      bodyChunks.push(chunk);
    });

    req.on("end", () => {
      const body = Buffer.concat(bodyChunks);
      if (body.length > 0) {
        headers["Content-Length"] = body.length.toString();
      }

      const httpModule = targetUrl.protocol === "https:" ? require("node:https") : require("node:http");
      const options: import("node:http").RequestOptions = {
        hostname: targetUrl.hostname,
        port: targetUrl.port || 443,
        path: targetUrl.pathname + targetUrl.search,
        method: req.method,
        headers,
        rejectUnauthorized: false,
      };

      const proxyReq = httpModule.request(options, (proxyRes) => {
        res.status(proxyRes.statusCode || 502);
        if (proxyRes.headers["set-cookie"]) {
          res.setHeader("Set-Cookie", proxyRes.headers["set-cookie"]);
        }
        if (proxyRes.headers["location"]) {
          res.setHeader("Location", proxyRes.headers["location"]);
        }
        res.setHeader("Content-Type", proxyRes.headers["content-type"] || "application/json");
        proxyRes.pipe(res);
      });

      proxyReq.on("error", (err: Error) => {
        logger.error({ err: String(err), method: req.method, path }, "Clerk proxy error");
        res.status(502).json({
          errors: [
            {
              code: "proxy_request_failed",
              message: `Failed to proxy request to Clerk FAPI: ${err.message}`,
            },
          ],
        });
      });

      if (body.length > 0) {
        proxyReq.write(body);
      }
      proxyReq.end();
    });

    req.on("error", (err: Error) => {
      logger.error({ err: String(err), method: req.method, path }, "Clerk proxy request stream error");
      next(err);
    });
  };
}
