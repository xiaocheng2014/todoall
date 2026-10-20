import Link from "next/link";
import { deletePlanAction, setPlanStatusAction } from "@/app/actions/plans";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { db } from "@/lib/db";
import { formatMetricValue } from "@/lib/metrics";
import { describeRecurrence } from "@/lib/recurrence";
import { requireUser } from "@/lib/session";

export const metadata = { title: "计划" };

export default async function PlansPage() {
  const current = await requireUser();
  const plans = await db.plan.findMany({
    where: { userId: current.session.user.id },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: { goals: { include: { goal: { select: { id: true, name: true } } } } },
  });

  return (
    <main className="px-5 pb-8 pt-8 sm:px-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-emerald-700">每天怎么做</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900">计划</h1>
        </div>
        <Link className="rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-900/15" href="/plans/new">
          ＋ 新建
        </Link>
      </div>

      <section className="mt-7 space-y-3">
        {plans.length === 0 ? (
          <div className="rounded-[1.5rem] border border-dashed border-slate-300 px-5 py-12 text-center">
            <p className="font-bold text-slate-700">还没有计划</p>
            <p className="mt-2 text-sm text-slate-500">创建一个计划，它会按规则出现在“今天”。</p>
          </div>
        ) : null}

        {plans.map((plan) => (
          <article className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70" key={plan.id}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-extrabold text-slate-900">{plan.name}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {formatMetricValue(plan.metricType, plan.targetValue, plan.unit)} · {describeRecurrence(plan)}
                </p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${plan.status === "ACTIVE" ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                {plan.status === "ACTIVE" ? "执行中" : plan.status === "PAUSED" ? "已暂停" : "已结束"}
              </span>
            </div>

            {plan.executionTime ? (
              <p className="mt-3 text-sm font-semibold text-amber-700">
                {plan.executionTime} 执行 · {plan.reminderOffsetMinutes ? `提前 ${plan.reminderOffsetMinutes} 分钟提醒` : "按通知设置提前提醒"}
              </p>
            ) : null}

            {plan.goals.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {plan.goals.map((item) => (
                  <span className="rounded-lg bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700" key={item.goal.id}>
                    {item.goal.name}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="mt-5 flex gap-2">
              <Link className="flex min-h-10 flex-1 items-center justify-center rounded-xl bg-emerald-50 px-3 text-sm font-bold text-emerald-800" href={`/plans/${plan.id}/edit`}>编辑</Link>
              {plan.status === "ACTIVE" ? <PlanStatusButton planId={plan.id} status="PAUSED" label="暂停" /> : null}
              {plan.status === "PAUSED" ? <PlanStatusButton planId={plan.id} status="ACTIVE" label="恢复" /> : null}
              {plan.status !== "ENDED" ? <PlanStatusButton planId={plan.id} status="ENDED" label="结束计划" /> : null}
              {plan.status === "ENDED" ? <DeletePlanButton name={plan.name} planId={plan.id} /> : null}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}

function DeletePlanButton({ name, planId }: { name: string; planId: string }) {
  return (
    <form action={deletePlanAction} className="flex-1">
      <input name="planId" type="hidden" value={planId} />
      <ConfirmSubmitButton
        ariaLabel={`删除计划：${name}`}
        message="删除后无法恢复，但已经产生的任务和历史记录会保留。确定删除这个计划吗？"
      >
        删除
      </ConfirmSubmitButton>
    </form>
  );
}

function PlanStatusButton({ planId, status, label }: { planId: string; status: string; label: string }) {
  return (
    <form action={setPlanStatusAction} className="flex-1">
      <input name="planId" type="hidden" value={planId} />
      <input name="status" type="hidden" value={status} />
      <button className="min-h-10 w-full rounded-xl bg-slate-100 px-3 text-sm font-bold text-slate-700" type="submit">
        {label}
      </button>
    </form>
  );
}
