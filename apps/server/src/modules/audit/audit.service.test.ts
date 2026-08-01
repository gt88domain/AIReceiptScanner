import assert from "node:assert/strict";
import test from "node:test";
import { redactAuditSnapshot } from "./audit.service";

test("audit snapshots redact sensitive fields at every nesting level", () => {
  assert.deepEqual(
    redactAuditSnapshot({
      status: "published",
      password: "do-not-store",
      profile: { apiToken: "do-not-store", label: "safe" },
    }),
    {
      status: "published",
      password: "[redacted]",
      profile: { apiToken: "[redacted]", label: "safe" },
    },
  );
});
