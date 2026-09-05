import { getSetCookie } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import { getAuthConfig } from "@/configs/app-config";
import { getCurrentLocale } from "@/i18n";

const config = getAuthConfig();
const pendingKey = `${config.storagePrefix}_oauth_handoff`;
let completion: { handoff: string; promise: Promise<void> } | undefined;

function authURL(path: string) {
  const base = process.env.EXPO_PUBLIC_SERVER_API_URL;
  if (!base) throw new Error("EXPO_PUBLIC_SERVER_API_URL is required");
  return `${base.replace(/\/$/, "")}/api/auth${path}`;
}

async function post(path: string, body: Record<string, unknown>) {
  // Deliberately bypass Expo's automatic social-result cookie import. Cookies are
  // installed only by completeNativeOAuth after matching the initiating device.
  const response = await fetch(authURL(path), {
    method: "POST",
    credentials: "omit",
    headers: {
      "content-type": "application/json",
      "expo-origin": `${config.scheme}://`,
      "accept-language": getCurrentLocale(),
    },
    body: JSON.stringify(body),
  });
  const result: unknown = await response.json();
  if (!response.ok || !result || typeof result !== "object") {
    throw new Error("Native sign-in failed. Please try again.");
  }
  return result;
}

export function completeNativeOAuth(handoff: string): Promise<void> {
  // The browser completion and the deep-link screen can arrive together.
  if (completion?.handoff === handoff) return completion.promise;
  const promise = (async () => {
    const saved = SecureStore.getItem(pendingKey);
    if (!saved) throw new Error("No matching sign-in was started on this device.");
    const pending = JSON.parse(saved) as { handoff: string; nonce: string; expiresAt: number };
    if (pending.handoff !== handoff || pending.expiresAt <= Date.now()) {
      throw new Error("This sign-in does not match this device or has expired.");
    }
    const result = await post("/expo-exchange-handoff", { handoff, nonce: pending.nonce });
    if (!("cookie" in result) || typeof result.cookie !== "string" || !result.cookie) {
      throw new Error("Authentication session was not created.");
    }
    // A new local sign-in supersedes any older request still awaiting its exchange.
    if (SecureStore.getItem(pendingKey) !== saved) {
      throw new Error("This sign-in was superseded by a newer request.");
    }
    const cookie = getSetCookie(result.cookie, SecureStore.getItem(config.cookieStorageKey) ?? undefined);
    SecureStore.setItem(config.cookieStorageKey, cookie);
    await SecureStore.deleteItemAsync(pendingKey);
  })();
  completion = { handoff, promise };
  return promise;
}

export async function startNativeOAuth(provider: "github" | "google"): Promise<boolean> {
  const response = await post("/sign-in/social", {
    provider,
    callbackURL: config.callbackURL,
    errorCallbackURL: config.callbackURL,
    disableRedirect: true,
  });
  if (
    !("url" in response) || typeof response.url !== "string" ||
    !("handoff" in response) || typeof response.handoff !== "string" ||
    !("nonce" in response) || typeof response.nonce !== "string" || response.nonce.length !== 72
  ) throw new Error("The server does not support secure native sign-in.");
  const target = new URL(response.url);
  const expected = new URL(authURL("/expo-authorization-proxy"));
  if (target.origin !== expected.origin || target.pathname !== expected.pathname ||
      target.searchParams.get("handoff") !== response.handoff) {
    throw new Error("Invalid native authorization handoff.");
  }
  const saved = JSON.stringify({
    handoff: response.handoff, nonce: response.nonce, expiresAt: Date.now() + 600_000,
  });
  SecureStore.setItem(pendingKey, saved);
  completion = undefined;
  try {
    const result = await WebBrowser.openAuthSessionAsync(response.url, config.callbackURL);
    if (result.type !== "success") return false;
    const callback = new URL(result.url);
    const expectedCallback = new URL(config.callbackURL);
    if (callback.protocol !== expectedCallback.protocol || callback.host !== expectedCallback.host ||
        callback.pathname !== expectedCallback.pathname ||
        callback.searchParams.get("expoFlow") !== response.handoff) {
      throw new Error("The sign-in callback does not match this device.");
    }
    if (callback.searchParams.has("error")) throw new Error("Native sign-in failed. Please try again.");
    await completeNativeOAuth(response.handoff);
    return true;
  } finally {
    const activeCompletion = completion as
      | { handoff: string; promise: Promise<void> }
      | undefined;
    if (activeCompletion?.handoff === response.handoff) {
      await activeCompletion.promise.catch(() => undefined);
    }
    // Do not clear a newer flow's nonce when an old browser is dismissed.
    if (SecureStore.getItem(pendingKey) === saved) await SecureStore.deleteItemAsync(pendingKey);
  }
}
