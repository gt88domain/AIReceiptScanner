/** Web routes that must never be published, indexed, or locale-prefixed. */
export const nonPublicPathPrefixes = [
  "/admin",
  "/api",
  "/auth",
  "/billing",
  "/credits",
  "/dashboard",
  "/design-system",
  "/help",
  "/purchases",
  "/rpc",
  "/settings",
  "/tickets",
  "/users",
] as const;

export function isNonPublicPath(path: string): boolean {
  const pathname = (path.split(/[?#]/)[0] || "/").replace(/\/+$/, "") || "/";
  return nonPublicPathPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
