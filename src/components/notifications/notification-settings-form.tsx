"use client";

import { useActionState } from "react";
import { notificationSettingsAction, type NotificationActionState } from "@/app/actions/notifications";

const initialState: NotificationActionState = { error: null, success: null };

export function NotificationSettingsForm({ settings, maskedEndpoint }: {
  settings: {
    barkEnabled: boolean;
    dailySummaryEnabled: boolean;
    dailySummaryTime: string;
    timedReminderEnabled: boolean;
    defaultOffsetMinutes: number;
  };
  maskedEndpoint: string | null;
}) {
  const [state, action, pending] = useActionState(notificationSettingsAction, initialState);
  return (
    <form action={action} className="space-y-5">
      <label className="flex items-center justify-between gap-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
        <span><strong className="block text-slate-900">启用 Bark</strong><small className="text-slate-500">关闭后保留地址，但不会发送通知</small></span>
        <input defaultChecked={settings.barkEnabled} name="barkEnabled" type="checkbox" />
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-bold text-slate-700">Bark 通知地址</span>
        <input className="field" name="endpoint" placeholder={maskedEndpoint ?? "例如 https://api.day.app/你的密钥"} type="url" />
        {maskedEndpoint ? <small className="text-slate-500">当前：{maskedEndpoint}。留空表示不修改。</small> : null}
      </label>
      {maskedEndpoint ? <label className="flex items-center gap-2 text-sm text-rose-700"><input name="removeEndpoint" type="checkbox" />删除已保存的通知地址</label> : null}

      <section className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
        <label className="flex items-center justify-between gap-4">
          <span><strong className="block text-slate-900">未完成任务汇总</strong><small className="text-slate-500">到点后提醒当天仍未完成的任务</small></span>
          <input defaultChecked={settings.dailySummaryEnabled} name="dailySummaryEnabled" type="checkbox" />
        </label>
        <label className="mt-4 block space-y-2"><span className="text-sm font-bold text-slate-700">每日发送时间</span><input className="field" defaultValue={settings.dailySummaryTime} name="dailySummaryTime" type="time" /></label>
      </section>

      <section className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
        <label className="flex items-center justify-between gap-4">
          <span><strong className="block text-slate-900">时间点任务提醒</strong><small className="text-slate-500">在任务执行时间前发送</small></span>
          <input defaultChecked={settings.timedReminderEnabled} name="timedReminderEnabled" type="checkbox" />
        </label>
        <label className="mt-4 block space-y-2"><span className="text-sm font-bold text-slate-700">默认提前分钟数</span><input className="field" defaultValue={settings.defaultOffsetMinutes} max="1440" min="1" name="defaultOffsetMinutes" type="number" /></label>
      </section>

      {state.error || state.success ? <p className={`text-sm ${state.error ? "text-rose-700" : "text-emerald-700"}`}>{state.error ?? state.success}</p> : null}
      <div className="grid grid-cols-2 gap-3">
        <button className="min-h-12 rounded-2xl bg-slate-100 px-4 font-bold text-slate-700" disabled={pending} name="intent" type="submit" value="test">发送测试</button>
        <button className="primary-button" disabled={pending} name="intent" type="submit" value="save">{pending ? "处理中…" : "保存设置"}</button>
      </div>
    </form>
  );
}
