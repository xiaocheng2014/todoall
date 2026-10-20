import { deleteGoalAction, setGoalStatusAction } from "@/app/actions/goals";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { CreateGoalForm } from "@/components/goals/create-goal-form";
import { db } from "@/lib/db";
import { formatMetricValue } from "@/lib/metrics";
import { requireUser } from "@/lib/session";
import Link from "next/link";

export const metadata = { title: "目标" };

const statusLabels: Record<string, string> = {
  ACTIVE: "进行中",
  PAUSED: "已暂停",
  COMPLETED: "已完成",
  ABANDONED: "已放弃",
};

export default async function GoalsPage() {
  const current = await requireUser();
  const goals = await db.goal.findMany({
    where: { userId: current.session.user.id },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
    include: {
      plans: {
        include: {
          plan: {
            select: {
              id: true,
              metricType: true,
              unit: true,
              dailyTasks: { select: { currentValue: true } },
            },
          },
        },
      },
    },
  });

  return (
    <main className="px-5 pb-8 pt-8 sm:px-8">
      <div>
        <p className="text-sm font-bold text-emerald-700">想要到达的地方</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900">目标</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          目标描述最终结果，计划负责把它变成每天可执行的行动。
        </p>
      </div>

      <details className="mt-7 rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
        <summary className="cursor-pointer font-extrabold text-slate-900">＋ 创建目标</summary>
        <CreateGoalForm />
      </details>

      <section className="mt-7 space-y-3">
        {goals.length === 0 ? (
          <div className="rounded-[1.5rem] border border-dashed border-slate-300 px-5 py-10 text-center">
            <p className="font-bold text-slate-700">还没有目标</p>
            <p className="mt-2 text-sm text-slate-500">可以先创建描述型目标，也可以设置累计数值。</p>
          </div>
        ) : null}

        {goals.map((goal) => {
          const compatiblePlans = goal.metricType
            ? goal.plans.filter(
                (item) =>
                  item.plan.metricType === goal.metricType &&
                  item.plan.unit === goal.unit,
              )
            : [];
          const progress = compatiblePlans.reduce(
            (total, item) =>
              total + item.plan.dailyTasks.reduce((sum, task) => sum + task.currentValue, 0),
            0,
          );
          const percentage = goal.targetValue
            ? Math.min(100, Math.round((progress / goal.targetValue) * 100))
            : null;

          return (
            <article className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70" key={goal.id}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-extrabold text-slate-900">{goal.name}</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {goal.dueDate ? `${goal.dueDate} 截止` : "未设置截止日期"}
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                  {statusLabels[goal.status] ?? goal.status}
                </span>
              </div>

              {goal.description ? (
                <p className="mt-4 text-sm leading-6 text-slate-600">{goal.description}</p>
              ) : null}

              {goal.metricType && goal.targetValue && goal.unit ? (
                <div className="mt-5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold text-slate-700">
                      {formatMetricValue(goal.metricType, progress, goal.unit)}
                    </span>
                    <span className="text-slate-500">
                      / {formatMetricValue(goal.metricType, goal.targetValue, goal.unit)}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${percentage ?? 0}%` }} />
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500">已关联 {goal.plans.length} 个计划</p>
              )}

              <div className="mt-5 flex gap-2">
                <Link className="flex min-h-10 flex-1 items-center justify-center rounded-xl bg-emerald-50 px-3 text-sm font-bold text-emerald-800" href={`/goals/${goal.id}/edit`}>编辑</Link>
                {goal.status === "ACTIVE" ? (
                  <>
                    <GoalStatusButton goalId={goal.id} label="暂停" status="PAUSED" />
                    <GoalStatusButton goalId={goal.id} label="完成" status="COMPLETED" />
                    <GoalStatusButton goalId={goal.id} label="放弃" status="ABANDONED" />
                  </>
                ) : null}
                {goal.status === "PAUSED" ? (
                  <GoalStatusButton goalId={goal.id} label="恢复" status="ACTIVE" />
                ) : null}
                {goal.status === "COMPLETED" || goal.status === "ABANDONED" ? (
                  <DeleteGoalButton goalId={goal.id} name={goal.name} />
                ) : null}
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}

function DeleteGoalButton({ goalId, name }: { goalId: string; name: string }) {
  return (
    <form action={deleteGoalAction} className="flex-1">
      <input name="goalId" type="hidden" value={goalId} />
      <ConfirmSubmitButton
        ariaLabel={`删除目标：${name}`}
        message="删除后无法恢复，但关联计划和历史记录会保留。确定删除这个目标吗？"
      >
        删除
      </ConfirmSubmitButton>
    </form>
  );
}

function GoalStatusButton({ goalId, status, label }: { goalId: string; status: string; label: string }) {
  return (
    <form action={setGoalStatusAction} className="flex-1">
      <input name="goalId" type="hidden" value={goalId} />
      <input name="status" type="hidden" value={status} />
      <button className="min-h-10 w-full rounded-xl bg-slate-100 px-3 text-sm font-bold text-slate-700" type="submit">
        {label}
      </button>
    </form>
  );
}
