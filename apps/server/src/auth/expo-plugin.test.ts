import assert from "node:assert/strict";
import test from "node:test";
import {
  createExpoAuthPlugin,
  EXPO_AUTH_PLUGIN_COMPAT_VERSION,
  forwardExpoCallbackCookie,
} from "./expo-plugin";

test("Expo auth plugin forwards expo-origin when Origin is absent", async () => {
  const plugin = createExpoAuthPlugin();
  const request = new Request("https://api.example.test/api/auth/sign-in", {
    headers: { "expo-origin": "easystarter-native://" },
  });

  const result = await plugin.onRequest(request);

  assert.equal(result?.request.headers.get("origin"), "easystarter-native://");
});

test("Expo auth plugin preserves an existing Origin header", async () => {
  const plugin = createExpoAuthPlugin();
  const request = new Request("https://api.example.test/api/auth/sign-in", {
    headers: {
      origin: "https://web.example.test",
      "expo-origin": "easystarter-native://",
    },
  });

  const result = await plugin.onRequest(request);

  assert.equal(result, undefined);
  assert.equal(request.headers.get("origin"), "https://web.example.test");
});

test("Expo auth plugin only permits exp origins during development", () => {
  const previousNodeEnv = process.env.NODE_ENV;

  try {
    Reflect.set(process.env, "NODE_ENV", "development");
    assert.deepEqual(createExpoAuthPlugin().init().options.trustedOrigins, ["exp://"]);

    Reflect.set(process.env, "NODE_ENV", "production");
    assert.deepEqual(createExpoAuthPlugin().init().options.trustedOrigins, []);
  } finally {
    if (previousNodeEnv === undefined) {
      Reflect.deleteProperty(process.env, "NODE_ENV");
    } else {
      Reflect.set(process.env, "NODE_ENV", previousNodeEnv);
    }
  }
});

test("Expo authorization proxy signs the provider state before redirecting", async () => {
  const plugin = createExpoAuthPlugin();
  const result = await plugin.endpoints.expoAuthorizationProxy({
    asResponse: true,
    query: {
      authorizationURL: "https://oauth.example.test/authorize?state=provider-state",
    },
    context: {
      baseURL: "https://api.example.test",
      secret: "test-secret",
      createAuthCookie: (name: string, attributes: Record<string, unknown>) => ({
        name: `better-auth.${name}`,
        attributes,
      }),
    },
  });

  assert.equal(result.status, 302);
  assert.equal(
    result.headers.get("location"),
    "https://oauth.example.test/authorize?state=provider-state",
  );
  assert.match(result.headers.get("set-cookie") ?? "", /better-auth\.state=/);
});

test("Expo authorization proxy stores an OAuth state without signing it", async () => {
  const plugin = createExpoAuthPlugin();
  const result = await plugin.endpoints.expoAuthorizationProxy({
    asResponse: true,
    query: {
      authorizationURL: "https://oauth.example.test/authorize",
      oauthState: "oauth-state",
    },
    context: {
      baseURL: "https://api.example.test",
      secret: "test-secret",
      createAuthCookie: (name: string, attributes: Record<string, unknown>) => ({
        name: `better-auth.${name}`,
        attributes,
      }),
    },
  });

  assert.equal(result.status, 302);
  assert.match(result.headers.get("set-cookie") ?? "", /better-auth\.oauth_state=oauth-state/);
});

test("Expo authorization proxy rejects a provider URL without state", async () => {
  const plugin = createExpoAuthPlugin();
  const result = await plugin.endpoints.expoAuthorizationProxy({
    asResponse: true,
    query: { authorizationURL: "https://oauth.example.test/authorize" },
    context: {
      baseURL: "https://api.example.test",
      secret: "test-secret",
      createAuthCookie: (name: string, attributes: Record<string, unknown>) => ({
        name: `better-auth.${name}`,
        attributes,
      }),
    },
  });

  assert.equal(result.status, 400);
});

test("Expo authorization proxy rejects unsafe redirect targets", async () => {
  const plugin = createExpoAuthPlugin();

  for (const authorizationURL of [
    "http://oauth.example.test/authorize?state=provider-state",
    "https://api.example.test/authorize?state=provider-state",
    "https://oauth.example.test/authorize#fragment",
  ]) {
    const result = await plugin.endpoints.expoAuthorizationProxy({
      asResponse: true,
      query: { authorizationURL },
      context: {
        baseURL: "https://api.example.test",
        secret: "test-secret",
        createAuthCookie: (name: string, attributes: Record<string, unknown>) => ({
          name: `better-auth.${name}`,
          attributes,
        }),
      },
    });

    assert.equal(result.status, 400);
  }
});

test("Expo auth plugin records the pinned compatibility version", () => {
  assert.equal(createExpoAuthPlugin().version, EXPO_AUTH_PLUGIN_COMPAT_VERSION);
});

test("Expo callback forwards cookies only to a trusted custom scheme", async () => {
  const headers = new Headers({
    location: "easystarter-native://callback",
    "set-cookie": "session=opaque; Path=/; HttpOnly",
  });

  forwardExpoCallbackCookie({
    responseHeaders: headers,
    isTrustedOrigin: (origin) => origin === "easystarter-native://callback",
    setHeader: (name: string, value: string) => headers.set(name, value),
  });

  assert.equal(
    headers.get("location"),
    "easystarter-native://callback?cookie=session%3Dopaque%3B+Path%3D%2F%3B+HttpOnly",
  );
});

test("Expo callback does not forward cookies to an untrusted redirect", async () => {
  const headers = new Headers({
    location: "untrusted-native://callback",
    "set-cookie": "session=opaque; Path=/; HttpOnly",
  });

  forwardExpoCallbackCookie({
    responseHeaders: headers,
    isTrustedOrigin: () => false,
    setHeader: (name: string, value: string) => headers.set(name, value),
  });

  assert.equal(headers.get("location"), "untrusted-native://callback");
});
