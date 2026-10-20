"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { normalizeProgressInput } from "@/lib/metrics";
import { requireUser } from "@/lib/session";

export type TaskActionState = {
  error: string | null;
};

export async function recordTaskProgressAction(
  _previousState: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  const current = await requireUser();
  const taskId = String(formData.get("taskId") ?? "");
  const rawValue = String(formData.get("value") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  if (note.length > 200) return { error: "备注不能超过 200 个字符" };

  const task = await db.dailyTask.findFirst({
    where: { id: taskId, userId: current.session.user.id },
  });

  if (
    !task ||
    ["SKIPPED", "CANCELED", "COMPLETED", "EXCEEDED"].includes(task.status)
  ) {
    return { error: "任务不存在或当前不能记录" };
  }

  const value = normalizeProgressInput(task.metricTypeSnapshot, rawValue);
  if (!value) {
    return {
      error:
        task.metricTypeSnapshot === "DURATION"
          ? "请输入大于 0 的分钟数"
          : task.metricTypeSnapshot === "DISTANCE"
            ? "请输入大于 0 的公里数"
            : "请输入大于 0 的整数",
    };
  }

  await db.$transaction(async (transaction) => {
    const latestTask = await transaction.dailyTask.findFirst({
      where: { id: taskId, userId: current.session.user.id },
    });
    if (
      !latestTask ||
      ["SKIPPED", "CANCELED", "COMPLETED", "EXCEEDED"].includes(
        latestTask.status,
      )
    ) {
      return;
    }

    const nextValue = latestTask.currentValue + value;
    const completed = nextValue >= latestTask.targetValueSnapshot;

    await transaction.progressEntry.create({
      data: {
        userId: current.session.user.id,
        dailyTaskId: latestTask.id,
        value,
        note: note || null,
        source: latestTask.metricTypeSnapshot === "CHECK" ? "CHECK" : "MANUAL",
      },
    });
    await transaction.dailyTask.update({
      where: { id: latestTask.id },
      data: {
        currentValue: nextValue,
        status: completed
          ? nextValue > latestTask.targetValueSnapshot
            ? "EXCEEDED"
            : "COMPLETED"
          : "IN_PROGRESS",
        completedAt: completed ? new Date() : null,
        skippedAt: null,
      },
    });
  });

  revalidatePath("/today");
  revalidatePath("/goals");
  revalidatePath("/history");
  return { error: null };
}

export async function skipTaskAction(formData: FormData): Promise<void> {
  const current = await requireUser();
  const taskId = String(formData.get("taskId") ?? "");

  await db.dailyTask.updateMany({
    where: {
      id: taskId,
      userId: current.session.user.id,
      status: { in: ["PENDING", "IN_PROGRESS"] },
    },
    data: { status: "SKIPPED", skippedAt: new Date(), completedAt: null },
  });

  revalidatePath("/today");
  revalidatePath("/history");
}
