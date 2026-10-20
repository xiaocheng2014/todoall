import { daysBetween } from "@/lib/dates";

export const recurrenceTypes = ["ONCE", "DAILY", "WEEKLY", "CONSECUTIVE"] as const;
export type RecurrenceType = (typeof recurrenceTypes)[number];

export const recurrenceLabels: Record<RecurrenceType, string> = {
  ONCE: "仅一次",
  DAILY: "每天",
  WEEKLY: "每周指定日期",
  CONSECUTIVE: "连续若干天",
};

export type SchedulablePlan = {
  recurrenceType: string;
  startDate: string;
  endDate: string | null;
  weekdays: string | null;
  durationDays: number | null;
};

export function isRecurrenceType(value: string): value is RecurrenceType {
  return recurrenceTypes.includes(value as RecurrenceType);
}

export function parseWeekdays(value: string | null): number[] {
  if (!value) return [];

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is number => Number.isInteger(item) && item >= 1 && item <= 7,
    );
  } catch {
    return [];
  }
}

export function isPlanScheduledOnDate(
  plan: SchedulablePlan,
  date: string,
  isoWeekday: number,
): boolean {
  if (date < plan.startDate || (plan.endDate && date > plan.endDate)) {
    return false;
  }

  if (plan.recurrenceType === "ONCE") {
    return date === plan.startDate;
  }

  if (plan.recurrenceType === "DAILY") {
    return true;
  }

  if (plan.recurrenceType === "WEEKLY") {
    return parseWeekdays(plan.weekdays).includes(isoWeekday);
  }

  if (plan.recurrenceType === "CONSECUTIVE") {
    const elapsedDays = daysBetween(plan.startDate, date);
    return elapsedDays >= 0 && elapsedDays < (plan.durationDays ?? 0);
  }

  return false;
}

export function describeRecurrence(plan: SchedulablePlan): string {
  if (plan.recurrenceType === "ONCE") return `${plan.startDate} 执行一次`;
  if (plan.recurrenceType === "DAILY") return "每天";
  if (plan.recurrenceType === "CONSECUTIVE") {
    return `连续 ${plan.durationDays ?? 0} 天`;
  }
  if (plan.recurrenceType === "WEEKLY") {
    const labels = ["一", "二", "三", "四", "五", "六", "日"];
    const days = parseWeekdays(plan.weekdays).map((day) => `周${labels[day - 1]}`);
    return days.join("、") || "每周";
  }
  return "未知规则";
}
