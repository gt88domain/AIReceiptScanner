import { describe, expect, it } from "vitest";
import { verifyAppleIdentityToken } from "@/lib/apple-auth";

describe("Apple identity tokens", () => {
  it("rejects a token that does not use Apple's fixed RS256 algorithm", async () => {
    const token = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0In0.invalid";

    await expect(verifyAppleIdentityToken(token)).resolves.toBe(false);
  });
});
