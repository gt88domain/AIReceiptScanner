import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import type { ServerApp } from "@/app/types";
import { registerNovelMobileReadRoutes } from "@/modules/novels/mobile-http";

describe("AINovel mobile read surface", () => {
  it("registers only versioned read routes with GET handlers", () => {
    const app = new Hono<{ Bindings: Cloudflare.Env }>() as ServerApp;

    registerNovelMobileReadRoutes(app);

    expect(app.routes.map(({ method, path }) => ({ method, path }))).toEqual([
      { method: "GET", path: "/mobile/v1/novels" },
      { method: "GET", path: "/mobile/v1/novels/:slug" },
      { method: "GET", path: "/mobile/v1/novels/:slug/chapters" },
      { method: "GET", path: "/mobile/v1/novels/:slug/chapters/:number" },
      { method: "GET", path: "/mobile/v1/meta" },
    ]);
  });
});
