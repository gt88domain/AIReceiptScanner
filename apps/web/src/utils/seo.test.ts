import { describe, expect, it } from "vitest";
import { buildBreadcrumbListJsonLd } from "./seo";

describe("buildBreadcrumbListJsonLd", () => {
  it("omits short trails and preserves route-owned labels and URLs", () => {
    expect(
      buildBreadcrumbListJsonLd([{ href: "https://directory.example/games", name: "Games" }]),
    ).toBeUndefined();

    expect(
      buildBreadcrumbListJsonLd([
        { href: "https://directory.example/games?sort=top", name: "Top games" },
        { href: "https://directory.example/games/puzzle%20box", name: "Puzzle & Logic" },
      ]),
    ).toEqual({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          item: "https://directory.example/games?sort=top",
          name: "Top games",
          position: 1,
        },
        {
          "@type": "ListItem",
          item: "https://directory.example/games/puzzle%20box",
          name: "Puzzle & Logic",
          position: 2,
        },
      ],
    });
  });
});
