import Link from "next/link";
import { CreatePlanForm } from "@/components/plans/create-plan-form";
import { getZonedDate } from "@/lib/dates";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";

export const metadata = { title: "创建计划" };

export default async function NewPlanPage() {
  const current = await requireUser();
  const goals = await db.goal.findMany({
    where: { userId: current.session.user.id, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true },
  });
  const today = getZonedDate(new Date(), current.session.user.timezone).date;

  return (
    <main className="px-5 pb-8 pt-8 sm:px-8">
      <Link className="text-sm font-bold text-emerald-700" href="/plans">← 返回计划</Link>
      <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900">创建计划</h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        先定义每天做什么、完成多少，再选择它出现的日期。
      </p>

      <div className="mt-7">
        <CreatePlanForm goals={goals} today={today} />
      </div>
    </main>
  );
}
