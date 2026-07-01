import { logger } from "../lib/logger";
import type { RequestHandler } from "express";
import { request as httpsRequest } from "node:https";
import { request as httpRequest } from "node:http";
import { URL } from "node:url";

export const CLERK_PROXY_PATH = "/api/__clerk";

export function clerkProxyMiddleware(): RequestHandler {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    return (_req, _res, next) => next();
  }

  const isProduction = secretKey.startsWith("sk_live_");
  const targetUrl = new URL(
    isProduction
      ? "https://frontend-api.clerk.services"
      : "https://frontend-api.clerk.dev",
  );

  return (req, res, next) => {
    const protocol = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers.host || "";
    const proxyUrl = `${protocol}://${host}${CLERK_PROXY_PATH}`;

    logger.info({ method: req.method, url: req.url, host }, "Clerk proxy received request");

    const bodyChunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => bodyChunks.push(chunk));
    req.on("end", () => {
      const body = Buffer.concat(bodyChunks);

      const path = req.url || "/";
      const destUrl = `${targetUrl.origin}${path}`;
      const requestModule = targetUrl.protocol === "https:" ? httpsRequest : httpRequest;

      const xff = req.headers["x-forwarded-for"];
      const clientIp =
        (Array.isArray(xff) ? xff[0] : xff)?.split(",")[0]?.trim() ||
        req.socket?.remoteAddress ||
        "";

      logger.info({ path, destUrl, clientIp, proxyUrl }, "Clerk proxy forwarding");

      const options = {
        hostname: targetUrl.hostname,
        port: targetUrl.port || (targetUrl.protocol === "https:" ? 443 : 80),
        path,
        method: req.method,
        headers: {
          ...req.headers,
          host: targetUrl.host,
          "Clerk-Proxy-Url": proxyUrl,
          "Clerk-Secret-Key": secretKey,
          "X-Forwarded-For": clientIp,
        },
      };

      const proxyReq = requestModule(options, (proxyRes) => {
        logger.info(
          { statusCode: proxyRes.statusCode },
          "Clerk proxy received response from target",
        );
        res.writeHead(proxyRes.statusCode || 500, proxyRes.headers);
        proxyRes.pipe(res);
      });

      proxyReq.on("error", (err) => {
        logger.error({ err: String(err) }, "Clerk proxy error");
        next(err);
      });

      if (body.length > 0) proxyReq.write(body);
      proxyReq.end();
    });
  };
}
