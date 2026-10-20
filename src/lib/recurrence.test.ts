import assert from "node:assert/strict";
import test from "node:test";
import { getZonedDate, zonedDateTimeToUtc } from "@/lib/dates";
import { isPlanScheduledOnDate } from "@/lib/recurrence";

const basePlan = {
  startDate: "2026-10-20",
  endDate: null,
  weekdays: null,
  durationDays: null,
};

test("单次计划只在指定日期执行", () => {
  const plan = { ...basePlan, recurrenceType: "ONCE" };
  assert.equal(isPlanScheduledOnDate(plan, "2026-10-20", 2), true);
  assert.equal(isPlanScheduledOnDate(plan, "2026-10-21", 3), false);
});

test("每日计划遵守结束日期", () => {
  const plan = {
    ...basePlan,
    recurrenceType: "DAILY",
    endDate: "2026-10-22",
  };
  assert.equal(isPlanScheduledOnDate(plan, "2026-10-22", 4), true);
  assert.equal(isPlanScheduledOnDate(plan, "2026-10-23", 5), false);
});

test("每周计划只匹配勾选的星期", () => {
  const plan = {
    ...basePlan,
    recurrenceType: "WEEKLY",
    weekdays: JSON.stringify([1, 3, 5]),
  };
  assert.equal(isPlanScheduledOnDate(plan, "2026-10-21", 3), true);
  assert.equal(isPlanScheduledOnDate(plan, "2026-10-22", 4), false);
});

test("连续计划包含开始当天", () => {
  const plan = {
    ...basePlan,
    recurrenceType: "CONSECUTIVE",
    durationDays: 3,
  };
  assert.equal(isPlanScheduledOnDate(plan, "2026-10-20", 2), true);
  assert.equal(isPlanScheduledOnDate(plan, "2026-10-22", 4), true);
  assert.equal(isPlanScheduledOnDate(plan, "2026-10-23", 5), false);
});

test("按用户时区计算日期和执行时刻", () => {
  const local = getZonedDate(new Date("2026-10-19T16:30:00Z"), "Asia/Shanghai");
  assert.deepEqual(local, { date: "2026-10-20", weekday: 2 });

  const executionAt = zonedDateTimeToUtc(
    "2026-10-20",
    "20:00",
    "Asia/Shanghai",
  );
  assert.equal(executionAt.toISOString(), "2026-10-20T12:00:00.000Z");
});
