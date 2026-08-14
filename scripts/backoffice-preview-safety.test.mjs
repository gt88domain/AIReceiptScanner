import assert from "node:assert/strict";
import test from "node:test";
import {
  BACKOFFICE_PREVIEW_D1_ID,
  BACKOFFICE_PREVIEW_WORKER,
  assertBackofficePreviewSafety,
} from "./backoffice-preview-safety.mjs";

const safeConfig = {
  backofficePreview: "1",
  nodeEnv: "development",
  workerName: BACKOFFICE_PREVIEW_WORKER,
  d1DatabaseId: BACKOFFICE_PREVIEW_D1_ID,
  isLocal: true,
};

test("Backoffice preview accepts only its local configuration", () => {
  assert.doesNotThrow(() => assertBackofficePreviewSafety(safeConfig));
});

test("Backoffice preview fails closed for production Worker or D1 configuration", () => {
  assert.throws(() => assertBackofficePreviewSafety({ ...safeConfig, nodeEnv: "production" }));
  assert.throws(() =>
    assertBackofficePreviewSafety({ ...safeConfig, workerName: "aibranding-next-server" }),
  );
  assert.throws(() =>
    assertBackofficePreviewSafety({ ...safeConfig, d1DatabaseId: "production-d1-id" }),
  );
  assert.throws(() => assertBackofficePreviewSafety({ ...safeConfig, isLocal: false }));
});
