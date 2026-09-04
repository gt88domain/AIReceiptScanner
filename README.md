# TanStack Template

A modern full-stack TypeScript template for building SaaS applications with a
fast local start and explicit production adoption.

## ✨ Key Principles

- **Explicit Production Adoption**: Example configuration for local work and
  buyer-owned Worker, D1, R2, Queue, domain, and secret configuration for
  production
- **Subsecond Performance**: Optimized for speed and responsiveness
- **Maximum Type Safety**: End-to-end type safety across all layers
- **AI-Friendly**: Clean, consistent code patterns for AI assistance

## Template Philosophy

This repository is a foundation for multiple products, not a product itself.
Core infrastructure changes must be reusable, stable, reviewed, and versioned;
business features belong in downstream product modules. Read
[`docs/template-governance.md`](docs/template-governance.md) before changing
auth, payments, credits, jobs, storage, database, shared packages, or CI.

## 🚀 Tech Stack

| Category         | Technologies                                                    |
| ---------------- | --------------------------------------------------------------- |
| **Frontend**     | React 19 + TanStack Start + TailwindCSS 4 + shadcn/ui           |
| **Backend**      | Hono + Cloudflare Workers                                       |
| **Database**     | Cloudflare D1 (SQLite) + Drizzle ORM                            |
| **API**          | oRPC (end-to-end type-safe)                                     |
| **Auth**         | Better Auth (Email/Password, GitHub, Google, Apple)             |
| **Payments**     | Stripe; optional RevenueCat mobile                              |
| **Mobile**       | Optional React Native + Expo capability                         |
| **Email**        | Resend + React Email templates                                  |
| **i18n**         | use-intl (English published; Chinese/Japanese catalogs dormant) |
| **Monorepo**     | Turborepo + pnpm workspaces                                     |
| **Code Quality** | OXC (`oxlint` + `oxfmt`) + TypeScript                           |

## 🎯 Features

### Authentication & Security

- Email/password with verification
- OAuth providers (GitHub, Google, Apple)
- Session management with Better Auth
- Protected routes and middleware

### User Interface

- 40+ shadcn/ui components
- Dark/light theme support
- Responsive design
- Landing page with pricing tiers
- Dashboard with sidebar navigation
- Data tables with pagination, sorting, filtering

### Developer Experience

- End-to-end type safety with oRPC + Zod
- Hot reload across all apps
- Database migrations with Drizzle
- Email template preview
- Comprehensive error handling

### Business Features

- Multi-tier pricing system
- Web payments via Stripe
- Optional native in-app purchases via RevenueCat
- Built-in credits system (grants, balances, orders)
- User management dashboard
- Settings and profile pages
- Internationalization support
- Analytics ready

## 🚀 Quick Start

```bash
# 1. Clone and install dependencies
git clone <your-repo-url>
cd tanstack-template
pnpm install

# 2. Set up environment files (copy from examples and configure)
#    apps/web/.env.development.example    → apps/web/.env.development
#    apps/server/.dev.vars.example        → apps/server/.dev.vars
# Configure your database, auth providers, payments, etc.

# 3. Initialize local D1 and apply versioned migrations
pnpm db:migrate

# 4. Start development servers
pnpm dev
```

### Development URLs

| App               | URL                   | Description            |
| ----------------- | --------------------- | ---------------------- |
| **Web**           | http://localhost:3000 | Main web application   |
| **Server**        | http://localhost:3001 | API server             |
| **Email Preview** | http://localhost:4000 | Email template preview |

## 📁 Project Structure

```
├── apps/
│   ├── web/         # Frontend (React + TanStack Start)
│   ├── server/      # Backend API (Hono + Cloudflare Workers)
├── packages/
│   ├── app-config/  # Unified cross-platform business config
│   ├── api-client/  # Type-safe API client
│   ├── i18n/        # Shared internationalization
│   ├── shared/      # Shared utilities and types
│   └── ...
├── optional/
│   └── mobile/      # Opt-in React Native + Expo app
└── docs/            # Documentation
```

## 📚 Docs

- [`docs/README.md`](docs/README.md) — documentation index and historical policy
- [`docs/repo-map.md`](docs/repo-map.md) — change ownership and authoritative files
- [`docs/architecture-map.md`](docs/architecture-map.md) — topology and critical Mermaid sequences
- [`docs/template-adoption.md`](docs/template-adoption.md) — buyer-owned identifiers and adoption
- [`docs/production-configuration.md`](docs/production-configuration.md) — fail-closed production setup

## 🛠️ Available Scripts

### Development

| Script              | Description                         |
| ------------------- | ----------------------------------- |
| `pnpm dev`          | Start all core apps                 |
| `pnpm dev:web`      | Start web app only                  |
| `pnpm dev:server`   | Start API server only               |
| `pnpm mobile:dev`   | Start the optional mobile app       |
| `pnpm mobile:check` | Type-check and lint optional mobile |

