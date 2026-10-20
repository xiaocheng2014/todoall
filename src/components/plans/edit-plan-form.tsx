"use client";

import { useActionState, useMemo, useState } from "react";
import { updatePlanAction, type PlanActionState } from "@/app/actions/plans";
import { storedValueToInput, type MetricType } from "@/lib/metrics";
import { parseWeekdays } from "@/lib/recurrence";

const initialState: PlanActionState = { error: null };
const weekdayOptions = [[1, "一"], [2, "二"], [3, "三"], [4, "四"], [5, "五"], [6, "六"], [7, "日"]] as const;

type EditablePlan = {
  id: string; name: string; description: string | null; metricType: string; targetValue: number; unit: string;
  recurrenceType: string; startDate: string; endDate: string | null; weekdays: string | null; durationDays: number | null;
  executionTime: string | null; reminderOffsetMinutes: number | null; goalIds: string[];
};

export function EditPlanForm({ plan, goals }: { plan: EditablePlan; goals: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(updatePlanAction, initialState);
  const [metricType, setMetricType] = useState<MetricType>(plan.metricType as MetricType);
  const [recurrenceType, setRecurrenceType] = useState(plan.recurrenceType);
  const weekdays = parseWeekdays(plan.weekdays);
  const step = useMemo(() => metricType === "COUNT" || metricType === "QUANTITY" ? "1" : "0.01", [metricType]);
  const min = metricType === "COUNT" || metricType === "QUANTITY" ? "1" : "0.01";

  return (
    <form action={action} className="space-y-5">
      <input name="planId" type="hidden" value={plan.id} />
      <section className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70 space-y-4">
        <label className="block space-y-2"><span className="text-sm font-bold text-slate-700">计划名称</span><input className="field" defaultValue={plan.name} name="name" required /></label>
        <label className="block space-y-2"><span className="text-sm font-bold text-slate-700">说明</span><textarea className="field min-h-20" defaultValue={plan.description ?? ""} name="description" /></label>
      </section>
      <section className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70 space-y-4">
        <label className="block space-y-2"><span className="text-sm font-bold text-slate-700">计量方式</span><select className="field" name="metricType" onChange={(event) => setMetricType(event.target.value as MetricType)} value={metricType}><option value="CHECK">完成一次</option><option value="COUNT">次数</option><option value="DURATION">时长（分钟）</option><option value="DISTANCE">距离（公里）</option><option value="QUANTITY">自定义数量</option></select></label>
        {metricType !== "CHECK" ? <div className="grid grid-cols-2 gap-3"><label className="block space-y-2"><span className="text-sm font-bold text-slate-700">每日目标</span><input className="field" defaultValue={storedValueToInput(plan.metricType, plan.targetValue)} min={min} name="targetValue" required step={step} type="number" /></label>{metricType === "COUNT" || metricType === "QUANTITY" ? <label className="block space-y-2"><span className="text-sm font-bold text-slate-700">单位</span><input className="field" defaultValue={plan.unit} name="unit" /></label> : null}</div> : null}
      </section>
      <section className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70 space-y-4">
        <label className="block space-y-2"><span className="text-sm font-bold text-slate-700">重复规则</span><select className="field" name="recurrenceType" onChange={(event) => setRecurrenceType(event.target.value)} value={recurrenceType}><option value="ONCE">仅一次</option><option value="DAILY">每天</option><option value="WEEKLY">每周指定日期</option><option value="CONSECUTIVE">连续若干天</option></select></label>
        <div className="grid grid-cols-2 gap-3"><label className="block space-y-2"><span className="text-sm font-bold text-slate-700">开始日期</span><input className="field" defaultValue={plan.startDate} name="startDate" required type="date" /></label>{recurrenceType === "DAILY" || recurrenceType === "WEEKLY" ? <label className="block space-y-2"><span className="text-sm font-bold text-slate-700">结束日期</span><input className="field" defaultValue={plan.endDate ?? ""} name="endDate" type="date" /></label> : null}{recurrenceType === "CONSECUTIVE" ? <label className="block space-y-2"><span className="text-sm font-bold text-slate-700">连续天数</span><input className="field" defaultValue={plan.durationDays ?? 30} max="3650" min="1" name="durationDays" type="number" /></label> : null}</div>
        {recurrenceType === "WEEKLY" ? <fieldset><legend className="text-sm font-bold text-slate-700">选择星期</legend><div className="mt-2 grid grid-cols-7 gap-1.5">{weekdayOptions.map(([value, label]) => <label className="cursor-pointer" key={value}><input className="peer sr-only" defaultChecked={weekdays.includes(value)} name="weekdays" type="checkbox" value={value} /><span className="flex aspect-square items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-600 peer-checked:bg-emerald-700 peer-checked:text-white">{label}</span></label>)}</div></fieldset> : null}
        <div className="grid grid-cols-2 gap-3"><label className="block space-y-2"><span className="text-sm font-bold text-slate-700">执行时间</span><input className="field" defaultValue={plan.executionTime ?? ""} name="executionTime" type="time" /></label><label className="block space-y-2"><span className="text-sm font-bold text-slate-700">提前分钟数（可选）</span><input className="field" defaultValue={plan.reminderOffsetMinutes ?? ""} max="1440" min="1" name="reminderOffsetMinutes" placeholder="使用通知默认值" type="number" /></label></div>
      </section>
      {goals.length ? <section className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70"><h2 className="font-black text-slate-900">关联目标</h2><div className="mt-3 space-y-2">{goals.map((goal) => <label className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3" key={goal.id}><input defaultChecked={plan.goalIds.includes(goal.id)} name="goalIds" type="checkbox" value={goal.id} /><span className="font-semibold text-slate-700">{goal.name}</span></label>)}</div></section> : null}
      <p className="text-xs leading-5 text-slate-500">修改只影响今天尚未开始的任务和今后生成的任务；历史记录保持原样。</p>
      {state.error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{state.error}</p> : null}
      <button className="primary-button w-full" disabled={pending} type="submit">{pending ? "保存中…" : "保存计划"}</button>
    </form>
  );
}
