declare const __EASYSTARTER_PROFILE_BUILD__: string | undefined;
declare const __EASYSTARTER_BACKOFFICE_PREVIEW_TICKETS__: string | undefined;

/** Build tools replace this value; ordinary source runs keep the configured default product. */
export function resolveProfileBuildId() {
  return typeof __EASYSTARTER_PROFILE_BUILD__ === "string"
    ? __EASYSTARTER_PROFILE_BUILD__
    : undefined;
}

/** Deliberately local-only switch injected by the isolated Backoffice preview build. */
export function isBackofficePreviewTicketsEnabled() {
  return (
    typeof __EASYSTARTER_BACKOFFICE_PREVIEW_TICKETS__ === "string" &&
    __EASYSTARTER_BACKOFFICE_PREVIEW_TICKETS__ === "1"
  );
}
