import assert from "node:assert/strict";
import test from "node:test";
import { resolveSignupPolicy } from "./signup-policy";

test("public signup stays open by default", () => {
  assert.deepEqual(
    resolveSignupPolicy({
      backofficePreview: false,
      emailPasswordEnabled: true,
      publicSignupEnabled: undefined,
    }),
    { emailPasswordEnabled: true, signupDisabled: false },
  );
});

test("product policy and Backoffice Preview deny signup without disabling sign-in", () => {
  for (const input of [
    { backofficePreview: false, publicSignupEnabled: false },
    { backofficePreview: true, publicSignupEnabled: true },
  ]) {
    assert.deepEqual(
      resolveSignupPolicy({ ...input, emailPasswordEnabled: true }),
      { emailPasswordEnabled: true, signupDisabled: true },
    );
  }
});

test("email and password availability fails closed when omitted", () => {
  assert.equal(
    resolveSignupPolicy({
      backofficePreview: false,
      emailPasswordEnabled: undefined,
      publicSignupEnabled: true,
    }).emailPasswordEnabled,
    false,
  );
});
