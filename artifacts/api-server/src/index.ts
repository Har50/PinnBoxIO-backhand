import app from "./app";
import { logger } from "./lib/logger";
import { syncClerkEmailsOnStartup } from "./services/startupSync";

process.on("unhandledRejection", (reason) => {
  logger.warn({ reason }, "Unhandled promise rejection — continuing");
});

process.on("uncaughtException", (err) => {
  logger.error({ err }, "Uncaught exception — continuing");
});

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // Run email sync after a short delay to let the DB connection warm up.
  // This fixes any Clerk users missing emails and migrates their mobile
  // sessions so web and mobile data are shared immediately on every deploy.
  setTimeout(() => {
    syncClerkEmailsOnStartup().catch((e) =>
      logger.warn({ err: String(e) }, "Startup email sync threw unexpectedly")
    );
  }, 3000);
});

function shutdown(signal: string) {
  logger.info({ signal }, "Received signal — starting graceful shutdown");
  server.close(() => {
    logger.info("HTTP server closed — exiting");
    process.exit(0);
  });

  // Force-exit after 10 s if connections don't drain in time
  setTimeout(() => {
    logger.warn("Graceful shutdown timed out — forcing exit");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
