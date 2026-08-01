import assert from "node:assert/strict";
import test from "node:test";
import { getRetryDelaySeconds, MAX_JOB_RETRY_DELAY_SECONDS } from "./job.retry";

test("job retries back off and remain within the Cloudflare Queue delay limit", () => {
  assert.equal(getRetryDelaySeconds(1), 60);
  assert.equal(getRetryDelaySeconds(2), 120);
  assert.equal(getRetryDelaySeconds(20), MAX_JOB_RETRY_DELAY_SECONDS);
});
