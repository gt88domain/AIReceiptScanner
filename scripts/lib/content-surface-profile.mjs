export function parseContentSurfaceProfile(source, sourceName = "content surface profile") {
  let profile;
  try {
    profile = JSON.parse(source);
  } catch {
    throw new Error(`${sourceName} must contain valid JSON.`);
  }

  if (
    typeof profile !== "object" ||
    profile === null ||
    profile.schemaVersion !== 1 ||
    !["static", "runtime"].includes(profile.sitemapMode) ||
    typeof profile.templateGallery !== "boolean"
  ) {
    throw new Error(
      `${sourceName} must declare schemaVersion 1, a static/runtime sitemapMode, and a boolean templateGallery.`,
    );
  }

  return profile;
}
