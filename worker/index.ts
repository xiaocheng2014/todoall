import "dotenv/config";
import { db } from "../src/lib/db";
import { runNotificationWorkerOnce } from "../src/lib/notification-worker";

const once = process.argv.includes("--once");
let stopping = false;

async function run() {
  do {
    await runNotificationWorkerOnce();
    if (once || stopping) break;
    await new Promise((resolve) => setTimeout(resolve, 30_000));
  } while (!stopping);
}

process.on("SIGINT", () => { stopping = true; });
process.on("SIGTERM", () => { stopping = true; });

run()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "通知进程异常退出");
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
