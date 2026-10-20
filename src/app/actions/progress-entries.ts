"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { normalizeProgressInput } from "@/lib/metrics";
import { requireUser } from "@/lib/session";

export type ProgressEntryActionState = { error: string | null; success: string | null };

async function recalculateTask(
  transaction: Prisma.TransactionClient,
  taskId: string,
) {
  const task = await transaction.dailyTask.findUniqueOrThrow({ where: { id: taskId } });
  const aggregate = await transaction.progressEntry.aggregate({
    where: { dailyTaskId: taskId },
    _sum: { value: true },
    _count: true,
  });
  const currentValue = aggregate._sum.value ?? 0;
  const completed = currentValue >= task.targetValueSnapshot;
  const status =
    task.status === "SKIPPED"
      ? "SKIPPED"
      : aggregate._count === 0
        ? "PENDING"
        : completed
          ? currentValue > task.targetValueSnapshot
            ? "EXCEEDED"
            : "COMPLETED"
          : "IN_PROGRESS";

  await transaction.dailyTask.update({
    where: { id: taskId },
    data: {
      currentValue,
      status,
      completedAt: completed && status !== "SKIPPED" ? task.completedAt ?? new Date() : null,
    },
  });
}

function revalidateHistory(date: string) {
  revalidatePath("/today");
  revalidatePath("/history");
  revalidatePath(`/history/${date}`);
  revalidatePath("/goals");
}

export async function updateProgressEntryAction(
  _previousState: ProgressEntryActionState,
  formData: FormData,
): Promise<ProgressEntryActionState> {
  const current = await requireUser();
  const entryId = String(formData.get("entryId") ?? "");
  const entry = await db.progressEntry.findFirst({
    where: { id: entryId, userId: current.session.user.id },
    include: { dailyTask: true },
  });
  if (!entry) return { error: "执行记录不存在", success: null };
  const note = String(formData.get("note") ?? "").trim();
  if (note.length > 200) return { error: "备注不能超过 200 个字符", success: null };

  const value = normalizeProgressInput(
    entry.dailyTask.metricTypeSnapshot,
    String(formData.get("value") ?? ""),
  );
  if (!value) return { error: "请输入有效的完成量", success: null };

  await db.$transaction(async (transaction) => {
    await transaction.progressEntry.update({
      where: { id: entry.id },
      data: { value, note: note || null },
    });
    await recalculateTask(transaction, entry.dailyTaskId);
  });

  revalidateHistory(entry.dailyTask.taskDate);
  return { error: null, success: "记录已更新" };
}

export async function deleteProgressEntryAction(formData: FormData): Promise<void> {
  const current = await requireUser();
  const entryId = String(formData.get("entryId") ?? "");
  const entry = await db.progressEntry.findFirst({
    where: { id: entryId, userId: current.session.user.id },
    include: { dailyTask: { select: { taskDate: true } } },
  });
  if (!entry) return;

  await db.$transaction(async (transaction) => {
    await transaction.progressEntry.delete({ where: { id: entry.id } });
    await recalculateTask(transaction, entry.dailyTaskId);
  });
  revalidateHistory(entry.dailyTask.taskDate);
}

export async function unskipTaskAction(formData: FormData): Promise<void> {
  const current = await requireUser();
  const taskId = String(formData.get("taskId") ?? "");
  const task = await db.dailyTask.findFirst({
    where: { id: taskId, userId: current.session.user.id, status: "SKIPPED" },
  });
  if (!task) return;

  await db.dailyTask.update({
    where: { id: task.id },
    data: {
      status: task.currentValue > 0 ? "IN_PROGRESS" : "PENDING",
      skippedAt: null,
    },
  });
  revalidateHistory(task.taskDate);
}
