import assert from "node:assert/strict";
import test from "node:test";
import { canDeleteGoal, canDeletePlan } from "./deletion";

test("只有已结束的计划可以删除", () => {
  assert.equal(canDeletePlan("ENDED"), true);
  assert.equal(canDeletePlan("ACTIVE"), false);
  assert.equal(canDeletePlan("PAUSED"), false);
});

test("只有已完成或已放弃的目标可以删除", () => {
  assert.equal(canDeleteGoal("COMPLETED"), true);
  assert.equal(canDeleteGoal("ABANDONED"), true);
  assert.equal(canDeleteGoal("ACTIVE"), false);
  assert.equal(canDeleteGoal("PAUSED"), false);
});
