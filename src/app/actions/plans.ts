"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addDays, getZonedDate } from "@/lib/dates";
import { db } from "@/lib/db";
import { ensureDailyTasksForUser } from "@/lib/daily-tasks";
import { canDeletePlan } from "@/lib/deletion";
import {
  isMetricType,
  normalizeMetricTarget,
} from "@/lib/metrics";
import { isPlanScheduledOnDate, isRecurrenceType } from "@/lib/recurrence";
import { requireUser } from "@/lib/session";

export type PlanActionState = {
  error: string | null;
};

const allowedStatuses = ["ACTIVE", "PAUSED", "ENDED"];

function validDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function createPlanAction(
  _previousState: PlanActionState,
  formData: FormData,
): Promise<PlanActionState> {
  const current = await requireUser();
  const user = current.session.user;
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const metricType = String(formData.get("metricType") ?? "");
  const recurrenceType = String(formData.get("recurrenceType") ?? "");
  const startDate = String(formData.get("startDate") ?? "");
  let endDate = String(formData.get("endDate") ?? "");
  const executionTime = String(formData.get("executionTime") ?? "");

  if (!name || name.length > 80) {
    return { error: "计划名称不能为空且不能超过 80 个字符" };
  }

  if (!isMetricType(metricType)) {
    return { error: "请选择有效的计量方式" };
  }

  const normalized = normalizeMetricTarget(
    metricType,
    String(formData.get("targetValue") ?? ""),
    String(formData.get("unit") ?? ""),
  );
  if ("error" in normalized) return { error: normalized.error };

  if (!isRecurrenceType(recurrenceType)) {
    return { error: "请选择有效的重复规则" };
  }

  if (!validDate(startDate)) {
    return { error: "请选择开始日期" };
  }

  if (endDate && (!validDate(endDate) || endDate < startDate)) {
    return { error: "结束日期不能早于开始日期" };
  }

  let weekdays: string | null = null;
  let durationDays: number | null = null;

  if (recurrenceType === "ONCE") {
    endDate = startDate;
  }

  if (recurrenceType === "WEEKLY") {
    const selectedWeekdays = formData
      .getAll("weekdays")
      .map(Number)
      .filter((day) => Number.isInteger(day) && day >= 1 && day <= 7);
    if (selectedWeekdays.length === 0) {
      return { error: "每周计划至少选择一个星期" };
    }
    weekdays = JSON.stringify([...new Set(selectedWeekdays)].sort());
  }

  if (recurrenceType === "CONSECUTIVE") {
    durationDays = Number(formData.get("durationDays") ?? 0);
    if (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 3650) {
      return { error: "连续天数需要在 1～3650 天之间" };
    }
    endDate = addDays(startDate, durationDays - 1);
  }

  if (executionTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(executionTime)) {
    return { error: "执行时间格式不正确" };
  }

  const goalIds = [...new Set(formData.getAll("goalIds").map(String))];
  const ownedGoals = goalIds.length
    ? await db.goal.findMany({
        where: { id: { in: goalIds }, userId: user.id },
        select: { id: true },
      })
    : [];

  if (ownedGoals.length !== goalIds.length) {
    return { error: "关联目标不存在或不属于当前用户" };
  }

  await db.plan.create({
    data: {
      userId: user.id,
      name,
      description: description || null,
      metricType,
      targetValue: normalized.targetValue,
      unit: normalized.unit,
      recurrenceType,
      startDate,
      endDate: endDate || null,
      weekdays,
      durationDays,
      executionTime: executionTime || null,
      reminderOffsetMinutes: null,
      goals: {
        create: ownedGoals.map((goal) => ({
          userId: user.id,
          goalId: goal.id,
        })),
      },
    },
  });

  const today = getZonedDate(new Date(), user.timezone).date;
  if (startDate <= today && (!endDate || endDate >= today)) {
    await ensureDailyTasksForUser(user.id, user.timezone);
  }

  revalidatePath("/plans");
  revalidatePath("/today");
  revalidatePath("/goals");
  redirect("/plans");
}

export async function setPlanStatusAction(formData: FormData): Promise<void> {
  const current = await requireUser();
  const planId = String(formData.get("planId") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!planId || !allowedStatuses.includes(status)) return;

  const updated = await db.plan.updateMany({
    where: { id: planId, userId: current.session.user.id },
    data: { status },
  });

  if (updated.count) {
    const user = current.session.user;
    const todayInfo = getZonedDate(new Date(), user.timezone);
    const today = todayInfo.date;
    if (status === "PAUSED" || status === "ENDED") {
      await db.dailyTask.updateMany({
        where: { planId, userId: user.id, taskDate: today, status: { in: ["PENDING", "IN_PROGRESS"] } },
        data: { status: "CANCELED" },
      });
    } else if (status === "ACTIVE") {
      const plan = await db.plan.findUnique({ where: { id: planId } });
      const appliesToday = plan ? isPlanScheduledOnDate(plan, today, todayInfo.weekday) : false;
      const canceledTask = appliesToday ? await db.dailyTask.findFirst({
        where: { planId, userId: user.id, taskDate: today, status: "CANCELED" },
      }) : null;
      if (canceledTask) {
        await db.dailyTask.update({
          where: { id: canceledTask.id },
          data: { status: canceledTask.currentValue > 0 ? "IN_PROGRESS" : "PENDING" },
        });
      }
      await ensureDailyTasksForUser(user.id, user.timezone);
    }
  }

  revalidatePath("/plans");
  revalidatePath("/today");
}

