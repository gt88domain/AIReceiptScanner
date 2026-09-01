import { describe, expect, it } from "vitest";
import { publicRuntimeConfig, resolvePublicRuntimeConfig } from "../public-runtime";

describe("public runtime navigation", () => {
  it("keeps product navigation empty by default", () => {
    expect(publicRuntimeConfig.publicNavigation).toEqual([]);
  });

  it("preserves product navigation while resolving a profile", () => {
    expect(resolvePublicRuntimeConfig().publicNavigation).toBe(
      publicRuntimeConfig.publicNavigation,
    );
  });
});
