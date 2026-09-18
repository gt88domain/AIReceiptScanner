import assert from "node:assert/strict";
import test from "node:test";
import { isContactDeliveryAvailable } from "./contact-delivery";

const contactEnabled = {
  email: { enabled: true, capabilities: { contactForm: true } },
} as Parameters<typeof isContactDeliveryAvailable>[0];

test("contact delivery availability fails closed for preview and missing recipients", () => {
  assert.equal(
    isContactDeliveryAvailable(contactEnabled, {
      BACKOFFICE_PREVIEW: "1",
      CONTACT_RECIPIENT: "owner@test.dev",
    }),
    false,
  );
  assert.equal(
    isContactDeliveryAvailable(contactEnabled, { BACKOFFICE_PREVIEW: "0", CONTACT_RECIPIENT: "" }),
    false,
  );
  assert.equal(
    isContactDeliveryAvailable(contactEnabled, {
      BACKOFFICE_PREVIEW: "0",
      CONTACT_RECIPIENT: "owner@test.dev",
    }),
    true,
  );
});
