"use client";

import { useActionState } from "react";
import {
  createUserAction,
  type AdminActionState,
} from "@/app/actions/admin-users";

const initialState: AdminActionState = { error: null, success: null };

export function CreateUserForm() {
  const [state, action, pending] = useActionState(createUserAction, initialState);

  return (
    <form action={action} className="mt-5 grid gap-4 sm:grid-cols-2">
      <label className="block space-y-2">
        <span className="text-sm font-bold text-slate-700">登录账号</span>
        <input className="field" name="loginName" placeholder="例如 xiaocheng" required />
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-bold text-slate-700">用户名</span>
        <input className="field" name="displayName" placeholder="页面展示名称" required />
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-bold text-slate-700">临时密码</span>
        <input
          autoComplete="new-password"
          className="field"
          minLength={8}
          name="password"
          required
          type="password"
        />
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-bold text-slate-700">角色</span>
        <select className="field" defaultValue="USER" name="role">
          <option value="USER">普通用户</option>
          <option value="ADMIN">管理员</option>
        </select>
      </label>

      {state.error || state.success ? (
        <p
          className={`rounded-2xl px-4 py-3 text-sm sm:col-span-2 ${
            state.error
              ? "bg-rose-50 text-rose-700"
              : "bg-emerald-50 text-emerald-800"
          }`}
        >
          {state.error ?? state.success}
        </p>
      ) : null}

      <button className="primary-button sm:col-span-2" disabled={pending} type="submit">
        {pending ? "正在创建…" : "创建账号"}
      </button>
    </form>
  );
}
