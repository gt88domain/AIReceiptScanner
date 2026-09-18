import assert from "node:assert/strict";
import test from "node:test";
import { createJobRegistry } from "./job.registry";

test("job registry stores one handler for each product-owned job type", () => {
  const registry = createJobRegistry();
  const handler = async () => ({ sent: true });

  registry.register("email.send", handler);
  assert.equal(registry.handlers["email.send"], handler);
  assert.throws(() => registry.register("email.send", handler), /already registered/);
});
