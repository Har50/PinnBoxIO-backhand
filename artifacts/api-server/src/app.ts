import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import path from "node:path";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { createProxyMiddleware } from "http-proxy-middleware";
import router from "./routes";
import { logger } from "./lib/logger";

// Clerk Frontend API host for this instance, derived from the publishable key
// (pk_live_Y2xlcmsucGlubmJveGlvLm5ldCQ → clerk.pinnboxio.net). This is what
// @clerk/backend's fapiUrlFromPublishableKey resolves to. Do NOT use
// frontend-api.clerk.services — it is a CNAME target with no TLS cert of its
// own and fails the handshake (SSL alert 40 / EPROTO).
const CLERK_FAPI_URL = process.env.CLERK_FAPI_URL || "https://clerk.pinnboxio.net";

const app: Express = express();
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(cors({ credentials: true, origin: true }));

// Proxy Clerk Frontend API using http-proxy-middleware
// This handles all request types (GET, POST with path params, etc.) reliably
app.use(
  "/api/__clerk",
  createProxyMiddleware({
    target: CLERK_FAPI_URL,
    changeOrigin: true,
    pathRewrite: {
      "^/api/__clerk": "",
    },
    on: {
      proxyReq: (proxyReq, req: Request) => {
        // Clerk identifies the instance from Clerk-Proxy-Url. It MUST exactly
        // match the Proxy URL registered in the Clerk Dashboard. Pin it via env
        // so it never drifts with the incoming Host header (www vs apex, Render
        // internal hostnames, etc.) — a mismatch makes Clerk reset the socket on
        // strict endpoints like prepare_verification while allowing sign_ups.
        const protocol = req.protocol || (req.secure ? "https" : "http");
        const host = req.get("host") || "localhost";
        const derived = `${protocol}://${host}/api/__clerk`;
        const proxyUrl = process.env.CLERK_PROXY_URL || derived;

        proxyReq.setHeader("Clerk-Proxy-Url", proxyUrl);
        proxyReq.setHeader("Clerk-Secret-Key", process.env.CLERK_SECRET_KEY || "");

        logger.info(
          { method: req.method, path: req.url, proxyUrl },
          "Clerk proxy → FAPI",
        );
      },
      proxyRes: (proxyRes, req: Request, res: Response) => {
        // Add CORS headers to proxy response
        res.setHeader("Access-Control-Allow-Origin", req.get("origin") || "*");
        res.setHeader("Access-Control-Allow-Credentials", "true");
      },
      error: (err: Error, req, res) => {
        // Surface the REAL underlying error (ECONNRESET / ETIMEDOUT / TLS / etc.)
        // instead of a generic 502, so we can diagnose the socket-level failure.
        const e = err as NodeJS.ErrnoException;
        logger.error(
          {
            message: e.message,
            code: e.code,
            syscall: e.syscall,
            errno: e.errno,
            method: (req as Request).method,
            url: (req as Request).url,
          },
          "Clerk proxy transport error",
        );
        const response = res as Response;
        if (typeof response.writeHead === "function" && !response.headersSent) {
          response.writeHead(502, { "Content-Type": "application/json" });
          response.end(
            JSON.stringify({ error: "Clerk proxy failed", code: e.code ?? null, message: e.message }),
          );
        }
      },
    },
    logLevel: "warn" as const,
    ws: false,
  }),
);

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

app.use(clerkMiddleware());

app.use("/api", router);

const frontendDir = path.resolve(__dirname, "../../unified-comms/dist/public");
app.use(express.static(frontendDir));

app.get("/health", (_req: Request, res: Response) => {
  res.send("OK");
});

app.use((_req: Request, res: Response) => {
  res.sendFile(path.join(frontendDir, "index.html"));
});

app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err, url: req.url, method: req.method }, "Unhandled route error");
  if (res.headersSent) {
    res.end();
    return;
  }
  res.status(500).json({ error: "Internal server error" });
});

export default app;
