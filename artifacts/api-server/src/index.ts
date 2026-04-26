import app from "./app";
import { logger } from "./lib/logger";
import { whatsappService } from "./services/whatsapp";

// Prevent WhatsApp crypto errors and other transient library errors from
// crashing the whole server process. Log them and let the service reconnect.
process.on("uncaughtException", (err) => {
  const msg = err?.message ?? "";
  if (
    msg.includes("Unsupported state or unable to authenticate data") ||
    msg.includes("aesDecryptGCM") ||
    msg.includes("QR refs attempts ended") ||
    msg.includes("Connection was lost")
  ) {
    logger.warn({ err }, "WhatsApp transient error caught — server continues");
  } else {
    logger.error({ err }, "Uncaught exception — shutting down");
    process.exit(1);
  }
});

process.on("unhandledRejection", (reason) => {
  logger.warn({ reason }, "Unhandled promise rejection — continuing");
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

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  whatsappService.hasCredentials().then((found) => {
    if (found) {
      logger.info("WhatsApp credentials found — auto-connecting");
      whatsappService.connect().catch((e) => {
        logger.warn({ e }, "WhatsApp auto-connect failed");
      });
    }
  }).catch(() => {});
});
