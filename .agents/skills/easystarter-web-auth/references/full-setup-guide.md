# Web Auth Full Setup Guide

Complete walkthrough for configuring Web authentication from scratch. Read this when setting up auth for the first time or doing a comprehensive auth audit.

## Prerequisites

Before starting, confirm you have:
- `apps/server/.dev.vars` created from `.dev.vars.example`
- `apps/server/.env.production` created from `.env.production.example`
- `apps/server/wrangler.jsonc` with correct `SERVER_URL` and `WEBSITE_URL`

## Step 1: Generate BETTER_AUTH_SECRET

```bash
# Dev secret
openssl rand -base64 32
# Write output to BETTER_AUTH_SECRET in apps/server/.dev.vars

# Production secret (use a DIFFERENT value)
openssl rand -base64 32
# Write output to BETTER_AUTH_SECRET in apps/server/.env.production
```

Never reuse the same secret across environments.

## Step 2: Choose Auth Methods

Edit `packages/app-config/src/app-config.ts` — set each method's flag:

```typescript
auth: {
  methods: {
    emailPasswordEnabled: true,   // needs RESEND_API_KEY for verification emails
    emailOtpEnabled: false,       // needs RESEND_API_KEY
    githubEnabled: true,          // needs GITHUB_CLIENT_ID + SECRET
    googleEnabled: true,          // needs GOOGLE_CLIENT_ID + SECRET
    appleEnabled: false,          // needs APPLE_APP_BUNDLE_IDENTIFIER
  },
},
```

## Step 3: Configure Google OAuth

1. Go to https://console.cloud.google.com/apis/credentials
2. Create OAuth 2.0 Client ID → Web application
3. Authorized JavaScript origins:
   - `http://localhost:3000` (dev)
   - `http://localhost:3001` (dev)
   - `https://yourdomain.com` (production)
4. Authorized redirect URIs:
   - `http://localhost:3001/api/auth/callback/google` (dev)
   - `https://api.yourdomain.com/api/auth/callback/google` (production)
5. Write values:
   - `GOOGLE_CLIENT_ID` → `vars` block in `apps/server/wrangler.jsonc`
   - `GOOGLE_CLIENT_SECRET` → `apps/server/.dev.vars` AND `apps/server/.env.production`

## Step 4: Configure GitHub OAuth

1. Go to https://github.com/settings/developers → New OAuth App
2. Homepage URL: `https://yourdomain.com`
3. Authorization callback URL: `https://api.yourdomain.com/api/auth/callback/github`
   - For local dev, create a separate OAuth App with callback `http://localhost:3001/api/auth/callback/github`
4. Write values:
   - `GITHUB_CLIENT_ID` → `vars` block in `apps/server/wrangler.jsonc`
   - `GITHUB_CLIENT_SECRET` → `apps/server/.dev.vars` AND `apps/server/.env.production`

## Step 5: Configure Email Service (if email auth is enabled)

Email/password and email OTP both require Resend for sending verification emails.

1. Go to https://resend.com/api-keys → Create API Key → Sending access
2. Write `RESEND_API_KEY` to `apps/server/.dev.vars` AND `apps/server/.env.production`
3. Configure sender in `app-config.ts`:
   ```typescript
   email: {
     provider: "resend",
     from: {
       localPart: "noreply",
       domain: "yourdomain.com",  // must be verified in Resend
     },
   },
   ```
4. In Resend Dashboard → Domains, add your domain and set up the DNS records

## Step 6: Verify Locally

```bash
pnpm dev:web+server
```

Test each enabled method:
- **Email/password**: Register → check terminal for verification email link → verify → sign in
- **Google**: Click Google button → complete Google consent → redirected back signed in
- **GitHub**: Click GitHub button → authorize → redirected back signed in
- **Email OTP**: Enter email → receive OTP code → enter code → signed in

## Step 7: Production Secrets

After deploying:
```bash
pnpm -F server secrets:bulk:production
```

This pushes all variables from `apps/server/.env.production` to Cloudflare Workers Secrets.

Then update OAuth provider dashboards with production callback URLs:
- Google: `{SERVER_URL}/api/auth/callback/google`
- GitHub: `{SERVER_URL}/api/auth/callback/github`
