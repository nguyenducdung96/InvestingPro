// Next may construct request.url with its internal hostname behind a proxy.
// Host is the HTTP authority received by this app; do not trust forwarded-host.
export function sameOrigin(request: Request, required = false) {
  const origin = request.headers.get("Origin");
  if (!origin) return !required;
  const url = new URL(request.url);
  const authority = request.headers.get("Host") ?? url.host;
  return origin === `${url.protocol}//${authority}`;
}
