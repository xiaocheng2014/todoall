import "dotenv/config";
import { db } from "../src/lib/db";
import { hashPassword, validatePassword } from "../src/lib/password";

async function main() {
  const loginName = process.env.ADMIN_LOGIN?.trim();
  const displayName = process.env.ADMIN_NAME?.trim();
  const password = process.env.ADMIN_PASSWORD ?? "";

  if (!loginName || !displayName || !password) {
    throw new Error(
      "请通过 ADMIN_LOGIN、ADMIN_NAME、ADMIN_PASSWORD 环境变量提供管理员信息。",
    );
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    throw new Error(passwordError);
  }

  const loginNameNormalized = loginName.toLocaleLowerCase("zh-CN");
  const existingUser = await db.user.findUnique({
    where: { loginNameNormalized },
  });

  if (existingUser) {
    throw new Error(`登录账号 ${loginName} 已存在。`);
  }

  const user = await db.user.create({
    data: {
      loginName,
      loginNameNormalized,
      displayName,
      passwordHash: await hashPassword(password),
      role: "ADMIN",
      mustChangePassword: true,
      notificationSetting: { create: {} },
    },
  });

  console.log(`管理员 ${user.loginName} 已创建，首次登录时必须修改密码。`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "创建管理员失败");
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
