import assert from "node:assert/strict";
import test from "node:test";
import { ORPCError } from "@orpc/server";
import {
  assertBackofficePreviewAllowsExternalActions,
  isBackofficePreview,
} from "./backoffice-preview";

test("Backoffice preview is opt-in and blocks external actions", () => {
  assert.equal(isBackofficePreview({ BACKOFFICE_PREVIEW: "1" }), true);
  assert.equal(isBackofficePreview({ BACKOFFICE_PREVIEW: "0" }), false);
  assert.doesNotThrow(() => assertBackofficePreviewAllowsExternalActions({}));
  assert.throws(
    () => assertBackofficePreviewAllowsExternalActions({ BACKOFFICE_PREVIEW: "1" }),
    (error) =>
      error instanceof ORPCError &&
      error.data?.code === "BACKOFFICE_PREVIEW_EXTERNAL_ACTION_DISABLED",
  );
});
