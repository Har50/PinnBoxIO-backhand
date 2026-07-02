import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import path from "node:path";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { createProxyMiddleware } from "http-proxy-middleware";
import router from "./routes";
import { logger } from "./lib/logger";

const CLERK_FAPI_URL = "https://frontend-api.clerk.services";

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
        // Add Clerk-specific headers that Clerk FAPI expects
        const protocol = req.protocol || (req.secure ? "https" : "http");
        const host = req.get("host") || "localhost";
        const publicOrigin = `${protocol}://${host}`;

        proxyReq.setHeader("Clerk-Proxy-Url", `${publicOrigin}/api/__clerk`);
        proxyReq.setHeader("Clerk-Secret-Key", process.env.CLERK_SECRET_KEY || "");

        // Remove content-length to let http-proxy-middleware handle it
        proxyReq.removeHeader("content-length");
      },
      proxyRes: (proxyRes, req: Request, res: Response) => {
        // Add CORS headers to proxy response
        res.setHeader("Access-Control-Allow-Origin", req.get("origin") || "*");
        res.setHeader("Access-Control-Allow-Credentials", "true");
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