### Build & Deploy

| Script                          | Description                             |
| ------------------------------- | --------------------------------------- |
| `pnpm build`                    | Build all core workspaces               |
| `pnpm deploy`                   | Deploy web + server to production       |
| `pnpm deploy:web`               | Deploy web app only                     |
| `pnpm deploy:server`            | Deploy API server only                  |
| `pnpm verify:production-config` | Validate both production Worker targets |

### Code Quality

| Script             | Description                                |
| ------------------ | ------------------------------------------ |
| `pnpm lint`        | Run linting (`oxlint`)                     |
| `pnpm lint:fix`    | Lint and auto-fix (`oxlint --fix`)         |
| `pnpm fmt`         | Format code (`oxfmt`)                      |
| `pnpm fmt:check`   | Check formatting (`oxfmt --check`)         |
| `pnpm check-types` | TypeScript type checking                   |
| `pnpm clean`       | Clean all node_modules and build artifacts |
| `pnpm commit`      | Create a Conventional Commit interactively |

Production Worker setup and the fail-closed deployment guard are documented in
[`docs/production-configuration.md`](docs/production-configuration.md).

### Database Management

| Script                  | Description                         |
| ----------------------- | ----------------------------------- |
| `pnpm db:generate`      | Generate database migration         |
| `pnpm db:check`         | Validate Drizzle migration metadata |
| `pnpm db:migrate`       | Run local database migrations       |
| `pnpm db:migrate:local` | Run local database migrations       |
| `pnpm db:studio`        | Open Drizzle Studio for local D1    |
| `pnpm db:studio:local`  | Open Drizzle Studio for local D1    |

### Server Utilities

| Script                         | Description                         |
| ------------------------------ | ----------------------------------- |
| `pnpm -F server compile`       | Compile server to standalone binary |
| `pnpm -F server email-preview` | Preview email templates             |

## 🚀 Deployment

Production deployment is intentionally fail-closed. Adopt the Worker names,
bindings, public URLs, provider configuration, secrets, and local production
allowlist before the first upload. Then run:

```bash
pnpm verify:production-config
pnpm deploy
```

Use only the repository deploy scripts. Raw `wrangler deploy` bypasses the
production safety preflight; preview publishing uses the separately configured
`deploy:preview` scripts.

Do not deploy once merely to discover production URLs. Follow
[`docs/production-configuration.md`](docs/production-configuration.md) for the
complete setup and safety checks.

## 🔧 Configuration

### Database Setup

The project uses Cloudflare D1 (SQLite) with Drizzle ORM:

```bash
# Generate migration after schema changes
pnpm db:generate

# Run migrations locally (default)
pnpm db:migrate

# Run reviewed migrations against production (explicit CI credentials only)
pnpm db:migrate:production
```

### Authentication Setup

Configure OAuth providers in your server environment:

```bash
# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Apple Sign In
APPLE_APP_BUNDLE_IDENTIFIER=your.app.bundle.id

```

### Email Configuration

Set up Resend for transactional emails:

```bash
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=noreply@yourdomain.com
```

### Payments Setup

Web checkout uses Stripe; an enabled mobile app uses RevenueCat:

```bash
# Stripe (web)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# RevenueCat (optional mobile)
REVENUECAT_WEBHOOK_SECRET=your_revenuecat_webhook_secret
```

## 🎨 Customization

### Theming

- Modify `apps/web/src/styles/index.css` for global styles and design tokens
  (TailwindCSS 4 CSS-first config)
- Customize components in `apps/web/src/components/ui/`

### Pricing Configuration

- Configure provider product/price IDs in `packages/app-config/src/app-config.ts`
- Define membership semantics in `packages/app-config/src/membership-config.ts`
- Define credit packages in `packages/app-config/src/product-config.ts`
- Customize landing UI in `apps/web/src/components/landing-page/`

### Internationalization

- Add translations in `packages/i18n/src/messages/<surface>/<locale>.json`
  (`common`, `web`, `server`, or `native`)
- Published language: English. Chinese and Japanese catalogs remain available
  but do not produce routes, sitemap entries, alternates, or a locale switcher.
  Both lists live in `packages/i18n/src/locales.ts`.
- Use `useTranslations()` hook in components

## 🧪 Testing

The template's core auth, billing, webhook, credits, admin, and migration checks
are required. For agent work, plan tests first, implement and review the complete
requirement, then add the planned tests together. Run automated verification
only when requested; `pnpm test` remains the release gate.

```bash
# Required template gate (runs template and integration checks)
pnpm test

# Run type checking across the monorepo
pnpm check-types
```

## 🔗 Links

- [Discord Community](https://discord.gg/KZ6uwbHZG4)
