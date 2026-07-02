import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import path from "node:path";
import { Readable } from "node:stream";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import router from "./routes";
import { logger } from "./lib/logger";

const CLERK_FAPI_URL = "https://frontend-api.clerk.services";

// Headers to strip per RFC 9113 (hop-by-hop) and Clerk proxy logic
const HOP_BY_HOP = new Set([
  "connection", "keep-alive", "proxy-authenticate", "proxy-authorization",
  "te", "trailer", "transfer-encoding", "upgrade",
]);

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

// Custom proxy for Clerk Frontend API — buffers the body to avoid
// Node.js Readable.toWeb() streaming issues with POST requests containing path params
app.use("/api/__clerk", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const buffers: Buffer[] = [];
    for await (const chunk of req) {
      buffers.push(chunk);
    }
    const rawBody = Buffer.concat(buffers);

    const protocol = req.protocol || (req.secure ? "https" : "http");
    const host = req.get("host") || "localhost";
    const publicOrigin = `${protocol}://${host}`;
    const proxyPath = "/api/__clerk";

    // Build target FAPI URL
    const targetPath = req.path.slice(proxyPath.length) || "/";
    const targetUrl = new URL(`${CLERK_FAPI_URL}${targetPath}`);
    targetUrl.search = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";

    // Forward headers, stripping hop-by-hop and adding Clerk-specific ones
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      const lower = key.toLowerCase();
      if (HOP_BY_HOP.has(lower)) continue;
      if (value) {
        headers.set(key, Array.isArray(value) ? value.join(", ") : value);
      }
    }
    headers.set("Clerk-Proxy-Url", `${publicOrigin}${proxyPath}`);
    headers.set("Clerk-Secret-Key", process.env.CLERK_SECRET_KEY || "");
    headers.set("Host", new URL(CLERK_FAPI_URL).host);
    headers.set("Accept-Encoding", "identity");
    if (!headers.has("X-Forwarded-Host")) headers.set("X-Forwarded-Host", host);
    if (!headers.has("X-Forwarded-Proto")) headers.set("X-Forwarded-Proto", protocol.replace(":", ""));

    const hasBody = ["POST", "PUT", "PATCH"].includes(req.method);
    const response = await fetch(targetUrl.toString(), {
      method: req.method,
      headers,
      body: hasBody ? rawBody : void 0,
      redirect: "manual",
      ...(hasBody ? { duplex: "half" as const } : {}),
    });

    // Rewrite Location headers from FAPI host back to proxy URL
    const fapiHost = new URL(CLERK_FAPI_URL).host;
    res.status(response.status);
    for (const [key, value] of response.headers) {
      const lower = key.toLowerCase();
      if (HOP_BY_HOP.has(lower)) continue;
      if (lower === "content-encoding" || lower === "content-length") continue;
      if (lower === "set-cookie") {
        res.appendHeader(key, value);
      } else if (lower === "location") {
        try {
          const locUrl = new URL(value, CLERK_FAPI_URL);
          if (locUrl.host === fapiHost) {
            res.setHeader(key, `${publicOrigin}${proxyPath}${locUrl.pathname}${locUrl.search}${locUrl.hash}`);
          } else {
            res.setHeader(key, value);
          }
        } catch {
          res.setHeader(key, value);
        }
      } else {
        res.setHeader(key, value);
      }
    }

    if (response.body) {
      const reader = response.body.getReader();
      const stream = new Readable({
        async read() {
          const { done, value } = await reader.read();
          if (done) {
            this.push(null);
          } else {
            this.push(Buffer.from(value));
          }
        },
      });
      stream.pipe(res);
    } else {
      res.end();
    }
  } catch (err) {
    next(err);
  }
});

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
