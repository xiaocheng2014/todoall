import "dotenv/config";
import { db } from "../src/lib/db";

async function main() {
  const result = await db.$queryRawUnsafe<Array<{ journal_mode: string }>>(
    "PRAGMA journal_mode = WAL",
  );
  await db.$queryRawUnsafe("PRAGMA busy_timeout = 5000");

  if (result[0]?.journal_mode.toLowerCase() !== "wal") {
    throw new Error("SQLite WAL 模式未成功启用。");
  }

  console.log("SQLite 已启用 WAL 模式。");
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "配置 SQLite 失败");
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
