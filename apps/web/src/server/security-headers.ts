function createSecurityHeaders(serverUrl: string) {
  const serverOrigin = new URL(serverUrl).origin;
  const contentSecurityPolicy = [
    "default-src 'self'",
    "base-uri 'self'",
    `connect-src 'self' ${serverOrigin} https://*.google-analytics.com https://*.openpanel.dev https://challenges.cloudflare.com`,
    "font-src 'self' data:",
    "frame-ancestors 'none'",
    "frame-src https://challenges.cloudflare.com",
    "img-src 'self' data: https:",
    "object-src 'none'",
    "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://challenges.cloudflare.com",
    "style-src 'self' 'unsafe-inline'",
  ].join("; ");

  return {
    "Content-Security-Policy": contentSecurityPolicy,
    "Permissions-Policy": "camera=(), geolocation=(), microphone=()",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
  } as const;
}

export function applySecurityHeaders(response: Response, serverUrl: string): Response {
  const nextResponse = new Response(response.body, response);

  for (const [name, value] of Object.entries(createSecurityHeaders(serverUrl))) {
    nextResponse.headers.set(name, value);
  }

  return nextResponse;
}
