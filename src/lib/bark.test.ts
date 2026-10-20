import assert from "node:assert/strict";
import test from "node:test";
import { sendBark, validateBarkEndpoint } from "./bark";

test("Bark 地址校验", () => {
  assert.equal(validateBarkEndpoint("https://api.day.app/example-key"), null);
  assert.match(validateBarkEndpoint("ftp://api.day.app/key") ?? "", /HTTP/);
  assert.match(validateBarkEndpoint("https://api.day.app/") ?? "", /完整/);
});

test("Bark 使用 JSON POST 发送", async () => {
  const previousFetch = globalThis.fetch;
  let request: { url: string; init?: RequestInit } | null = null;
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    request = { url: String(input), init };
    return new Response(JSON.stringify({ code: 200, message: "success" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
  try {
    await sendBark("https://api.day.app/example-key", { title: "标题", body: "正文" });
    assert.ok(request);
    const captured = request as { url: string; init?: RequestInit };
    assert.equal(captured.url, "https://api.day.app/example-key");
    assert.equal(captured.init?.method, "POST");
    assert.deepEqual(JSON.parse(String(captured.init?.body)), { title: "标题", body: "正文", group: "TodoAll" });
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("Bark 业务错误会抛出", async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify({ code: 400, message: "bad key" }), {
    status: 200,
    headers: { "content-type": "application/json" },
  })) as typeof fetch;
  try {
    await assert.rejects(() => sendBark("https://api.day.app/example-key", { title: "标题", body: "正文" }), /bad key/);
  } finally {
    globalThis.fetch = previousFetch;
  }
});
