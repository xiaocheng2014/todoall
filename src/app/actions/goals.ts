"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { canDeleteGoal } from "@/lib/deletion";
import {
  isMetricType,
  normalizeMetricTarget,
  type MetricType,
} from "@/lib/metrics";
import { requireUser } from "@/lib/session";

export type GoalActionState = {
  error: string | null;
  success: string | null;
};

const emptyState: GoalActionState = { error: null, success: null };
const allowedStatuses = ["ACTIVE", "PAUSED", "COMPLETED", "ABANDONED"];

export async function createGoalAction(
  _previousState: GoalActionState,
  formData: FormData,
): Promise<GoalActionState> {
  const current = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const startDate = String(formData.get("startDate") ?? "");
  const dueDate = String(formData.get("dueDate") ?? "");
  const metricTypeValue = String(formData.get("metricType") ?? "");

  if (!name || name.length > 80) {
    return { ...emptyState, error: "目标名称不能为空且不能超过 80 个字符" };
  }

  if (startDate && dueDate && dueDate < startDate) {
    return { ...emptyState, error: "截止日期不能早于开始日期" };
  }

  let metricType: MetricType | null = null;
  let targetValue: number | null = null;
  let unit: string | null = null;

  if (metricTypeValue) {
    if (!isMetricType(metricTypeValue) || metricTypeValue === "CHECK") {
      return { ...emptyState, error: "请选择有效的数值目标类型" };
    }

    metricType = metricTypeValue;
    const rawTargetValue = String(formData.get("targetValue") ?? "");
    const normalized = normalizeMetricTarget(
      metricType,
      metricType === "DURATION"
        ? String(Number(rawTargetValue) * 60)
        : rawTargetValue,
      String(formData.get("unit") ?? ""),
    );

    if ("error" in normalized) {
      return { ...emptyState, error: normalized.error };
    }

    targetValue = normalized.targetValue;
    unit = normalized.unit;
  }

  await db.goal.create({
    data: {
      userId: current.session.user.id,
      name,
      description: description || null,
      startDate: startDate || null,
      dueDate: dueDate || null,
      metricType,
      targetValue,
      unit,
    },
  });

  revalidatePath("/goals");
  revalidatePath("/plans/new");
  return { ...emptyState, success: `目标“${name}”已创建` };
}

export async function setGoalStatusAction(formData: FormData): Promise<void> {
  const current = await requireUser();
  const goalId = String(formData.get("goalId") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!goalId || !allowedStatuses.includes(status)) return;

  await db.goal.updateMany({
    where: { id: goalId, userId: current.session.user.id },
    data: {
      status,
      completedAt: status === "COMPLETED" ? new Date() : null,
    },
  });

  revalidatePath("/goals");
}

export async function deleteGoalAction(formData: FormData): Promise<void> {
  const current = await requireUser();
  const goalId = String(formData.get("goalId") ?? "");

  if (!goalId) return;

  const goal = await db.goal.findFirst({
    where: { id: goalId, userId: current.session.user.id },
    select: { status: true },
  });

  if (!goal || !canDeleteGoal(goal.status)) return;

  await db.goal.deleteMany({
    where: {
      id: goalId,
      userId: current.session.user.id,
      status: { in: ["COMPLETED", "ABANDONED"] },
    },
  });

  revalidatePath("/goals");
  revalidatePath("/plans");
  revalidatePath("/plans/new");
}

export async function updateGoalAction(
  _previousState: GoalActionState,
  formData: FormData,
): Promise<GoalActionState> {
  const current = await requireUser();
  const goalId = String(formData.get("goalId") ?? "");
  const goal = await db.goal.findFirst({ where: { id: goalId, userId: current.session.user.id } });
  if (!goal) return { ...emptyState, error: "目标不存在" };

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const startDate = String(formData.get("startDate") ?? "");
  const dueDate = String(formData.get("dueDate") ?? "");
  const metricTypeValue = String(formData.get("metricType") ?? "");
  if (!name || name.length > 80) return { ...emptyState, error: "目标名称不能为空且不能超过 80 个字符" };
  if (startDate && dueDate && dueDate < startDate) return { ...emptyState, error: "截止日期不能早于开始日期" };

  let metricType: MetricType | null = null;
  let targetValue: number | null = null;
  let unit: string | null = null;
  if (metricTypeValue) {
    if (!isMetricType(metricTypeValue) || metricTypeValue === "CHECK") return { ...emptyState, error: "请选择有效的数值目标类型" };
    metricType = metricTypeValue;
    const rawTargetValue = String(formData.get("targetValue") ?? "");
    const normalized = normalizeMetricTarget(metricType, metricType === "DURATION" ? String(Number(rawTargetValue) * 60) : rawTargetValue, String(formData.get("unit") ?? ""));
    if ("error" in normalized) return { ...emptyState, error: normalized.error };
    targetValue = normalized.targetValue;
    unit = normalized.unit;
  }
  await db.goal.update({
    where: { id: goal.id },
    data: { name, description: description || null, startDate: startDate || null, dueDate: dueDate || null, metricType, targetValue, unit },
  });
  revalidatePath("/goals");
  return { ...emptyState, success: "目标已更新" };
}
