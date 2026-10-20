import { setUserStatusAction } from "@/app/actions/admin-users";
import { CreateUserForm } from "@/components/admin/create-user-form";
import { ResetPasswordForm } from "@/components/admin/reset-password-form";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export const metadata = { title: "用户管理" };

export default async function AdminUsersPage() {
  const admin = await requireAdmin();
  const users = await db.user.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      loginName: true,
      displayName: true,
      role: true,
      status: true,
      mustChangePassword: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });

  return (
    <main className="px-5 pb-8 pt-8 sm:px-8">
      <div>
        <p className="text-sm font-bold text-emerald-700">系统管理</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900">
          用户管理
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          创建账号、控制登录状态，并为忘记密码的用户设置临时密码。
        </p>
      </div>

      <details className="mt-7 rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
        <summary className="cursor-pointer font-extrabold text-slate-900">
          ＋ 创建用户
        </summary>
        <CreateUserForm />
      </details>

      <section className="mt-7 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-900">全部账号</h2>
          <span className="text-sm text-slate-500">{users.length} 个</span>
        </div>

        {users.map((user) => {
          const isSelf = user.id === admin.session.user.id;
          const isActive = user.status === "ACTIVE";

          return (
            <article
              className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70"
              key={user.id}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-extrabold text-slate-900">{user.displayName}</h3>
                    {isSelf ? (
                      <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-bold text-sky-700">
                        当前账号
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-slate-500">@{user.loginName}</p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    isActive
                      ? "bg-emerald-50 text-emerald-800"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {isActive ? "正常" : "已禁用"}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
                <span className="rounded-lg bg-slate-50 px-2.5 py-1.5">
                  {user.role === "ADMIN" ? "管理员" : "普通用户"}
                </span>
                {user.mustChangePassword ? (
                  <span className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-amber-800">
                    等待修改临时密码
                  </span>
                ) : null}
                <span className="rounded-lg bg-slate-50 px-2.5 py-1.5">
                  最后登录：
                  {user.lastLoginAt
                    ? new Intl.DateTimeFormat("zh-CN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(user.lastLoginAt)
                    : "从未登录"}
                </span>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <form action={setUserStatusAction}>
                  <input name="userId" type="hidden" value={user.id} />
                  <input
                    name="status"
                    type="hidden"
                    value={isActive ? "DISABLED" : "ACTIVE"}
                  />
                  <button
                    className="min-h-10 w-full rounded-xl border border-slate-300 px-3 text-sm font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={isSelf}
                    type="submit"
                  >
                    {isActive ? "禁用账号" : "启用账号"}
                  </button>
                </form>

                <details className="rounded-xl bg-slate-50 px-3 py-2">
                  <summary className="cursor-pointer text-center text-sm font-bold text-slate-700">
                    重置密码
                  </summary>
                  <ResetPasswordForm userId={user.id} />
                </details>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
