import "dotenv/config";
import { mkdir, open } from "node:fs/promises";
import { dirname, resolve } from "node:path";

async function main() {
  const databaseUrl = process.env.DATABASE_URL ?? "file:../data/todoall.db";

  if (!databaseUrl.startsWith("file:")) {
    throw new Error("TodoAll 第一版只支持 file: 格式的 SQLite DATABASE_URL。");
  }

  const databasePath = resolve(
    process.cwd(),
    "prisma",
    databaseUrl.slice("file:".length),
  );

  await mkdir(dirname(databasePath), { recursive: true });
  const handle = await open(databasePath, "a");
  await handle.close();
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "准备数据库文件失败");
  process.exitCode = 1;
});
