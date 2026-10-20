"use client";

import { useActionState } from "react";
import {
  changePasswordAction,
  type AuthActionState,
} from "@/app/actions/auth";

const initialState: AuthActionState = { error: null };

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(
    changePasswordAction,
    initialState,
  );

  return (
    <form action={action} className="space-y-4">
      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">当前密码</span>
        <input
          autoComplete="current-password"
          className="field"
          name="currentPassword"
          required
          type="password"
        />
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">新密码</span>
        <input
          autoComplete="new-password"
          className="field"
          minLength={8}
          name="newPassword"
          required
          type="password"
        />
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">确认新密码</span>
        <input
          autoComplete="new-password"
          className="field"
          minLength={8}
          name="confirmPassword"
          required
          type="password"
        />
      </label>

      {state.error ? (
        <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.error}
        </p>
      ) : null}

      <button className="primary-button w-full" disabled={pending} type="submit">
        {pending ? "正在保存…" : "保存新密码"}
      </button>
    </form>
  );
}
