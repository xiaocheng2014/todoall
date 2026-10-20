import Link from "next/link";
import { notFound } from "next/navigation";
import { EditPlanForm } from "@/components/plans/edit-plan-form";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";

export const metadata = { title: "编辑计划" };

export default async function EditPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const current = await requireUser();
  const { id } = await params;
  const [plan, goals] = await Promise.all([
    db.plan.findFirst({ where: { id, userId: current.session.user.id }, include: { goals: { select: { goalId: true } } } }),
    db.goal.findMany({ where: { userId: current.session.user.id, status: "ACTIVE" }, orderBy: { createdAt: "desc" }, select: { id: true, name: true } }),
  ]);
  if (!plan) notFound();
  return <main className="px-5 pb-8 pt-8 sm:px-8"><Link className="text-sm font-bold text-emerald-700" href="/plans">← 返回计划</Link><h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900">编辑计划</h1><div className="mt-7"><EditPlanForm goals={goals} plan={{ ...plan, goalIds: plan.goals.map((item) => item.goalId) }} /></div></main>;
}
