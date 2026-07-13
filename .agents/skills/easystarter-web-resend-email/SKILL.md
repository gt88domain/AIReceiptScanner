---
name: easystarter-web-resend-email
description: Configure Resend email service for EasyStarter Web. Use when the user mentions email sending, Resend, RESEND_API_KEY, transactional email, verification email, password reset email, email OTP, email templates, sender domain, email preview, "from" address, or asks "how do I set up email", "configure email", "email not sending", "preview email templates", or "change sender address".
---

# EasyStarter Web Resend Email

Email flows through four layers: **app-config** (sender address), **Resend provider** (API delivery), **senders** (per-flow logic: signup verify, password reset, email OTP), and **React Email templates** (rendered HTML). All templates support i18n. The Resend API key is a server-side secret that never touches Web env files.

## Decision Tree

- **Set up Resend from scratch** -> Section 1 (env) + Section 2 (sender config) + Section 3 (domain verification)
- **Change sender address** -> Section 2 (app-config email section)
- **Edit email template content** -> Section 4 (templates and i18n)
- **Preview templates locally** -> Section 5 (email preview)
- **Email not sending / errors** -> Section 6 (common mistakes)

## Section 1: Environment Variables

| Variable | Where | Scope |
|----------|-------|-------|
| `RESEND_API_KEY` | `apps/server/.dev.vars` (local) + `.env.production` (prod) | **Secret** -- never in `wrangler.jsonc` |

Set locally in `.dev.vars`:
```
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Deploy to production via Wrangler secrets:
```bash
pnpm -F server secrets:bulk:production
# or directly:
echo '{"RESEND_API_KEY":"re_live_xxxx"}' | wrangler secret bulk --name easystarter-server
```

The provider reads it at runtime from the Cloudflare Workers env:

```typescript
// apps/server/src/emails/providers/resend.ts
const resolvedKey = env.RESEND_API_KEY;
const client = resolvedKey ? new Resend(resolvedKey) : null;
```

If the key is missing, any email send throws `"RESEND_API_KEY is not configured"`.

## Section 2: Sender Address Config

The sender "from" address is built from `common.email` in app-config:

```typescript
// packages/app-config/src/app-config.ts
email: {
  provider: "resend",
  from: {
    localPart: "noreply",
    domain: "easystarter.dev",
  },
},
```

This produces the from address: `EasyStarter <noreply@easystarter.dev>`.

The format is assembled in the email provider factory:

```typescript
// apps/server/src/emails/index.ts
const provider = createResendEmailProvider({
  defaultFrom: `${commonConfig.app.name} <${commonConfig.email.from.localPart}@${commonConfig.email.from.domain}>`,
});
```

**To change the sender**: edit `localPart` and `domain` in `packages/app-config/src/app-config.ts`. Do not hard-code from addresses in individual senders.

## Section 3: Domain Verification

The `domain` in app-config must be verified in the Resend dashboard before emails will deliver:

1. Go to [Resend Domains](https://resend.com/domains)
2. Add your domain (e.g. `easystarter.dev`)
3. Add the DNS records Resend provides (MX, TXT for SPF/DKIM)
4. Wait for verification to complete

Until the domain is verified, Resend will reject sends with a domain verification error.

## Section 4: Email Templates and Senders

Three email flows exist, each with a sender and a React Email template:

| Flow | Sender | Template |
|------|--------|----------|
| Signup verification | `emails/senders/sign-up-verify-email.ts` | `emails/templates/sign-up-verify-email.tsx` |
| Password reset | `emails/senders/forgot-password-email.ts` | `emails/templates/forgot-password-email.tsx` |
| Email OTP sign-in | `emails/senders/email-otp-email.ts` | `emails/templates/email-otp-email.tsx` |

All senders use the shared `sendEmail` helper and support i18n:

```typescript
// apps/server/src/emails/senders/sign-up-verify-email.ts
export async function sendVerificationEmail({
  to, name, verificationUrl, locale = defaultLocale,
}: { to: string; name: string; verificationUrl: string; locale?: Locale }) {
  const t = createT(locale);
  const appName = resolveCommonConfig().app.name;
  await sendEmail({
    to,
    subject: t("email.verification.subject", { appName }),
    template: SignUpVerifyEmail({ name, verificationUrl: emailVerificationLink, appName, locale }),
  });
}
```

Subject lines and body copy come from i18n files in `packages/i18n/src/messages/server/`. To change email copy, edit the server locale messages -- do not hard-code text in templates.

## Section 5: Email Preview

Preview templates locally without sending:

```bash
pnpm -F server email-preview
# Opens at http://localhost:4000
```

This renders the React Email templates in a browser preview. Use this when editing template layout or styling.

## Verification

1. Set `RESEND_API_KEY` in `apps/server/.dev.vars`
2. `pnpm dev:web+server`
3. Sign up with an email address -- you should receive a verification email
4. Check the server console for any send errors
5. `pnpm -F server email-preview` to visually check template changes

## Common Mistakes

- **Putting `RESEND_API_KEY` in `wrangler.jsonc` vars** -- This is a secret. It goes in `.dev.vars` (local) and production secrets only. `wrangler.jsonc` `vars` are committed to git.
- **Putting `RESEND_API_KEY` in Web env files** -- The Web app never sends email. This is a server-only secret in `apps/server/.dev.vars`.
- **Hard-coding the from address in a sender** -- All senders inherit `defaultFrom` from the provider factory. Change the address in `app-config.ts` `common.email.from`, not in individual senders.
- **Unverified domain** -- Resend rejects sends from unverified domains. The `domain` in `common.email.from` must match a verified domain in the Resend dashboard.
- **Editing email subject text in templates instead of i18n** -- Subject lines use `t("email.verification.subject", ...)` from `packages/i18n/src/messages/server/`. Changing text in the template `.tsx` file changes the HTML body only; the subject comes from i18n.
- **Forgetting to handle native verification links** -- The signup email sender auto-detects native callbacks and routes through a server bridge (`/api/auth/verify-email/native`). Do not bypass this logic.
