import Link from "next/link";
import { notFound } from "next/navigation";
import { EditGoalForm } from "@/components/goals/edit-goal-form";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";

export const metadata = { title: "编辑目标" };

export default async function EditGoalPage({ params }: { params: Promise<{ id: string }> }) {
  const current = await requireUser();
  const { id } = await params;
  const goal = await db.goal.findFirst({ where: { id, userId: current.session.user.id } });
  if (!goal) notFound();
  return <main className="px-5 pb-8 pt-8 sm:px-8"><Link className="text-sm font-bold text-emerald-700" href="/goals">← 返回目标</Link><h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900">编辑目标</h1><div className="mt-7 rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70"><EditGoalForm goal={goal} /></div></main>;
}
