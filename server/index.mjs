import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvironment, startLocalServer } from "./app.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const isDev = process.argv.includes("--dev");
const port = Number(process.env.PORT || 5173);

loadEnvironment(root);

const localServer = await startLocalServer({ root, isDev, port });
console.log(`言构已启动：${localServer.url}`);

async function shutdown() {
  await localServer.close();
  process.exit(0);
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
