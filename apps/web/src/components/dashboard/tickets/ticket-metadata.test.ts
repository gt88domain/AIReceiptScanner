import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { TicketMetadata } from "./ticket-metadata";

describe("TicketMetadata", () => {
  it("renders untrusted metadata as text instead of HTML", () => {
    const markup = renderToStaticMarkup(
      createElement(TicketMetadata, {
        metadata: { payload: '<img src=x onerror="alert(1)"><script>alert(1)</script>' },
      }),
    );

    expect(markup).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
    expect(markup).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(markup).not.toContain("<script>");
    expect(markup).not.toContain("<img ");
  });

  it("omits absent metadata and bounds deeply nested or oversized values", () => {
    expect(renderToStaticMarkup(createElement(TicketMetadata, { metadata: null }))).toBe("");
    const markup = renderToStaticMarkup(
      createElement(TicketMetadata, {
        metadata: {
          nested: { one: { two: { three: { four: { five: "hidden" } } } } },
          entries: Object.fromEntries(
            Array.from({ length: 21 }, (_, index) => [`key-${index}`, index]),
          ),
        },
      }),
    );

    expect(markup).toContain("Nested value omitted.");
    expect(markup).toContain("Additional values omitted.");
  });
});
