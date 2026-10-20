"use client";

import { useActionState, useState } from "react";
import { updateGoalAction, type GoalActionState } from "@/app/actions/goals";

const initialState: GoalActionState = { error: null, success: null };
type GoalData = { id: string; name: string; description: string | null; startDate: string | null; dueDate: string | null; metricType: string | null; targetValue: number | null; unit: string | null };

function goalValue(goal: GoalData) {
  if (!goal.targetValue) return "";
  if (goal.metricType === "DURATION") return goal.targetValue / 3600;
  if (goal.metricType === "DISTANCE") return goal.targetValue / 1000;
  return goal.targetValue;
}

export function EditGoalForm({ goal }: { goal: GoalData }) {
  const [state, action, pending] = useActionState(updateGoalAction, initialState);
  const [metricType, setMetricType] = useState(goal.metricType ?? "");
  return <form action={action} className="space-y-4">
    <input name="goalId" type="hidden" value={goal.id} />
    <label className="block space-y-2"><span className="text-sm font-bold text-slate-700">目标名称</span><input className="field" defaultValue={goal.name} name="name" required /></label>
    <label className="block space-y-2"><span className="text-sm font-bold text-slate-700">说明</span><textarea className="field min-h-24" defaultValue={goal.description ?? ""} name="description" /></label>
    <div className="grid grid-cols-2 gap-3"><label className="block space-y-2"><span className="text-sm font-bold text-slate-700">开始日期</span><input className="field" defaultValue={goal.startDate ?? ""} name="startDate" type="date" /></label><label className="block space-y-2"><span className="text-sm font-bold text-slate-700">截止日期</span><input className="field" defaultValue={goal.dueDate ?? ""} name="dueDate" type="date" /></label></div>
    <label className="block space-y-2"><span className="text-sm font-bold text-slate-700">目标类型</span><select className="field" name="metricType" onChange={(event) => setMetricType(event.target.value)} value={metricType}><option value="">描述型目标</option><option value="COUNT">累计次数</option><option value="DURATION">累计时长（小时）</option><option value="DISTANCE">累计距离（公里）</option><option value="QUANTITY">累计自定义数量</option></select></label>
    {metricType ? <div className="grid grid-cols-2 gap-3"><label className="block space-y-2"><span className="text-sm font-bold text-slate-700">目标值</span><input className="field" defaultValue={goalValue(goal)} min={metricType === "COUNT" || metricType === "QUANTITY" ? "1" : "0.01"} name="targetValue" required step={metricType === "COUNT" || metricType === "QUANTITY" ? "1" : "0.01"} type="number" /></label>{metricType === "COUNT" || metricType === "QUANTITY" ? <label className="block space-y-2"><span className="text-sm font-bold text-slate-700">单位</span><input className="field" defaultValue={goal.unit ?? ""} name="unit" /></label> : null}</div> : null}
    {state.error || state.success ? <p className={`rounded-2xl px-4 py-3 text-sm ${state.error ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-800"}`}>{state.error ?? state.success}</p> : null}
    <button className="primary-button w-full" disabled={pending} type="submit">{pending ? "保存中…" : "保存目标"}</button>
  </form>;
}
