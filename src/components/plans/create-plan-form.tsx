"use client";

import { useActionState, useMemo, useState } from "react";
import { createPlanAction, type PlanActionState } from "@/app/actions/plans";
import { metricInputDescription, type MetricType } from "@/lib/metrics";

type GoalOption = { id: string; name: string };
const initialState: PlanActionState = { error: null };
const weekdayOptions = [
  [1, "一"], [2, "二"], [3, "三"], [4, "四"], [5, "五"], [6, "六"], [7, "日"],
] as const;

export function CreatePlanForm({ goals, today }: { goals: GoalOption[]; today: string }) {
  const [state, action, pending] = useActionState(createPlanAction, initialState);
  const [metricType, setMetricType] = useState<MetricType>("CHECK");
  const [recurrenceType, setRecurrenceType] = useState("ONCE");
  const targetStep = useMemo(
    () => (metricType === "COUNT" || metricType === "QUANTITY" ? "1" : "0.01"),
    [metricType],
  );
  const targetMin = metricType === "COUNT" || metricType === "QUANTITY" ? "1" : "0.01";

  return (
    <form action={action} className="space-y-6">
      <section className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
        <h2 className="font-black text-slate-900">做什么</h2>
        <div className="mt-4 space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-bold text-slate-700">计划名称</span>
            <input className="field" name="name" placeholder="例如：每天做俯卧撑" required />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-bold text-slate-700">说明（可选）</span>
            <textarea className="field min-h-20 resize-y" name="description" />
          </label>
        </div>
      </section>

      <section className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
        <h2 className="font-black text-slate-900">完成多少</h2>
        <div className="mt-4 space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-bold text-slate-700">计量方式</span>
            <select
              className="field"
              name="metricType"
              onChange={(event) => setMetricType(event.target.value as MetricType)}
              value={metricType}
            >
              <option value="CHECK">完成一次</option>
              <option value="COUNT">次数</option>
              <option value="DURATION">时长</option>
              <option value="DISTANCE">距离</option>
              <option value="QUANTITY">自定义数量</option>
            </select>
          </label>

          {metricType !== "CHECK" ? (
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-2">
                <span className="text-sm font-bold text-slate-700">每日目标</span>
                <input
                  className="field"
                  min={targetMin}
                  name="targetValue"
                  required
                  step={targetStep}
                  type="number"
                />
              </label>
              {metricType === "COUNT" || metricType === "QUANTITY" ? (
                <label className="block space-y-2">
                  <span className="text-sm font-bold text-slate-700">单位</span>
                  <input
                    className="field"
                    name="unit"
                    placeholder={metricType === "COUNT" ? "个、次、组" : "页、毫升…"}
                  />
                </label>
              ) : (
                <p className="flex items-end pb-4 text-sm text-slate-500">
                  {metricInputDescription(metricType)}
                </p>
              )}
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
        <h2 className="font-black text-slate-900">什么时候做</h2>
        <div className="mt-4 space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-bold text-slate-700">重复规则</span>
            <select
              className="field"
              name="recurrenceType"
              onChange={(event) => setRecurrenceType(event.target.value)}
              value={recurrenceType}
            >
              <option value="ONCE">仅一次</option>
              <option value="DAILY">每天</option>
              <option value="WEEKLY">每周指定日期</option>
              <option value="CONSECUTIVE">连续若干天</option>
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-2">
              <span className="text-sm font-bold text-slate-700">
                {recurrenceType === "ONCE" ? "执行日期" : "开始日期"}
              </span>
              <input className="field" defaultValue={today} name="startDate" required type="date" />
            </label>
            {recurrenceType === "DAILY" || recurrenceType === "WEEKLY" ? (
              <label className="block space-y-2">
                <span className="text-sm font-bold text-slate-700">结束日期（可选）</span>
                <input className="field" name="endDate" type="date" />
              </label>
            ) : null}
            {recurrenceType === "CONSECUTIVE" ? (
              <label className="block space-y-2">
                <span className="text-sm font-bold text-slate-700">连续天数</span>
                <input className="field" defaultValue="30" max="3650" min="1" name="durationDays" required type="number" />
              </label>
            ) : null}
          </div>

          {recurrenceType === "WEEKLY" ? (
            <fieldset>
              <legend className="text-sm font-bold text-slate-700">选择星期</legend>
              <div className="mt-2 grid grid-cols-7 gap-1.5">
                {weekdayOptions.map(([value, label]) => (
                  <label className="cursor-pointer" key={value}>
                    <input className="peer sr-only" name="weekdays" type="checkbox" value={value} />
                    <span className="flex aspect-square items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-600 peer-checked:bg-emerald-700 peer-checked:text-white">
                      {label}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}

          <label className="block space-y-2">
            <span className="text-sm font-bold text-slate-700">执行时间（可选）</span>
            <input className="field" name="executionTime" type="time" />
            <span className="block text-xs leading-5 text-slate-500">
              设置后按“我的 → Bark 通知”中的默认提前量提醒（初始为 1 分钟）。
            </span>
          </label>
        </div>
      </section>

      {goals.length ? (
        <section className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
          <h2 className="font-black text-slate-900">关联目标（可多选）</h2>
          <div className="mt-4 space-y-2">
            {goals.map((goal) => (
              <label className="flex cursor-pointer items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3" key={goal.id}>
                <input className="h-5 w-5 accent-emerald-700" name="goalIds" type="checkbox" value={goal.id} />
                <span className="font-semibold text-slate-700">{goal.name}</span>
              </label>
            ))}
          </div>
        </section>
      ) : null}

      {state.error ? (
        <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{state.error}</p>
      ) : null}

      <button className="primary-button w-full" disabled={pending} type="submit">
        {pending ? "正在创建…" : "创建计划"}
      </button>
    </form>
  );
}
