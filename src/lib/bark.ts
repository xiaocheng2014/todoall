export type BarkMessage = {
  title: string;
  body: string;
  group?: string;
};

export function validateBarkEndpoint(value: string): string | null {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return "通知地址只支持 HTTP 或 HTTPS";
    if (url.username || url.password) return "通知地址不能包含用户名或密码";
    if (!url.hostname || url.pathname === "/") return "请输入完整的 Bark 通知地址";
    return null;
  } catch {
    return "Bark 通知地址格式不正确";
  }
}

export async function sendBark(endpoint: string, message: BarkMessage): Promise<void> {
  const validationError = validateBarkEndpoint(endpoint);
  if (validationError) throw new Error(validationError);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      title: message.title,
      body: message.body,
      group: message.group ?? "TodoAll",
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) throw new Error(`Bark 返回 HTTP ${response.status}`);
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = await response.json() as { code?: number; message?: string };
    if (body.code !== undefined && body.code !== 200) {
      throw new Error(body.message ? `Bark 返回：${body.message}` : `Bark 返回错误码 ${body.code}`);
    }
  }
}
