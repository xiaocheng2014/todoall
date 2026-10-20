"use server";

import { revalidatePath } from "next/cache";
import { sendBark, validateBarkEndpoint } from "@/lib/bark";
import { db } from "@/lib/db";
import { decryptSecret, encryptSecret } from "@/lib/secrets";
import { requireUser } from "@/lib/session";

export type NotificationActionState = { error: string | null; success: string | null };

export async function notificationSettingsAction(
  _previousState: NotificationActionState,
  formData: FormData,
): Promise<NotificationActionState> {
  const current = await requireUser();
  const userId = current.session.user.id;
  const intent = String(formData.get("intent") ?? "save");
  const endpointInput = String(formData.get("endpoint") ?? "").trim();
  const existing = await db.notificationSetting.findUnique({ where: { userId } });

  let endpoint: string | null = null;
  if (endpointInput) endpoint = endpointInput;
  else if (existing?.barkEndpointEncrypted) {
    try { endpoint = decryptSecret(existing.barkEndpointEncrypted); }
    catch { return { error: "已保存的通知地址无法解密，请重新填写", success: null }; }
  }

  if (intent === "test") {
    if (!endpoint) return { error: "请先填写 Bark 通知地址", success: null };
    const error = validateBarkEndpoint(endpoint);
    if (error) return { error, success: null };
    try {
      await sendBark(endpoint, { title: "TodoAll 测试通知", body: "连接成功，今后的计划提醒会发送到这里。" });
      return { error: null, success: "测试通知已发送" };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "测试通知发送失败", success: null };
    }
  }

  const removeEndpoint = formData.get("removeEndpoint") === "on";
  const barkEnabled = formData.get("barkEnabled") === "on";
  const dailySummaryEnabled = formData.get("dailySummaryEnabled") === "on";
  const timedReminderEnabled = formData.get("timedReminderEnabled") === "on";
  const dailySummaryTime = String(formData.get("dailySummaryTime") ?? "22:00");
  const defaultOffsetMinutes = Number(formData.get("defaultOffsetMinutes") ?? 1);

  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(dailySummaryTime)) return { error: "每日提醒时间格式不正确", success: null };
  if (!Number.isInteger(defaultOffsetMinutes) || defaultOffsetMinutes < 1 || defaultOffsetMinutes > 1440) {
    return { error: "提前提醒时间需要在 1～1440 分钟之间", success: null };
  }
  if (barkEnabled && (removeEndpoint || !endpoint)) return { error: "开启 Bark 前请填写通知地址", success: null };
  if (endpoint && !removeEndpoint) {
    const error = validateBarkEndpoint(endpoint);
    if (error) return { error, success: null };
  }

  try {
    await db.notificationSetting.upsert({
      where: { userId },
      create: {
        userId,
        barkEnabled,
        barkEndpointEncrypted: endpoint && !removeEndpoint ? encryptSecret(endpoint) : null,
        dailySummaryEnabled,
        dailySummaryTime,
        timedReminderEnabled,
        defaultOffsetMinutes,
      },
      update: {
        barkEnabled,
        barkEndpointEncrypted: removeEndpoint ? null : endpointInput ? encryptSecret(endpointInput) : undefined,
        dailySummaryEnabled,
        dailySummaryTime,
        timedReminderEnabled,
        defaultOffsetMinutes,
      },
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "通知设置保存失败", success: null };
  }
  revalidatePath("/me/notifications");
  return { error: null, success: "通知设置已保存" };
}
