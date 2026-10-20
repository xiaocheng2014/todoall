import Link from "next/link";
import { skipTaskAction } from "@/app/actions/tasks";
import { TaskProgressForm } from "@/components/tasks/task-progress-form";
import { ensureDailyTasksForUser } from "@/lib/daily-tasks";
import { db } from "@/lib/db";
import { formatMetricValue } from "@/lib/metrics";
import { requireUser } from "@/lib/session";

export const metadata = { title: "今天" };

const completedStatuses = new Set(["COMPLETED", "EXCEEDED"]);

export default async function TodayPage() {
  const current = await requireUser();
  const user = current.session.user;
  const taskDate = await ensureDailyTasksForUser(user.id, user.timezone);
  const tasks = await db.dailyTask.findMany({
    where: { userId: user.id, taskDate },
    orderBy: [{ executionAt: "asc" }, { createdAt: "asc" }],
  });
  const completedCount = tasks.filter((task) => completedStatuses.has(task.status)).length;
  const percentage = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;
  const todayLabel = new Intl.DateTimeFormat("zh-CN", {
    timeZone: user.timezone,
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date());

  return (
    <main className="px-5 pb-8 pt-[max(1.5rem,env(safe-area-inset-top))] sm:px-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-emerald-700">{todayLabel}</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900">你好，{user.displayName}</h1>
          <p className="mt-2 text-slate-500">今天也从一小步开始。</p>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-sm font-black text-emerald-700 shadow-sm ring-1 ring-slate-200">
          {user.displayName.slice(0, 1)}
        </div>
      </header>

      <section className="mt-8 rounded-[1.75rem] bg-slate-900 p-6 text-white shadow-xl shadow-slate-900/12">
        <div className="flex items-end justify-between gap-5">
          <div>
            <p className="text-sm text-slate-300">今日完成</p>
            <p className="mt-2 text-4xl font-black">{percentage}%</p>
          </div>
          <p className="text-sm font-semibold text-slate-300">{completedCount} / {tasks.length} 项</p>
        </div>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/15">
          <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${percentage}%` }} />
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-900">今日计划</h2>
          <Link className="text-sm font-bold text-emerald-700" href="/plans/new">＋ 新建</Link>
        </div>

        {tasks.length === 0 ? (
          <div className="rounded-[1.5rem] border border-dashed border-slate-300 px-5 py-12 text-center">
            <p className="font-bold text-slate-700">今天还没有任务</p>
            <p className="mt-2 text-sm text-slate-500">创建单日或重复计划后，任务会自动出现在这里。</p>
            <Link className="mt-5 inline-flex rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white" href="/plans/new">
              创建第一个计划
            </Link>
          </div>
        ) : null}

        <div className="space-y-3">
          {tasks.map((task) => {
            const finished = completedStatuses.has(task.status);
            const skipped = task.status === "SKIPPED";
            const progressPercentage = Math.min(
              100,
              Math.round((task.currentValue / task.targetValueSnapshot) * 100),
            );

            return (
              <article className={`rounded-[1.5rem] border border-white bg-white/90 p-5 shadow-sm shadow-slate-900/5 ${skipped ? "opacity-60" : ""}`} key={task.id}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-extrabold text-slate-900">{task.nameSnapshot}</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {task.executionAt
                        ? `${new Intl.DateTimeFormat("zh-CN", { timeZone: user.timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(task.executionAt)} · `
                        : ""}
                      目标 {formatMetricValue(task.metricTypeSnapshot, task.targetValueSnapshot, task.unitSnapshot)}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${finished ? "bg-emerald-100 text-emerald-800" : skipped ? "bg-slate-100 text-slate-600" : "bg-amber-50 text-amber-800"}`}>
                    {finished
                      ? task.status === "EXCEEDED" ? "超额完成" : "已完成"
                      : skipped ? "已跳过" : formatMetricValue(task.metricTypeSnapshot, task.currentValue, task.unitSnapshot)}
                  </span>
                </div>

                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${finished ? "bg-emerald-500" : "bg-amber-400"}`} style={{ width: `${progressPercentage}%` }} />
                </div>

                {!finished && !skipped ? (
                  <div className="mt-4 space-y-2">
                    <TaskProgressForm taskId={task.id} metricType={task.metricTypeSnapshot} unit={task.unitSnapshot} />
                    <form action={skipTaskAction}>
                      <input name="taskId" type="hidden" value={task.id} />
                      <button className="w-full py-1 text-xs font-semibold text-slate-400" type="submit">今天跳过</button>
                    </form>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
