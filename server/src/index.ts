import app from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env.PORT ?? "3001";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Bind all interfaces so physical devices on the LAN can reach the API.
app.listen(port, "0.0.0.0", () => {
  logger.info({ port }, "Server listening");
});
