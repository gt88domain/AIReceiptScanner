# Project Context

## Purpose
EasyStarter is a full-stack SaaS template/boilerplate designed for rapid application development. It provides a production-ready foundation with authentication, multi-tenancy support, internationalization (i18n), and cross-platform capabilities (web + native mobile). The goal is zero configuration required, subsecond performance, maximum type safety, and AI-friendly code generation.

## Tech Stack

### Monorepo Structure
- **Package Manager**: pnpm (v10.17.1) with workspaces
- **Build Orchestration**: Turborepo for task running and caching
- **Code Quality**: OXC (`oxlint` + `oxfmt`) for linting/formatting, Ultracite for additional checks

### Frontend - Web (`apps/web`)
- **Framework**: React 19.1 with TanStack Router (file-based routing)
- **Build Tool**: Vite 7
- **Styling**: Tailwind CSS 4 with class-variance-authority (CVA)
- **UI Components**: shadcn/ui (Radix UI primitives)
- **State Management**: TanStack Query for server state
- **Forms**: TanStack Form with Zod validation
- **Data Tables**: TanStack Table with advanced filtering/sorting
- **Animations**: Motion (Framer Motion)
- **i18n**: use-intl with locale-prefixed URLs
- **Deployment**: Cloudflare Pages

### Frontend - Native (`apps/native`)
- **Framework**: React Native 0.82 with Expo 54
- **Routing**: Expo Router 6
- **Styling**: NativeWind (Tailwind for React Native)
- **Navigation**: React Navigation 7

### Backend (`apps/server`)
- **Framework**: Hono (lightweight edge-first web framework)
- **Runtime**: Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite-based)
- **ORM**: Drizzle ORM with drizzle-kit for migrations
- **API**: oRPC for type-safe RPC (shared types between client/server)
- **Authentication**: Better Auth with Drizzle adapter
- **Email**: React Email + Resend
- **Storage**: Cloudflare R2

### Shared Packages
- `@repo/i18n`: Shared internationalization messages and types

## Project Conventions

### Code Style
- **Formatting**: OXC formatter with Ultracite rules (see `.claude/CLAUDE.md` for full ruleset)
- **No semicolons**: Configured via OXC formatter
- **Imports**: Use `import type` for type-only imports
- **Path aliases**: Use `@/` for src-relative imports (e.g., `@/components/ui/button`)
- **Component naming**: PascalCase for components, kebab-case for files
- **Function components**: Use function declarations, not arrow functions for components
- **No enums**: Use `as const` objects instead of TypeScript enums
- **No `any`**: Strict TypeScript with no implicit any

### Architecture Patterns

#### API Structure (oRPC)
```
apps/server/src/routers/
├── index.ts          # Main router combining all routes
└── common/           # Shared APIs (web + native)
    ├── users.ts
    └── storage.ts
```
- Root level: Common APIs shared by web and native
- `web/`: Web-specific APIs
- `native/`: Native-specific APIs

#### Database Schema (Drizzle)
```
apps/server/src/db/
├── index.ts          # Database connection
├── schema/           # Table definitions
│   ├── auth.ts       # User, session, account, verification tables
│   └── tenant.ts     # Multi-tenancy tables
└── migrations/       # Generated migrations
```
- Use `sqliteTable` from drizzle-orm
- Timestamps stored as integers with `mode: "timestamp"`
- Foreign keys with cascade delete where appropriate

#### Component Structure (Web)
```
apps/web/src/
├── components/
│   ├── ui/           # Base UI components (shadcn/ui)
│   ├── auth/         # Authentication forms
│   ├── dashboard/    # Dashboard-specific components
│   ├── data-table/   # Reusable data table components
│   ├── feedback/     # Loading, error, empty states
│   ├── layout/       # Layout components
│   ├── navigation/   # Nav components
│   └── providers/    # Context providers
├── routes/           # TanStack Router file-based routes
├── hooks/            # Custom React hooks
├── lib/              # Utilities and configurations
└── i18n/             # Internationalization setup
```

#### UI Components Pattern
- Use CVA (class-variance-authority) for variant-based styling
- Components export both the component and variants (e.g., `Button`, `buttonVariants`)
- Use `cn()` utility for className merging (clsx + tailwind-merge)
- Add `data-slot` attributes for styling hooks

### Testing Strategy
- **Web**: Testing Library (React) with jsdom
- **No dedicated test files yet**: Project is in early development
- **Type checking**: `pnpm check-types` runs TypeScript compiler
- **Linting**: `pnpm lint` runs `oxlint`
- **Formatting**: `pnpm fmt:check` runs `oxfmt` checks

### Git Workflow
- **Branch**: Single `master` branch (main development)
- **Commit style**: Conventional Commits
  - `feat(scope):` - New features
  - `fix(scope):` - Bug fixes
  - `refactor(scope):` - Code refactoring
  - `docs(scope):` - Documentation
- **Commit tool**: Commitizen with cz-conventional-changelog
- **Pre-commit**: lint-staged runs Ultracite fix on staged files
- **Commit command**: `pnpm commit` (stages all, commits with Commitizen, pushes)

## Domain Context

### Multi-tenancy
- Tenant context resolved per request via middleware
- Tenant prefix can be stripped from URLs for routing
- Tenant-specific data isolation at the database level

### Authentication Flow
- Better Auth handles sign-up, sign-in, OAuth callbacks, sessions
- Supported providers: Email/password, GitHub, Google
- Session stored in cookies, validated via middleware
- Email verification with React Email templates

### Internationalization
- Locale detection via URL prefix (e.g., `/zh/dashboard`)
- Server-side: i18n middleware provides translation function
- Client-side: use-intl with TanStack Router URL rewriting
- Supported locales: English (en), Chinese (zh), Japanese (jp)

### Storage
- R2 bucket for file storage (avatars, uploads)
- Files served via `/api/storage/*` endpoint with caching headers

## Important Constraints

### Edge Runtime
- Server runs on Cloudflare Workers (V8 isolates)
- No Node.js APIs - use Web APIs only
- D1 database has SQLite limitations (no full-text search, etc.)
- Cold start optimization is important

### Type Safety
- End-to-end type safety via oRPC (server types flow to client)
- Zod schemas for runtime validation
- Strict TypeScript configuration

### Accessibility
- Follow WCAG guidelines (see `.claude/CLAUDE.md` for full a11y rules)
- Proper ARIA attributes, keyboard navigation, focus management
- No `accessKey`, proper label associations, semantic HTML

## External Dependencies

### Cloudflare Services
- **Workers**: Serverless compute runtime
- **D1**: SQLite database
- **R2**: Object storage
- **Pages**: Static site hosting (web app)

### Third-party Services
- **Resend**: Transactional email delivery
- **GitHub OAuth**: Social authentication
- **Google OAuth**: Social authentication

### Development Tools
- **Wrangler**: Cloudflare CLI for local dev and deployment
- **Drizzle Studio**: Database GUI (`pnpm db:studio`)
- **React Email**: Email template preview (`pnpm email-preview`)
