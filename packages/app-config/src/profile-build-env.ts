declare const __EASYSTARTER_PROFILE_BUILD__: string | undefined;

/** Build tools replace this value; ordinary source runs keep the configured default product. */
export function resolveProfileBuildId() {
  return typeof __EASYSTARTER_PROFILE_BUILD__ === "string"
    ? __EASYSTARTER_PROFILE_BUILD__
    : undefined;
}
