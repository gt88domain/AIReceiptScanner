import assert from "node:assert/strict";
import test from "node:test";
import { createExpoAuthPlugin } from "./expo-plugin";

test("Expo auth plugin forwards expo-origin when Origin is absent", async () => {
  const plugin = createExpoAuthPlugin();
  const request = new Request("https://api.example.test/api/auth/sign-in", {
    headers: { "expo-origin": "easystarter-native://" },
  });

  const result = await plugin.onRequest(request);

  assert.equal(result?.request.headers.get("origin"), "easystarter-native://");
});
