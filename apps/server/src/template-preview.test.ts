import assert from "node:assert/strict";
import test from "node:test";
import { handleTemplatePreviewRequest } from "./template-preview";

const previewUrl = "https://easystarter-template-server-preview.gt88hel.workers.dev";
const previewWebOrigin = "https://easystarter-template-preview.gt88hel.workers.dev";

test("template preview exposes only anonymous auth reads", async () => {
  const session = await handleTemplatePreviewRequest(
    new Request(`${previewUrl}/api/auth/get-session`, {
      headers: { Origin: previewWebOrigin },
    }),
  );
  assert.equal(session.status, 200);
  assert.equal(await session.json(), null);
  assert.equal(session.headers.get("Access-Control-Allow-Origin"), previewWebOrigin);

  const foreignOriginSession = await handleTemplatePreviewRequest(
    new Request(`${previewUrl}/api/auth/get-session`, {
      headers: { Origin: "https://example.invalid" },
    }),
  );
  assert.equal(foreignOriginSession.status, 200);
  assert.equal(foreignOriginSession.headers.get("Access-Control-Allow-Origin"), null);

  const currentUser = await handleTemplatePreviewRequest(
    new Request(`${previewUrl}/rpc/getCurrentUser`, {
      body: "{}",
      headers: { "Content-Type": "application/json" },
      method: "POST",
    }),
  );
  assert.equal(currentUser.status, 200);
  assert.deepEqual(await currentUser.json(), { json: null });

  const preflight = await handleTemplatePreviewRequest(
    new Request(`${previewUrl}/rpc/getCurrentUser`, {
      headers: { Origin: previewWebOrigin },
      method: "OPTIONS",
    }),
  );
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get("Access-Control-Allow-Origin"), previewWebOrigin);

  const write = await handleTemplatePreviewRequest(
    new Request(`${previewUrl}/rpc/users/update`, {
      body: "{}",
      headers: { "Content-Type": "application/json" },
      method: "POST",
    }),
  );
  assert.equal(write.status, 404);
  assert.deepEqual(await write.json(), { error: "template_preview_read_only" });
});
