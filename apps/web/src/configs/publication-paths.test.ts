import { readFileSync } from "node:fs";
import { isValidLocale, supportedLocales } from "@repo/i18n";
import { describe, expect, it } from "vitest";
import { createRobotsTxt } from "../../scripts/robots.mjs";
import { buildSeoHead } from "../utils/seo";
import { nonPublicPathPrefixes } from "./non-public-paths";
import {
  createPublishedPublicPages,
  isNonPublicPublishedPath,
  isPrerenderablePath,
  shouldNoIndexResponse,
} from "./publication-paths";

const publishedPublicPages = createPublishedPublicPages({
  defaultLocale: "en",
  supportedLocales,
});

describe("published web paths", () => {
  it("publishes only the English public surface", () => {
    expect(supportedLocales).toEqual(["en"]);
    expect(publishedPublicPages).toEqual(["/", "/privacy", "/terms"]);
    expect(isValidLocale("en")).toBe(true);
    expect(isValidLocale("zh")).toBe(false);
    expect(isValidLocale("jp")).toBe(false);
  });

  it("emits only English and x-default alternate links", () => {
    const head = buildSeoHead({
      title: "English-only page",
      canonicalPath: "/privacy",
      locale: "en",
    });

    expect(
      head.links.filter(({ rel }) => rel === "alternate").map(({ hrefLang }) => hrefLang),
    ).toEqual(["en", "x-default"]);
  });

  it("keeps every private prefix out of prerendering, indexing, and robots", () => {
    const robots = createRobotsTxt("https://example.test", nonPublicPathPrefixes);

    for (const prefix of nonPublicPathPrefixes) {
      expect(isNonPublicPublishedPath(prefix, supportedLocales)).toBe(true);
      expect(isNonPublicPublishedPath(`/en${prefix}/example`, supportedLocales)).toBe(true);
      expect(isPrerenderablePath(prefix, supportedLocales)).toBe(false);
      expect(isPrerenderablePath(`/en${prefix}/example`, supportedLocales)).toBe(false);
      expect(robots).toContain(`Disallow: ${prefix}`);
    }
  });

  it("keeps public pages prerenderable and noindexes real 404 responses", () => {
    for (const path of publishedPublicPages) {
      expect(isPrerenderablePath(path, supportedLocales)).toBe(true);
      expect(shouldNoIndexResponse(200, path, supportedLocales)).toBe(false);
    }
    expect(shouldNoIndexResponse(404, "/missing-page", supportedLocales)).toBe(true);

    const catchAllRoute = readFileSync(new URL("../routes/$.tsx", import.meta.url), "utf8");
    expect(catchAllRoute).toContain("throw notFound()");
    expect(catchAllRoute).toContain("notFoundComponent: () => <NotFound404 />");
  });
});
