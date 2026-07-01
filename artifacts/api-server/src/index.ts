import { logger } from "./lib/logger";

console.log("DIAGNOSTIC_BUILD_470a48c");

process.on("unhandledRejection", (reason) => {
  logger.warn({ reason }, "Unhandled promise rejection — continuing");
});

process.on("uncaughtException", (err) => {
  logger.error({ err }, "Uncaught exception — continuing");
});

const rawPort = process.env["PORT"];

if (!rawPort) {
  logger.error("PORT environment variable is required but was not provided.");
  process.exit(1);
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  logger.error({ rawPort: String(rawPort) }, "Invalid PORT value");
  process.exit(1);
}

// Dynamic import ensures error handlers are active before any module evaluation.
import("./app").then(({ default: app }) => {
  import("./services/startupSync").then(({ syncClerkEmailsOnStartup }) => {
    const server = app.listen(port, (err) => {
      if (err) {
        logger.error({ err }, "Error listening on port");
        process.exit(1);
      }

      logger.info({ port }, "Server listening");

      setTimeout(() => {
        syncClerkEmailsOnStartup().catch((e: unknown) =>
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

      setTimeout(() => {
        logger.warn("Graceful shutdown timed out — forcing exit");
        process.exit(1);
      }, 10_000).unref();
    }

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  });
}).catch((err) => {
  logger.error({ err }, "Failed to start server — module import error");
  process.exit(1);
});
