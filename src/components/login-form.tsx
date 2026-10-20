"use client";

import { useActionState } from "react";
import { loginAction, type AuthActionState } from "@/app/actions/auth";

const initialState: AuthActionState = { error: null };

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initialState);

  return (
    <form action={action} className="space-y-5">
      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">登录账号</span>
        <input
          autoComplete="username"
          autoFocus
          className="field"
          name="loginName"
          placeholder="请输入管理员分配的账号"
          required
          type="text"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">密码</span>
        <input
          autoComplete="current-password"
          className="field"
          name="password"
          placeholder="请输入密码"
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
        {pending ? "正在登录…" : "登录"}
      </button>
    </form>
  );
}
