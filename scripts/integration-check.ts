import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { db } from "../src/lib/db";
import { ensureDailyTasksForUser } from "../src/lib/daily-tasks";
import { getZonedDate } from "../src/lib/dates";
import { hashPassword } from "../src/lib/password";

process.env.BARK_ENCRYPTION_KEY ||= "todoall-integration-check-only";

async function main() {
  const marker = `integration-${randomUUID()}`;
  const passwordHash = await hashPassword("IntegrationOnly-123!");
  const now = new Date();
  const timezone = "Asia/Shanghai";
  const today = getZonedDate(now, timezone).date;
  const execution = new Date(now.getTime() + 60_000);
  const executionTime = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).format(execution);
  const { encryptSecret } = await import("../src/lib/secrets");
  const { runNotificationWorkerOnce } = await import("../src/lib/notification-worker");
  const encryptedEndpoint = encryptSecret("https://api.day.app/integration-test-key");
  assert.ok(!encryptedEndpoint.includes("integration-test-key"));

  const userA = await db.user.create({
    data: { loginName: marker, loginNameNormalized: marker, displayName: "集成测试甲", passwordHash, mustChangePassword: false, timezone },
  });
  const userB = await db.user.create({
    data: { loginName: `${marker}-b`, loginNameNormalized: `${marker}-b`, displayName: "集成测试乙", passwordHash, mustChangePassword: false, timezone },
  });
  try {
    const goal = await db.goal.create({ data: { userId: userA.id, name: "完成 1000 个", metricType: "COUNT", targetValue: 1000, unit: "个" } });
    const plan = await db.plan.create({
      data: {
        userId: userA.id, name: "俯卧撑", metricType: "COUNT", targetValue: 200, unit: "个",
        recurrenceType: "DAILY", startDate: today, executionTime, reminderOffsetMinutes: 1,
        goals: { create: { userId: userA.id, goalId: goal.id } },
      },
    });
    await ensureDailyTasksForUser(userA.id, timezone, now);
    await ensureDailyTasksForUser(userA.id, timezone, now);
    const tasks = await db.dailyTask.findMany({ where: { userId: userA.id, planId: plan.id, taskDate: today } });
    assert.equal(tasks.length, 1, "同一天重复生成必须保持幂等");
    assert.equal(await db.dailyTask.count({ where: { userId: userB.id } }), 0, "用户数据必须隔离");

    await db.$transaction([
      db.progressEntry.create({ data: { userId: userA.id, dailyTaskId: tasks[0].id, value: 20 } }),
      db.dailyTask.update({ where: { id: tasks[0].id }, data: { currentValue: 20, status: "IN_PROGRESS" } }),
    ]);
    await db.notificationSetting.create({
      data: {
        userId: userA.id, barkEnabled: true, barkEndpointEncrypted: encryptedEndpoint,
        dailySummaryEnabled: true, dailySummaryTime: "00:00", timedReminderEnabled: true, defaultOffsetMinutes: 1,
      },
    });

    const previousFetch = globalThis.fetch;
    let sent = 0;
    globalThis.fetch = (async () => {
      sent += 1;
      return new Response(JSON.stringify({ code: 200 }), { status: 200, headers: { "content-type": "application/json" } });
    }) as typeof fetch;
    try {
      await runNotificationWorkerOnce(now);
      await runNotificationWorkerOnce(now);
    } finally {
      globalThis.fetch = previousFetch;
    }
    assert.equal(sent, 2, "时间点提醒和每日汇总各发送一次，重复轮询不能重发");
    assert.equal(await db.notificationDelivery.count({ where: { userId: userA.id, status: "SENT" } }), 2);
    console.log("集成检查通过：任务生成、数据隔离、部分进度、加密通知和去重发送均正常。 ");
  } finally {
    await db.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } });
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