export async function deletePlanAction(formData: FormData): Promise<void> {
  const current = await requireUser();
  const planId = String(formData.get("planId") ?? "");

  if (!planId) return;

  const plan = await db.plan.findFirst({
    where: { id: planId, userId: current.session.user.id },
    select: { status: true },
  });

  if (!plan || !canDeletePlan(plan.status)) return;

  await db.plan.deleteMany({
    where: {
      id: planId,
      userId: current.session.user.id,
      status: "ENDED",
    },
  });

  revalidatePath("/plans");
  revalidatePath("/goals");
  revalidatePath("/today");
  revalidatePath("/history");
}

export async function updatePlanAction(
  _previousState: PlanActionState,
  formData: FormData,
): Promise<PlanActionState> {
  const current = await requireUser();
  const user = current.session.user;
  const planId = String(formData.get("planId") ?? "");
  const existing = await db.plan.findFirst({ where: { id: planId, userId: user.id } });
  if (!existing) return { error: "计划不存在" };

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const metricType = String(formData.get("metricType") ?? "");
  const recurrenceType = String(formData.get("recurrenceType") ?? "");
  const startDate = String(formData.get("startDate") ?? "");
  let endDate = String(formData.get("endDate") ?? "");
  const executionTime = String(formData.get("executionTime") ?? "");
  const reminderOffsetInput = String(formData.get("reminderOffsetMinutes") ?? "").trim();
  const reminderOffsetMinutes = executionTime && reminderOffsetInput ? Number(reminderOffsetInput) : null;

  if (!name || name.length > 80) return { error: "计划名称不能为空且不能超过 80 个字符" };
  if (!isMetricType(metricType)) return { error: "请选择有效的计量方式" };
  const normalized = normalizeMetricTarget(metricType, String(formData.get("targetValue") ?? ""), String(formData.get("unit") ?? ""));
  if ("error" in normalized) return { error: normalized.error };
  if (!isRecurrenceType(recurrenceType)) return { error: "请选择有效的重复规则" };
  if (!validDate(startDate)) return { error: "请选择开始日期" };
  if (endDate && (!validDate(endDate) || endDate < startDate)) return { error: "结束日期不能早于开始日期" };
  if (executionTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(executionTime)) return { error: "执行时间格式不正确" };
  if (reminderOffsetMinutes !== null && (!Number.isInteger(reminderOffsetMinutes) || reminderOffsetMinutes < 1 || reminderOffsetMinutes > 1440)) {
    return { error: "提前提醒时间需要在 1～1440 分钟之间" };
  }

  let weekdays: string | null = null;
  let durationDays: number | null = null;
  if (recurrenceType === "ONCE") endDate = startDate;
  if (recurrenceType === "WEEKLY") {
    const selected = [...new Set(formData.getAll("weekdays").map(Number).filter((day) => Number.isInteger(day) && day >= 1 && day <= 7))].sort();
    if (!selected.length) return { error: "每周计划至少选择一个星期" };
    weekdays = JSON.stringify(selected);
  }
  if (recurrenceType === "CONSECUTIVE") {
    durationDays = Number(formData.get("durationDays") ?? 0);
    if (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 3650) return { error: "连续天数需要在 1～3650 天之间" };
    endDate = addDays(startDate, durationDays - 1);
  }

  const goalIds = [...new Set(formData.getAll("goalIds").map(String))];
  const ownedGoals = goalIds.length ? await db.goal.findMany({ where: { id: { in: goalIds }, userId: user.id }, select: { id: true } }) : [];
  if (ownedGoals.length !== goalIds.length) return { error: "关联目标不存在或不属于当前用户" };

  const today = getZonedDate(new Date(), user.timezone);
  const updatedPlan = {
    recurrenceType, startDate, endDate: endDate || null, weekdays, durationDays,
  };
  const appliesToday = isPlanScheduledOnDate(updatedPlan, today.date, today.weekday);

  await db.$transaction(async (transaction) => {
    await transaction.plan.update({
      where: { id: existing.id },
      data: {
        name, description: description || null, metricType,
        targetValue: normalized.targetValue, unit: normalized.unit,
        recurrenceType, startDate, endDate: endDate || null, weekdays, durationDays,
        executionTime: executionTime || null, reminderOffsetMinutes,
      },
    });
    await transaction.planGoal.deleteMany({ where: { planId: existing.id } });
    if (ownedGoals.length) {
      await transaction.planGoal.createMany({ data: ownedGoals.map((goal) => ({ userId: user.id, planId: existing.id, goalId: goal.id })) });
    }
    await transaction.dailyTask.deleteMany({ where: { planId: existing.id, taskDate: { gt: today.date } } });
    const untouchedToday = await transaction.dailyTask.findFirst({
      where: { planId: existing.id, taskDate: today.date, status: "PENDING", currentValue: 0 },
    });
    if (untouchedToday && !appliesToday) await transaction.dailyTask.delete({ where: { id: untouchedToday.id } });
    else if (untouchedToday && appliesToday) {
      await transaction.dailyTask.update({
        where: { id: untouchedToday.id },
        data: {
          nameSnapshot: name, metricTypeSnapshot: metricType,
          targetValueSnapshot: normalized.targetValue, unitSnapshot: normalized.unit,
          executionAt: executionTime ? (await import("@/lib/dates")).zonedDateTimeToUtc(today.date, executionTime, user.timezone) : null,
        },
      });
    }
  });
  if (appliesToday && existing.status === "ACTIVE") await ensureDailyTasksForUser(user.id, user.timezone);
  revalidatePath("/plans");
  revalidatePath("/today");
  revalidatePath("/goals");
  redirect("/plans");
}
