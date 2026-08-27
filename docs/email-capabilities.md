# Email capabilities

Email is configured in `packages/app-config/src/product-config.ts`. It has one
explicit provider and capability contract:

```ts
email: {
  enabled: true,
  provider: "resend", // or "none" only when disabled
  capabilities: {
    verification: true,
    passwordReset: true,
    newsletter: true,
    contactForm: true,
    operationalAlerts: true,
  },
}
```

`enabled: false` requires `provider: "none"` and every capability false. The
template supports verified email/password registration, email verification,
and password reset; it has no email-OTP capability or client/server plugin.
Email has no dependency on Jobs, R2, Billing, Credits, or Mobile.

When email is disabled, no Resend service is created, `/api/newsletter/subscribe`
and `/api/contact` are absent, and Auth mail operations reject with a client-safe
error. When a specific capability is disabled, its route is absent or its server
operation fails closed. The browser receives no sender, recipient, audience ID,
provider key, or provider configuration. `CONTACT_RECIPIENT` is server-only.

For a Resend-enabled production deployment, set `RESEND_API_KEY`, `EMAIL_FROM`,
and `CONTACT_RECIPIENT` only when the Contact capability is enabled.
