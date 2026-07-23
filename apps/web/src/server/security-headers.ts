const securityHeaders = {
  "Content-Security-Policy": "base-uri 'self'; frame-ancestors 'none'; object-src 'none'",
  "Permissions-Policy": "camera=(), geolocation=(), microphone=()",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=31536000",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
} as const;

export function applySecurityHeaders(response: Response): Response {
  const nextResponse = new Response(response.body, response);

  for (const [name, value] of Object.entries(securityHeaders)) {
    nextResponse.headers.set(name, value);
  }

  return nextResponse;
}
