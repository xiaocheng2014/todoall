import Link from "next/link";
import { addDays, getZonedDate } from "@/lib/dates";
import { db } from "@/lib/db";
import { formatMetricValue } from "@/lib/metrics";
import { requireUser } from "@/lib/session";

export const metadata = { title: "历史" };

const finishedStatuses = new Set(["COMPLETED", "EXCEEDED"]);

export default async function HistoryPage() {
  const current = await requireUser();
  const user = current.session.user;
  const todayInfo = getZonedDate(new Date(), user.timezone);
  const today = todayInfo.date;
  const firstDate = addDays(today, -(todayInfo.weekday - 1) - 28);
  const tasks = await db.dailyTask.findMany({
    where: { userId: user.id, taskDate: { gte: firstDate, lte: today } },
    orderBy: [{ taskDate: "asc" }, { createdAt: "asc" }],
  });

  const dates = Array.from({ length: 35 }, (_, index) => addDays(firstDate, index));
  const byDate = new Map<string, typeof tasks>();
  for (const task of tasks) {
    const list = byDate.get(task.taskDate) ?? [];
    list.push(task);
    byDate.set(task.taskDate, list);
  }

  const activeTasks = tasks.filter((task) => !["SKIPPED", "CANCELED"].includes(task.status));
  const completedTasks = activeTasks.filter((task) => finishedStatuses.has(task.status));
  const completionRate = activeTasks.length
    ? Math.round((completedTasks.length / activeTasks.length) * 100)
    : 0;

  let streak = 0;
  for (let offset = 0; offset < dates.length; offset += 1) {
    const date = addDays(today, -offset);
    const dayTasks = byDate.get(date) ?? [];
    const countable = dayTasks.filter((task) => !["SKIPPED", "CANCELED"].includes(task.status));
    if (!countable.length || !countable.every((task) => finishedStatuses.has(task.status))) break;
    streak += 1;
  }

  const totals = new Map<string, { metricType: string; value: number; unit: string }>();
  for (const task of tasks) {
    if (task.currentValue <= 0) continue;
    const key = `${task.metricTypeSnapshot}:${task.unitSnapshot}`;
    const total = totals.get(key) ?? {
      metricType: task.metricTypeSnapshot,
      value: 0,
      unit: task.unitSnapshot,
    };
    total.value += task.currentValue;
    totals.set(key, total);
  }

  return (
    <main className="px-5 pb-8 pt-8 sm:px-8">
      <p className="text-sm font-bold text-emerald-700">最近 5 周</p>
      <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900">执行历史</h1>

      <section className="mt-7 grid grid-cols-2 gap-3">
        <StatCard label="完成率" value={`${completionRate}%`} />
        <StatCard label="连续全完成" value={`${streak} 天`} />
      </section>

      <section className="mt-7 rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
        <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-slate-400">
          {['一', '二', '三', '四', '五', '六', '日'].map((day) => <span key={day}>{day}</span>)}
        </div>
        <div className="mt-3 grid grid-cols-7 gap-2">
          {dates.map((date) => {
            const dayTasks = byDate.get(date) ?? [];
            const countable = dayTasks.filter((task) => !["SKIPPED", "CANCELED"].includes(task.status));
            const complete = countable.length > 0 && countable.every((task) => finishedStatuses.has(task.status));
            const partial = countable.some((task) => task.currentValue > 0);
            const dayNumber = Number(date.slice(-2));
            return (
              <Link
                aria-label={`${date}，${dayTasks.length} 项任务`}
                className={`flex aspect-square items-center justify-center rounded-xl text-sm font-bold transition ${
                  date > today
                    ? "pointer-events-none text-slate-200"
                    :
                  complete
                    ? "bg-emerald-600 text-white"
                    : partial
                      ? "bg-amber-100 text-amber-900"
                      : dayTasks.length
                        ? "bg-slate-100 text-slate-700"
                        : "text-slate-300 hover:bg-slate-50"
                } ${date === today ? "ring-2 ring-emerald-700 ring-offset-2" : ""}`}
                href={`/history/${date}`}
                key={date}
              >
                {dayNumber}
              </Link>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
          <Legend color="bg-emerald-600" label="全部完成" />
          <Legend color="bg-amber-100" label="有进展" />
          <Legend color="bg-slate-100" label="未完成或跳过" />
        </div>
      </section>

      <section className="mt-7">
        <h2 className="text-lg font-black text-slate-900">累计完成量</h2>
        {totals.size ? (
          <div className="mt-3 grid grid-cols-2 gap-3">
            {[...totals.values()].map((total) => (
              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70" key={`${total.metricType}:${total.unit}`}>
                <p className="text-xs font-semibold text-slate-400">{metricLabel(total.metricType)}</p>
                <p className="mt-1 text-lg font-black text-slate-900">{formatMetricValue(total.metricType, total.value, total.unit)}</p>
              </div>
            ))}
          </div>
        ) : <p className="mt-3 text-sm text-slate-500">完成任务后，这里会显示累计数据。</p>}
      </section>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return <div className="rounded-[1.5rem] bg-slate-900 p-5 text-white"><p className="text-xs text-slate-300">{label}</p><p className="mt-2 text-2xl font-black">{value}</p></div>;
}

function Legend({ color, label }: { color: string; label: string }) {
  return <span className="inline-flex items-center gap-1.5"><i className={`h-2.5 w-2.5 rounded-full ${color}`} />{label}</span>;
}

function metricLabel(type: string) {
  return type === "DURATION" ? "投入时长" : type === "DISTANCE" ? "累计距离" : type === "CHECK" ? "完成次数" : "累计数量";
}
