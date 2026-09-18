import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { resolveEmailContent } from "./resend";

test("React email templates render HTML and plain text", async () => {
  const content = await resolveEmailContent({
    template: createElement(
      "main",
      null,
      createElement("p", null, "Verify your account"),
      createElement("a", { href: "https://example.test/verify" }, "Continue"),
    ),
  });

  assert.match(content.html ?? "", /Verify your account/);
  assert.match(content.text ?? "", /Verify your account/);
  assert.doesNotMatch(content.text ?? "", /<main|<p|<a/u);
});

test("explicit text-only content is preserved", async () => {
  const content = await resolveEmailContent({ text: "Plain message" });

  assert.equal(content.html, undefined);
  assert.equal(content.text, "Plain message");
});
