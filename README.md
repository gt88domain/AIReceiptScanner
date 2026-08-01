# TanStack Template

A modern full-stack TypeScript template for building SaaS applications with zero configuration required.

## ✨ Key Principles

- **Zero Configuration**: Get started immediately without complex setup
- **Subsecond Performance**: Optimized for speed and responsiveness
- **Maximum Type Safety**: End-to-end type safety across all layers
- **AI-Friendly**: Clean, consistent code patterns for AI assistance

## 🚀 Tech Stack

| Category         | Technologies                                          |
| ---------------- | ----------------------------------------------------- |
| **Frontend**     | React 19 + TanStack Start + TailwindCSS 4 + shadcn/ui |
| **Backend**      | Hono + Cloudflare Workers                             |
| **Database**     | Cloudflare D1 (SQLite) + Drizzle ORM                  |
| **API**          | oRPC (end-to-end type-safe)                           |
| **Auth**         | Better Auth (Email/Password, GitHub, Google, Apple, Phone/SMS OTP) |
| **Payments**     | Stripe + Creem (web), RevenueCat (native), credits system |
| **Mobile**       | React Native + Expo                                   |
| **Email**        | Resend + React Email templates                        |
| **i18n**         | use-intl (English/Chinese/Japanese)                   |
| **Monorepo**     | Turborepo + pnpm workspaces                           |
| **Code Quality** | OXC (`oxlint` + `oxfmt`) + TypeScript                 |

## 🎯 Features

### Authentication & Security

- Email/password with verification
- OAuth providers (GitHub, Google, Apple)
- Phone number / SMS OTP sign-in (Alibaba Cloud SMS)
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
- Web payments via Stripe and Creem
- Native in-app purchases via RevenueCat
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
#    apps/native/.env.development.local.example → apps/native/.env.development.local
# Configure your database, auth providers, payments, etc.

# 3. Initialize database
pnpm db:push

# 4. Start development servers
pnpm dev
```

### Development URLs

| App               | URL                   | Description                   |
| ----------------- | --------------------- | ----------------------------- |
| **Web**           | http://localhost:3000 | Main web application          |
| **Server**        | http://localhost:3001 | API server                    |
| **Email Preview** | http://localhost:4000 | Email template preview        |

## 📁 Project Structure

```
├── apps/
│   ├── web/         # Frontend (React + TanStack Start)
│   ├── server/      # Backend API (Hono + Cloudflare Workers)
│   ├── native/      # Mobile app (React Native + Expo)
├── packages/
│   ├── app-config/  # Unified cross-platform business config
│   ├── api-client/  # Type-safe API client
│   ├── i18n/        # Shared internationalization
│   ├── shared/      # Shared utilities and types
│   └── ...
└── docs/            # Documentation
```

## 📚 Docs

- `docs/config-architecture.md` — Shared configuration architecture
- `docs/i18n-implementation.md` — Internationalization implementation notes
- `docs/cross-platform-payment-test-scenarios.md` — Payment test scenarios across web and native
- `docs/native-revenuecat-payments.md` — Native in-app purchases with RevenueCat
- `docs/native-local-builds.md` — Building the native app locally
- `docs/native-email-verification-with-ngrok.md` — Native email verification setup with ngrok
- `docs/template-adoption.md` — Buyer-owned identifiers and deployment checklist
- `docs/testing-strategy.md` — Required core-path test coverage and CI gates
- `docs/migration/00-audit.md` — Required migration Playbook entry point

## 🛠️ Available Scripts

### Development

| Script            | Description                        |
| ----------------- | ---------------------------------- |
| `pnpm dev`        | Start all apps in development mode |
| `pnpm dev:web`    | Start web app only                 |
| `pnpm dev:server` | Start API server only              |
| `pnpm dev:native` | Start mobile app                   |

### Build & Deploy

| Script               | Description                       |
| -------------------- | --------------------------------- |
| `pnpm build`         | Build all applications            |
| `pnpm deploy`        | Deploy web + server to production |
| `pnpm deploy:web`    | Deploy web app only               |
| `pnpm deploy:server` | Deploy API server only            |

### Code Quality

| Script             | Description                                |
| ------------------ | ------------------------------------------ |
| `pnpm lint`        | Run linting (`oxlint`)                     |
| `pnpm lint:fix`    | Lint and auto-fix (`oxlint --fix`)         |
| `pnpm fmt`         | Format code (`oxfmt`)                      |
| `pnpm fmt:check`   | Check formatting (`oxfmt --check`)         |
| `pnpm check-types` | TypeScript type checking                   |
| `pnpm clean`       | Clean all node_modules and build artifacts |
| `pnpm commit`      | Conventional commit with auto-push         |

### Database Management

| Script                  | Description                        |
| ----------------------- | ---------------------------------- |
| `pnpm db:generate`      | Generate database migration        |
| `pnpm db:push`          | Push schema changes to D1          |
| `pnpm db:migrate`       | Run database migrations            |
| `pnpm db:migrate:local` | Run migrations on local database   |
| `pnpm db:studio`        | Open Drizzle Studio (database GUI) |
| `pnpm db:studio:local`  | Open Drizzle Studio against local D1 |

### Server Utilities

| Script                         | Description                         |
| ------------------------------ | ----------------------------------- |
| `pnpm -F server compile`       | Compile server to standalone binary |
| `pnpm -F server email-preview` | Preview email templates             |

## 🚀 Deployment

### Initial Deployment

```bash
# 1. First deployment to get your URLs
pnpm deploy

