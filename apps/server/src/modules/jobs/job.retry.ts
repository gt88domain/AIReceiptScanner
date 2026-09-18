/** Cloudflare Queue supports an explicit retry delay of up to 24 hours. */
export const MAX_JOB_RETRY_DELAY_SECONDS = 24 * 60 * 60;

export function getRetryDelaySeconds(attempt: number) {
  return Math.min(60 * 2 ** Math.max(0, attempt - 1), MAX_JOB_RETRY_DELAY_SECONDS);
}
