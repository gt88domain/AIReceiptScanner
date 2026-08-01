const MAX_RETRY_DELAY_SECONDS = 12 * 60 * 60;

export function getRetryDelaySeconds(attempt: number) {
  return Math.min(60 * 2 ** Math.max(0, attempt - 1), MAX_RETRY_DELAY_SECONDS);
}
