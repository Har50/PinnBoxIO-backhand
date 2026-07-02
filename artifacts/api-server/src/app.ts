import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import path from "node:path";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import router from "./routes";
import { logger } from "./lib/logger";
import { clerkProxyMiddleware, CLERK_PROXY_PATH } from "./middlewares/clerkProxyMiddleware";

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

app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

app.use(clerkMiddleware());

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

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
