import Link from "next/link";
import { NotificationSettingsForm } from "@/components/notifications/notification-settings-form";
import { db } from "@/lib/db";
import { decryptSecret, maskEndpoint } from "@/lib/secrets";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Bark 通知" };

export default async function NotificationsPage() {
  const current = await requireUser();
  const setting = await db.notificationSetting.findUnique({ where: { userId: current.session.user.id } });
  let maskedEndpoint: string | null = null;
  if (setting?.barkEndpointEncrypted) {
    try { maskedEndpoint = maskEndpoint(decryptSecret(setting.barkEndpointEncrypted)); }
    catch { maskedEndpoint = "已保存，但当前服务器无法解密"; }
  }
  return (
    <main className="px-5 pb-8 pt-8 sm:px-8">
      <Link className="text-sm font-bold text-emerald-700" href="/me">← 返回我的</Link>
      <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900">Bark 通知</h1>
      <p className="mt-2 text-slate-500">通知地址会加密保存，也不会出现在日志中。</p>
      <div className="mt-7">
        <NotificationSettingsForm
          maskedEndpoint={maskedEndpoint}
          settings={{
            barkEnabled: setting?.barkEnabled ?? false,
            dailySummaryEnabled: setting?.dailySummaryEnabled ?? true,
            dailySummaryTime: setting?.dailySummaryTime ?? "22:00",
            timedReminderEnabled: setting?.timedReminderEnabled ?? true,
            defaultOffsetMinutes: setting?.defaultOffsetMinutes ?? 1,
          }}
        />
      </div>
    </main>
  );
}
