import { getClientIp, normalizeHeaderValue } from "@repo/shared";

const recentAttempts = new Map<string, number>();

/**
 * Applies a small per-isolate throttle to anonymous form submissions.
 *
 * ponytail: this is per Worker isolate, so production deployments should add a
 * Cloudflare WAF rate-limit rule for global abuse control.
 */
export function isRequestRateLimited(
  request: Request,
  namespace: string,
  retryAfterMs: number,
  options: { cloudflareOnly?: boolean } = {},
): boolean {
  const clientIp = options.cloudflareOnly
    ? (normalizeHeaderValue(request.headers.get("cf-connecting-ip")) ?? "missing-cloudflare-ip")
    : getClientIp(request.headers);
  if (!clientIp) return false;

  const key = `${namespace}:${clientIp}`;
  const now = Date.now();
  const previousAttempt = recentAttempts.get(key);
  if (previousAttempt && now - previousAttempt < retryAfterMs) return true;

  recentAttempts.set(key, now);
  if (recentAttempts.size > 5_000) {
    for (const [attemptKey, attemptedAt] of recentAttempts) {
      if (now - attemptedAt >= retryAfterMs) recentAttempts.delete(attemptKey);
    }
  }

  return false;
}
