import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export const metadata = { title: "操作审计" };

const actionLabels: Record<string, string> = {
  USER_CREATED: "创建用户",
  USER_ENABLED: "启用用户",
  USER_DISABLED: "禁用用户",
  USER_PASSWORD_RESET: "重置用户密码",
};

export default async function AuditPage() {
  await requireAdmin();
  const logs = await db.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { actor: { select: { displayName: true, loginName: true } } },
  });

  return (
    <main className="px-5 pb-8 pt-8 sm:px-8">
      <p className="text-sm font-bold text-emerald-700">系统管理</p>
      <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900">操作审计</h1>
      <p className="mt-2 text-sm text-slate-500">最近 200 条账号管理操作。</p>

      <section className="mt-7 space-y-3">
        {logs.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">暂无审计记录</p>
        ) : null}
        {logs.map((log) => {
          let metadata: Record<string, unknown> = {};
          try {
            metadata = log.metadata ? JSON.parse(log.metadata) : {};
          } catch {
            metadata = {};
          }

          return (
            <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70" key={log.id}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-bold text-slate-900">{actionLabels[log.action] ?? log.action}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {log.actor.displayName}（@{log.actor.loginName}）
                  </p>
                </div>
                <time className="text-right text-xs text-slate-400">
                  {new Intl.DateTimeFormat("zh-CN", { dateStyle: "short", timeStyle: "short" }).format(log.createdAt)}
                </time>
              </div>
              {typeof metadata.loginName === "string" ? (
                <p className="mt-3 text-sm text-slate-600">目标账号：@{metadata.loginName}</p>
              ) : null}
            </article>
          );
        })}
      </section>
    </main>
  );
}
