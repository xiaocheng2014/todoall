"use client";

import { useActionState } from "react";
import {
  updateProfileAction,
  type ProfileActionState,
} from "@/app/actions/profile";

const initialState: ProfileActionState = { error: null, success: null };
const commonTimezones = [
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Europe/London",
  "America/Los_Angeles",
  "America/New_York",
  "UTC",
];

export function ProfileForm({
  displayName,
  timezone,
}: {
  displayName: string;
  timezone: string;
}) {
  const [state, action, pending] = useActionState(updateProfileAction, initialState);
  const timezones = commonTimezones.includes(timezone)
    ? commonTimezones
    : [timezone, ...commonTimezones];

  return (
    <form action={action} className="mt-4 space-y-4">
      <label className="block space-y-2">
        <span className="text-sm font-bold text-slate-700">用户名</span>
        <input className="field" defaultValue={displayName} name="displayName" required />
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-bold text-slate-700">时区</span>
        <select className="field" defaultValue={timezone} name="timezone">
          {timezones.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
      </label>
      {state.error || state.success ? (
        <p className={`text-sm ${state.error ? "text-rose-700" : "text-emerald-700"}`}>
          {state.error ?? state.success}
        </p>
      ) : null}
      <button className="primary-button w-full" disabled={pending} type="submit">
        {pending ? "正在保存…" : "保存个人设置"}
      </button>
    </form>
  );
}
