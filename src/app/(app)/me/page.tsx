import { logoutAction } from "@/app/actions/auth";
import { ProfileForm } from "@/components/profile-form";
import { requireUser } from "@/lib/session";
import Link from "next/link";

export const metadata = { title: "我的" };

export default async function MePage() {
  const current = await requireUser();

  return (
    <main className="px-5 pt-8 sm:px-8">
      <h1 className="text-3xl font-black tracking-tight text-slate-900">我的</h1>
      <section className="mt-6 rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
        <p className="font-extrabold text-slate-900">
          {current.session.user.displayName}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          @{current.session.user.loginName}
        </p>
        <p className="mt-3 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
          {current.session.user.role === "ADMIN" ? "管理员" : "普通用户"}
        </p>
      </section>

      <section className="mt-4 overflow-hidden rounded-[1.5rem] bg-white shadow-sm ring-1 ring-slate-200/70">
        <Link
          className="flex min-h-14 items-center justify-between border-b border-slate-100 px-5 font-bold text-slate-800"
          href="/me/notifications"
        >
          Bark 通知 <span aria-hidden>›</span>
        </Link>
        <Link
          className="flex min-h-14 items-center justify-between border-b border-slate-100 px-5 font-bold text-slate-800"
          href="/change-password"
        >
          修改密码 <span aria-hidden>›</span>
        </Link>
        {current.session.user.role === "ADMIN" ? (
          <>
            <Link
              className="flex min-h-14 items-center justify-between border-b border-slate-100 px-5 font-bold text-slate-800"
              href="/admin/users"
            >
              用户管理 <span aria-hidden>›</span>
            </Link>
            <Link
              className="flex min-h-14 items-center justify-between px-5 font-bold text-slate-800"
              href="/admin/audit"
            >
              操作审计 <span aria-hidden>›</span>
            </Link>
          </>
        ) : null}
      </section>

      <details className="mt-4 rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
        <summary className="cursor-pointer font-extrabold text-slate-900">个人设置</summary>
        <ProfileForm
          displayName={current.session.user.displayName}
          timezone={current.session.user.timezone}
        />
      </details>

      <form action={logoutAction} className="mt-6">
        <button
          className="min-h-12 w-full rounded-2xl border border-slate-300 bg-white font-bold text-slate-700 transition hover:bg-slate-50"
          type="submit"
        >
          退出登录
        </button>
      </form>
    </main>
  );
}
