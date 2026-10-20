import assert from "node:assert/strict";
import test from "node:test";
import { shouldUseSecureSessionCookie } from "./session-cookie";

test("显式配置优先于代理协议", () => {
  assert.equal(shouldUseSecureSessionCookie("true", "http"), true);
  assert.equal(shouldUseSecureSessionCookie("false", "https"), false);
});

test("未配置时根据转发协议判断", () => {
  assert.equal(shouldUseSecureSessionCookie(undefined, "https"), true);
  assert.equal(shouldUseSecureSessionCookie(undefined, "https, http"), true);
  assert.equal(shouldUseSecureSessionCookie(undefined, "http"), false);
  assert.equal(shouldUseSecureSessionCookie(undefined, null), false);
});
