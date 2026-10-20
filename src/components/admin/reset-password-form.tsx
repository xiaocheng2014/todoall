"use client";

import { useActionState } from "react";
import {
  resetUserPasswordAction,
  type AdminActionState,
} from "@/app/actions/admin-users";

const initialState: AdminActionState = { error: null, success: null };

export function ResetPasswordForm({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState(
    resetUserPasswordAction,
    initialState,
  );

  return (
    <form action={action} className="mt-3 space-y-3">
      <input name="userId" type="hidden" value={userId} />
      <input
        autoComplete="new-password"
        className="field"
        minLength={8}
        name="password"
        placeholder="输入新的临时密码"
        required
        type="password"
      />
      {state.error || state.success ? (
        <p className={`text-xs ${state.error ? "text-rose-700" : "text-emerald-700"}`}>
          {state.error ?? state.success}
        </p>
      ) : null}
      <button
        className="min-h-10 w-full rounded-xl bg-amber-100 px-3 text-sm font-bold text-amber-900 disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? "正在重置…" : "确认重置密码"}
      </button>
    </form>
  );
}
