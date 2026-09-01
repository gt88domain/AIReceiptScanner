import assert from "node:assert/strict";
import test from "node:test";
import { parseContentSurfaceProfile } from "./lib/content-surface-profile.mjs";

test("accepts explicit static and runtime sitemap profiles", () => {
  for (const sitemapMode of ["static", "runtime"]) {
    const profile = parseContentSurfaceProfile(
      JSON.stringify({ schemaVersion: 1, sitemapMode, templateGallery: false }),
    );
    assert.equal(profile.sitemapMode, sitemapMode);
    assert.equal(profile.templateGallery, false);
  }
});

test("rejects incomplete or unsupported content surface profiles", () => {
  for (const source of [
    "not json",
    JSON.stringify({ schemaVersion: 2, sitemapMode: "static", templateGallery: true }),
    JSON.stringify({ schemaVersion: 1, sitemapMode: "generated", templateGallery: true }),
    JSON.stringify({ schemaVersion: 1, sitemapMode: "runtime" }),
  ]) {
    assert.throws(() => parseContentSurfaceProfile(source));
  }
});
