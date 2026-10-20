"use client";

import { useActionState, useState } from "react";
import {
  createGoalAction,
  type GoalActionState,
} from "@/app/actions/goals";

const initialState: GoalActionState = { error: null, success: null };

export function CreateGoalForm() {
  const [state, action, pending] = useActionState(createGoalAction, initialState);
  const [metricType, setMetricType] = useState("");

  return (
    <form action={action} className="mt-5 space-y-4">
      <label className="block space-y-2">
        <span className="text-sm font-bold text-slate-700">目标名称</span>
        <input className="field" name="name" placeholder="例如：年底前跑完 500 公里" required />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-bold text-slate-700">说明（可选）</span>
        <textarea
          className="field min-h-24 resize-y"
          name="description"
          placeholder="为什么要完成这个目标"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-2">
          <span className="text-sm font-bold text-slate-700">开始日期</span>
          <input className="field" name="startDate" type="date" />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-bold text-slate-700">截止日期</span>
          <input className="field" name="dueDate" type="date" />
        </label>
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-bold text-slate-700">目标类型</span>
        <select
          className="field"
          name="metricType"
          onChange={(event) => setMetricType(event.target.value)}
          value={metricType}
        >
          <option value="">描述型目标，不自动累计</option>
          <option value="COUNT">累计次数</option>
          <option value="DURATION">累计时长</option>
          <option value="DISTANCE">累计距离</option>
          <option value="QUANTITY">累计自定义数量</option>
        </select>
      </label>

      {metricType ? (
        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-2">
            <span className="text-sm font-bold text-slate-700">目标值</span>
            <input
              className="field"
              min={metricType === "COUNT" || metricType === "QUANTITY" ? "1" : "0.01"}
              name="targetValue"
              required
              step={metricType === "COUNT" || metricType === "QUANTITY" ? "1" : "0.01"}
              type="number"
            />
          </label>
          {metricType === "COUNT" || metricType === "QUANTITY" ? (
            <label className="block space-y-2">
              <span className="text-sm font-bold text-slate-700">单位</span>
              <input
                className="field"
                name="unit"
                placeholder={metricType === "COUNT" ? "次" : "页、毫升…"}
              />
            </label>
          ) : (
            <div className="flex items-end pb-4 text-sm text-slate-500">
              {metricType === "DURATION" ? "按小时填写" : "按公里填写"}
            </div>
          )}
        </div>
      ) : null}

      {state.error || state.success ? (
        <p
          className={`rounded-2xl px-4 py-3 text-sm ${
            state.error
              ? "bg-rose-50 text-rose-700"
              : "bg-emerald-50 text-emerald-800"
          }`}
        >
          {state.error ?? state.success}
        </p>
      ) : null}

      <button className="primary-button w-full" disabled={pending} type="submit">
        {pending ? "正在创建…" : "创建目标"}
      </button>
    </form>
  );
}
