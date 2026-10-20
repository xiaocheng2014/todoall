import { ChangePasswordForm } from "@/components/change-password-form";
import { requireUser } from "@/lib/session";

export const metadata = { title: "设置新密码" };

export default async function ChangePasswordPage() {
  const current = await requireUser();

  const forced = current.session.user.mustChangePassword;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-10">
      <section className="rounded-[1.75rem] border border-white/80 bg-white/90 p-6 shadow-2xl shadow-slate-900/8 backdrop-blur">
        <div className="mb-6">
          {forced ? (
            <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
              首次登录
            </span>
          ) : null}
          <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-900">
            {forced ? "设置你自己的密码" : "修改密码"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {forced
              ? "为保护账号安全，修改管理员分配的临时密码后才能继续。"
              : "修改成功后，其他设备上的登录会话会自动失效。"}
          </p>
        </div>
        <ChangePasswordForm />
      </section>
    </main>
  );
}
