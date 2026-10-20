import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteProgressEntryAction, unskipTaskAction } from "@/app/actions/progress-entries";
import { EditProgressEntryForm } from "@/components/history/edit-progress-entry-form";
import { db } from "@/lib/db";
import { formatMetricValue, storedValueToInput } from "@/lib/metrics";
import { requireUser } from "@/lib/session";

export const metadata = { title: "执行明细" };

export default async function HistoryDetailPage({ params }: { params: Promise<{ date: string }> }) {
  const current = await requireUser();
  const { date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) notFound();

  const tasks = await db.dailyTask.findMany({
    where: { userId: current.session.user.id, taskDate: date },
    include: { progressEntries: { orderBy: { recordedAt: "asc" } } },
    orderBy: [{ executionAt: "asc" }, { createdAt: "asc" }],
  });
  const dateLabel = new Intl.DateTimeFormat("zh-CN", { dateStyle: "full", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));

  return (
    <main className="px-5 pb-8 pt-8 sm:px-8">
      <Link className="text-sm font-bold text-emerald-700" href="/history">← 返回历史</Link>
      <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900">{dateLabel}</h1>
      <p className="mt-2 text-slate-500">可以修正或删除手工执行记录，任务状态会自动重算。</p>

      <section className="mt-7 space-y-4">
        {tasks.length === 0 ? <div className="rounded-[1.5rem] border border-dashed border-slate-300 px-5 py-12 text-center text-slate-500">这一天没有任务。</div> : null}
        {tasks.map((task) => (
          <article className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70" key={task.id}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-extrabold text-slate-900">{task.nameSnapshot}</h2>
                <p className="mt-1 text-sm text-slate-500">目标 {formatMetricValue(task.metricTypeSnapshot, task.targetValueSnapshot, task.unitSnapshot)}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{statusLabel(task.status)}</span>
            </div>
            <p className="mt-4 text-sm font-bold text-slate-700">已完成 {formatMetricValue(task.metricTypeSnapshot, task.currentValue, task.unitSnapshot)}</p>

            {task.status === "SKIPPED" ? (
              <form action={unskipTaskAction} className="mt-4">
                <input name="taskId" type="hidden" value={task.id} />
                <button className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700" type="submit">取消跳过</button>
              </form>
            ) : null}

            <div className="mt-5 space-y-3">
              {task.progressEntries.map((entry, index) => (
                <div className="rounded-2xl bg-slate-50 p-4" key={entry.id}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-800">第 {index + 1} 次记录</p>
                      <p className="mt-1 text-xs text-slate-400">{new Intl.DateTimeFormat("zh-CN", { timeZone: current.session.user.timezone, hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).format(entry.recordedAt)}</p>
                    </div>
                    <form action={deleteProgressEntryAction}>
                      <input name="entryId" type="hidden" value={entry.id} />
                      <button className="text-xs font-bold text-rose-600" type="submit">删除</button>
                    </form>
                  </div>
                  <EditProgressEntryForm entryId={entry.id} metricType={task.metricTypeSnapshot} note={entry.note} value={storedValueToInput(task.metricTypeSnapshot, entry.value)} />
                </div>
              ))}
              {!task.progressEntries.length ? <p className="text-sm text-slate-400">没有执行记录。</p> : null}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}

function statusLabel(status: string) {
  return ({ PENDING: "未开始", IN_PROGRESS: "进行中", COMPLETED: "已完成", EXCEEDED: "超额完成", SKIPPED: "已跳过", MISSED: "未完成", CANCELED: "已取消" } as Record<string, string>)[status] ?? status;
}
