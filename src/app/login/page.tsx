import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getCurrentSession } from "@/lib/session";

export const metadata = { title: "登录" };

export default async function LoginPage() {
  const current = await getCurrentSession();

  if (current) {
    redirect(
      current.session.user.mustChangePassword ? "/change-password" : "/today",
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-10">
      <div className="mb-9">
        <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-700 text-2xl font-black text-white shadow-lg shadow-emerald-900/15">
          T
        </div>
        <p className="mb-2 text-sm font-bold tracking-[0.24em] text-emerald-700 uppercase">
          TodoAll
        </p>
        <h1 className="text-3xl font-black tracking-tight text-slate-900">
          欢迎回来
        </h1>
        <p className="mt-3 leading-7 text-slate-500">
          登录后查看今天的计划，一点一点完成真正重要的事。
        </p>
      </div>

      <section className="rounded-[1.75rem] border border-white/80 bg-white/85 p-6 shadow-2xl shadow-slate-900/8 backdrop-blur">
        <LoginForm />
      </section>

      <p className="mt-6 text-center text-sm text-slate-400">
        账号由管理员创建，如忘记密码请联系管理员重置。
      </p>
    </main>
  );
}
