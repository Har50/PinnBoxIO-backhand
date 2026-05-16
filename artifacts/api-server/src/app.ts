import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { CLERK_PROXY_PATH, clerkProxyMiddleware } from "./middlewares/clerkProxyMiddleware";
import router from "./routes";
import { logger } from "./lib/logger";
import fs from "fs";
import path from "path";

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

app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

app.use(cors({ credentials: true, origin: true }));
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

app.use(clerkMiddleware());

const landingPagePath = path.resolve(__dirname, "..", "server", "templates", "landing-page.html");
const landingPageTemplate = fs.readFileSync(landingPagePath, "utf-8");

app.get("/", (_req: Request, res: Response) => {
  const html = landingPageTemplate
    .replace(/BASE_URL_PLACEHOLDER/g, "https://pinnboxio.net")
    .replace(/APP_NAME_PLACEHOLDER/g, "PinnboxIO");
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});

app.use("/api", router);

app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err, url: req.url, method: req.method }, "Unhandled route error");
  if (res.headersSent) {
    res.end();
    return;
  }
  res.status(500).json({ error: "Internal server error" });
});

export default app;