# 2. Update production configuration:
#    - apps/server/wrangler.jsonc → vars (WEBSITE_URL, SERVER_URL)
#    - apps/web/.env.production → VITE_SERVER_URL, VITE_APP_URL

# 3. Redeploy with updated configuration
pnpm deploy
```

### Environment Variables

#### Web App (.env.production)

```bash
VITE_SERVER_URL=https://your-api.your-domain.workers.dev
VITE_APP_URL=https://your-app.pages.dev
```

#### Server (wrangler.jsonc)

```json
{
	"vars": {
		"WEBSITE_URL": "https://your-app.pages.dev",
		"SERVER_URL": "https://your-api.your-domain.workers.dev"
	}
}
```

## 🔧 Configuration

### Database Setup

The project uses Cloudflare D1 (SQLite) with Drizzle ORM:

```bash
# Generate migration after schema changes
pnpm db:generate

# Push schema to development database
pnpm db:push

# Run migrations in production
pnpm db:migrate
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

# Phone / SMS OTP (Alibaba Cloud SMS)
ALIBABA_CLOUD_ACCESS_KEY_ID=your_access_key_id
ALIBABA_CLOUD_ACCESS_KEY_SECRET=your_access_key_secret
```

### Email Configuration

Set up Resend for transactional emails:

```bash
RESEND_API_KEY=your_resend_api_key
FROM_EMAIL=noreply@yourdomain.com
```

### Payments Setup

Web checkout supports Stripe and Creem; native uses RevenueCat:

```bash
# Stripe (web)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Creem (web)
CREEM_API_KEY=your_creem_api_key
CREEM_WEBHOOK_SECRET=your_creem_webhook_secret

# RevenueCat (native)
REVENUECAT_WEBHOOK_SECRET=your_revenuecat_webhook_secret
```

## 🎨 Customization

### Theming

- Modify `apps/web/src/styles/index.css` for global styles and design tokens (TailwindCSS 4 CSS-first config)
- Customize components in `apps/web/src/components/ui/`

### Pricing Configuration

- Edit pricing tiers in `packages/shared/src/pricing-config.ts`
- Configure payment providers/credits in `packages/app-config/src/`
- Customize landing UI in `apps/web/src/components/landing-page/`

### Internationalization

- Add translations in `packages/i18n/src/messages/<surface>/<locale>.json` (surfaces: `common`, `web`, `server`, `native`)
- Supported languages: English, Chinese, Japanese (registered in `packages/i18n/src/locales.ts`)
- Use `useTranslations()` hook in components

## 🧪 Testing

The template's core auth, billing, webhook, credits, admin, and migration checks
are required. Run both gates before review (there is no root `test` script):

```bash
# Required template gates
pnpm test:template
pnpm test:integration

# Run type checking across the monorepo
pnpm check-types
```

## 🔗 Links

- [Discord Community](https://discord.gg/KZ6uwbHZG4)
