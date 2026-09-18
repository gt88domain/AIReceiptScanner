import assert from "node:assert/strict";
import test from "node:test";
import { isStorageEnabled } from "../access";

test("storage is disabled in the default template configuration", () => {
  assert.equal(isStorageEnabled(), false);
});
