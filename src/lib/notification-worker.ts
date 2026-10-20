import type { NotificationDelivery, NotificationSetting } from "@prisma/client";
import { sendBark, type BarkMessage } from "@/lib/bark";
import { ensureDailyTasksForUser } from "@/lib/daily-tasks";
import { db } from "@/lib/db";
import { decryptSecret } from "@/lib/secrets";
import { formatMetricValue } from "@/lib/metrics";

const finishedStatuses = ["COMPLETED", "EXCEEDED", "SKIPPED", "CANCELED"];

function zonedClock(instant: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.hour}:${values.minute}`;
}

async function createDelivery(data: {
  userId: string;
  dailyTaskId?: string;
  type: string;
  scheduledAt: Date;
  deduplicationKey: string;
  status?: string;
}): Promise<NotificationDelivery> {
  return db.notificationDelivery.upsert({
    where: { deduplicationKey: data.deduplicationKey },
    update: {},
    create: data,
  });
}

async function deliver(
  setting: NotificationSetting,
  delivery: NotificationDelivery,
  message: BarkMessage,
): Promise<void> {
  if (delivery.status === "SENT" || delivery.status === "CANCELED" || delivery.attemptCount >= 3) return;
  if (!setting.barkEndpointEncrypted) return;
  try {
    const endpoint = decryptSecret(setting.barkEndpointEncrypted);
    await sendBark(endpoint, message);
    await db.notificationDelivery.update({
      where: { id: delivery.id },
      data: { status: "SENT", sentAt: new Date(), attemptCount: { increment: 1 }, lastError: null },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 500) : "发送失败";
    await db.notificationDelivery.update({
      where: { id: delivery.id },
      data: { status: "FAILED", attemptCount: { increment: 1 }, lastError: message },
    });
  }
}

async function processTimedReminders(user: { id: string; timezone: string }, setting: NotificationSetting, date: string, now: Date) {
  if (!setting.timedReminderEnabled) return;
  const tasks = await db.dailyTask.findMany({
    where: { userId: user.id, taskDate: date, executionAt: { not: null } },
    include: { plan: { select: { reminderOffsetMinutes: true } } },
  });
  for (const task of tasks) {
    const executionAt = task.executionAt!;
    const offset = task.plan?.reminderOffsetMinutes ?? setting.defaultOffsetMinutes;
    const scheduledAt = new Date(executionAt.getTime() - offset * 60_000);
    if (now < scheduledAt) continue;
    const terminal = finishedStatuses.includes(task.status);
    const missed = now > executionAt;
    const delivery = await createDelivery({
      userId: user.id,
      dailyTaskId: task.id,
      type: "TIMED_TASK",
      scheduledAt,
      deduplicationKey: `timed:${task.id}:${executionAt.toISOString()}`,
      status: terminal || missed ? "CANCELED" : "PENDING",
    });
    if (!terminal && !missed) {
      await deliver(setting, delivery, {
        title: "任务即将开始",
        body: `${task.nameSnapshot} 将在 ${offset} 分钟后到达计划时间。`,
      });
    }
  }
}

async function processDailySummary(user: { id: string; timezone: string }, setting: NotificationSetting, date: string, now: Date) {
  if (!setting.dailySummaryEnabled || zonedClock(now, user.timezone) < setting.dailySummaryTime) return;
  const tasks = await db.dailyTask.findMany({
    where: { userId: user.id, taskDate: date },
    orderBy: { createdAt: "asc" },
  });
  const incomplete = tasks.filter((task) => !finishedStatuses.includes(task.status));
  const delivery = await createDelivery({
    userId: user.id,
    type: "DAILY_SUMMARY",
    scheduledAt: now,
    deduplicationKey: `summary:${user.id}:${date}`,
    status: incomplete.length ? "PENDING" : "CANCELED",
  });
  if (!incomplete.length) return;
  const names = incomplete.slice(0, 5).map((task) => `${task.nameSnapshot}（${formatMetricValue(task.metricTypeSnapshot, task.currentValue, task.unitSnapshot)}/${formatMetricValue(task.metricTypeSnapshot, task.targetValueSnapshot, task.unitSnapshot)}）`).join("、");
  const remaining = incomplete.length > 5 ? `，另有 ${incomplete.length - 5} 项` : "";
  await deliver(setting, delivery, {
    title: `今天还有 ${incomplete.length} 项未完成`,
    body: `${names}${remaining}`,
  });
}

export async function runNotificationWorkerOnce(now = new Date()): Promise<void> {
  const users = await db.user.findMany({
    where: { status: "ACTIVE" },
    include: { notificationSetting: true },
  });

  for (const user of users) {
    const setting = user.notificationSetting;
    try {
      const date = await ensureDailyTasksForUser(user.id, user.timezone, now);
      await db.dailyTask.updateMany({
        where: { userId: user.id, taskDate: { lt: date }, status: { in: ["PENDING", "IN_PROGRESS"] } },
        data: { status: "MISSED" },
      });
      if (!setting?.barkEnabled || !setting.barkEndpointEncrypted) continue;
      await processTimedReminders(user, setting, date, now);
      await processDailySummary(user, setting, date, now);
    } catch (error) {
      console.error(`通知任务处理失败 user=${user.id}:`, error instanceof Error ? error.message : "未知错误");
    }
  }

  await db.loginAttempt.deleteMany({
    where: { attemptedAt: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } },
  });
}
