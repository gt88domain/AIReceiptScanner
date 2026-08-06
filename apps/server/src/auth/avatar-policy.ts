import { resolveCommonConfig } from "@repo/app-config";
import { parseRuntimeUrl } from "@repo/shared";

const MAX_AVATAR_URL_LENGTH = 2_048;
const IPV4_ADDRESS = /^\d{1,3}(?:\.\d{1,3}){3}$/;

function isIpLiteral(hostname: string) {
  return IPV4_ADDRESS.test(hostname) || hostname.startsWith("[") || hostname.includes(":");
}

function isSafeConfiguredAvatarHostname(hostname: string) {
  const value = hostname.trim().toLowerCase();
  return (
    /^[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?(?:\.[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?)+$/.test(value) &&
    value !== "localhost" &&
    !isIpLiteral(value)
  );
}

function hasControlCharacter(value: string) {
  return [...value].some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 0x1f || codePoint === 0x7f;
  });
}

/** Resolves the closed avatar-host allowlist from product config and the current Storage URL. */
export function resolveAllowedRemoteAvatarHosts(
  serverUrl: string | undefined,
): ReadonlySet<string> {
  const common = resolveCommonConfig();
  const hosts = new Set(
    (common.auth.allowedRemoteAvatarHosts ?? [])
      .map((hostname) => hostname.toLowerCase())
      .filter(isSafeConfiguredAvatarHostname),
  );
  const server = parseRuntimeUrl(serverUrl);

  if (server.isHttps && server.hostname) {
    hosts.add(server.hostname);
  }

  return hosts;
}

/** Returns a canonical safe avatar URL, or null without exposing an unsafe input. */
export function normalizeAvatarUrl(
  input: string | null | undefined,
  allowedHosts: ReadonlySet<string>,
): string | null {
  if (!input?.trim() || input.length > MAX_AVATAR_URL_LENGTH || hasControlCharacter(input)) {
    return null;
  }

  try {
    const url = new URL(input);
    const hostname = url.hostname.toLowerCase();
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      (url.port && url.port !== "443") ||
      hostname === "localhost" ||
      isIpLiteral(hostname) ||
      !allowedHosts.has(hostname)
    ) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

export function normalizeAvatarForOutput<T extends { image?: string | null }>(
  value: T,
  serverUrl: string | undefined,
): T {
  return {
    ...value,
    image: normalizeAvatarUrl(value.image, resolveAllowedRemoteAvatarHosts(serverUrl)),
  };
}
