export function shouldUseSecureSessionCookie(
  configuredValue: string | undefined,
  forwardedProto: string | null,
): boolean {
  const configured = configuredValue?.trim().toLowerCase();

  if (configured === "true") return true;
  if (configured === "false") return false;

  const requestProtocol = forwardedProto
    ?.split(",")[0]
    ?.trim()
    .toLowerCase();

  return requestProtocol === "https";
}
