import assert from "node:assert/strict";
import test from "node:test";
import { getRetryDelaySeconds } from "./job.retry";

test("job retries back off and remain within the Cloudflare Queue delay limit", () => {
  assert.equal(getRetryDelaySeconds(1), 60);
  assert.equal(getRetryDelaySeconds(2), 120);
  assert.equal(getRetryDelaySeconds(20), 12 * 60 * 60);
});
