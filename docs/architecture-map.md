# Architecture map and critical sequences

This document is the stable, high-level repository map for humans and coding
agents. It explains ownership and runtime flow; it is not a generated symbol
index. Executable configuration and source code remain authoritative:

- `template-kit/repository-facts.json` owns machine-readable repository facts
  and enforced import boundaries.
- `packages/app-config` owns source-controlled product composition.
- `apps/server/src/db` owns business schema and migration history.
- `apps/server/src/index.ts` and `apps/server/src/app/create-app.ts` own the
  Server Worker entry points.

Update these diagrams only when a boundary or lifecycle changes. File moves
inside an unchanged module do not require diagram churn.

## System topology

```mermaid
flowchart LR
  subgraph Clients
    Browser[Browser]
    Mobile[Optional Expo app]
  end

  subgraph WebWorker[Web Worker: apps/web]
    Start[TanStack Start<br/>SSR, UI, SEO]
    Client[api-client<br/>oRPC + TanStack Query]
    Start --> Client
  end

  subgraph ApiWorker[API Worker: apps/server]
    Hono[Hono HTTP boundary]
    Router[Runtime oRPC router]
    Context[Request context<br/>session + services]
    Product[Product modules]
    Core[Auth, billing, credits,<br/>assets, jobs, audit]
    Events[Queue, DLQ, and Cron handlers]
    Hono --> Context --> Router
    Router --> Product
    Product --> Core
    Events --> Core
  end

  subgraph Cloudflare[Cloudflare resources]
    D1[(D1<br/>business data)]
    R2[(R2<br/>objects)]
    Queue[Job Queue]
    DLQ[Dead-letter Queue]
    Cron[Cron triggers]
    Workflow[Workflows<br/>long-lived flows]
  end

  Browser --> Start
  Browser -->|HTTPS oRPC| Hono
  Client -->|SSR: API_SERVICE<br/>browser: HTTPS| Hono
  Mobile -->|HTTPS oRPC| Hono
  Core --> D1
  Core --> R2
  Core --> Queue
  Queue --> Events
  Queue -->|attempts exhausted| DLQ
  DLQ --> Events
  Cron --> Events
  Product -. explicit product need .-> Workflow
```

The Server Worker is the sole owner of business D1. The Web Worker has an
`API_SERVICE` binding but no business D1 binding. Optional mobile is a separate
workspace and uses the same public API contract.

## Source ownership and dependency direction

```mermaid
flowchart TB
  Route[Thin route files<br/>apps/web/src/routes]
  WebDomain[Product web module<br/>apps/web/src/modules/domain]
  ServerRouter[Product oRPC router<br/>apps/server/src/modules/domain/router.ts]
  Service[Application service]
  Policy[Policy + standard guards]
  Repository[Domain repository]
  Core[Public core contracts<br/>auth, payments, credits, jobs, assets]
  DB[(Drizzle schema + D1)]
  Provider[Provider adapters<br/>R2, payment, email, Queue]
  Shared[packages/*<br/>provider-neutral contracts]

  Route --> WebDomain
  WebDomain -->|oRPC contract| ServerRouter
  ServerRouter --> Service
  ServerRouter --> Policy
  Service --> Policy
  Service --> Repository
  Service --> Core
  Repository --> DB
  Core --> DB
  Core --> Provider
  WebDomain --> Shared
  ServerRouter --> Shared

  DB -. must not import .-> Service
  Core -. must not import .-> ServerRouter
  Shared -. must not import .-> WebDomain
```

The dashed arrows are forbidden reverse dependencies. Not every small module
needs every layer; create only the files used by that domain.

## Product configuration to runtime surface

```mermaid
flowchart LR
  Product[Product-owned config<br/>identity, content, catalogs]
  Public[Public runtime config<br/>browser-safe switches]
  Features[Resolved product features]
  Validate[Dependency validation]
  Compose[PlatformComposition]
  Routes[Physical Hono and<br/>runtime oRPC routes]
  Worker[Fetch, Queue, Cron,<br/>and DLQ handlers]
  Resources[Required resources<br/>D1, R2, Queue, DLQ, Cron]
  Profiles[Optional build profile]
  Preflight[Production preflight]

  Product --> Features
  Public --> Features
  Profiles --> Features
  Features --> Validate --> Compose
  Compose --> Routes
  Compose --> Worker
  Compose --> Resources
  Resources --> Preflight
  Product --> Preflight
  Public --> Preflight
```

Profiles and feature contracts describe the runtime; they do not mutate files
or create Cloudflare resources. Disabled modules are physically omitted where
the runtime supports omission, while ordered migration history remains intact.

## Account creation, verification, and session lifecycle

```mermaid
sequenceDiagram
  autonumber
  actor User
  participant Client as Web or mobile client
  participant AuthHTTP as /api/auth boundary
  participant Adapter as Auth adapter
  participant BetterAuth as Better Auth
  participant Email as Email service
  participant D1 as D1 auth tables
  participant Context as Request context

  User->>Client: Submit sign-up
  Client->>AuthHTTP: Credentials or OAuth flow
  AuthHTTP->>Adapter: handleAuthRequest
  Adapter->>BetterAuth: Provider-owned auth operation
  BetterAuth->>D1: Create or link user/account
  opt Email verification is enabled
    BetterAuth->>Email: Send verification link
    Email-->>User: Verification message
    User->>AuthHTTP: Open signed verification URL
    AuthHTTP->>BetterAuth: Verify mailbox ownership
    BetterAuth->>D1: Set emailVerified
    Note right of BetterAuth: Verification does not create a session
  end
  User->>Client: Sign in
  Client->>AuthHTTP: Sign-in request
  BetterAuth->>D1: Check credentials and deletedAt hook
  alt Account is soft-deleted
    BetterAuth-->>Client: UNAUTHORIZED
  else Active account
    BetterAuth->>D1: Create session
    BetterAuth-->>Client: Secure session cookie or native callback
  end
  Client->>Context: Later API request
  Context->>Adapter: Resolve fresh session with cookie cache disabled
  Adapter->>D1: Read session and user
  Context->>D1: Recheck deletedAt
  alt Session missing or user deleted
    Context-->>Client: Anonymous or UNAUTHORIZED
  else Active session
    Context-->>Client: Continue through standard guard
  end
```

Account deletion first rejects an active subscription, then soft-deletes and
anonymizes the user and removes their sessions. Email verification alone never
grants an authenticated session.

## Authenticated product request

```mermaid
sequenceDiagram
  autonumber
  actor User
  participant Web as Web or mobile client
  participant API as Hono + oRPC
  participant Context as createContext
  participant Auth as Auth adapter
  participant Guard as Standard guard
  participant Module as Product module
  participant D1 as D1

  User->>Web: Trigger query or mutation
  Web->>API: oRPC request + cookie or authorization
  API->>Context: Build request-scoped context
  Context->>Auth: Resolve Better Auth session through adapter
  Auth->>D1: Read session and user
  D1-->>Context: Active session or anonymous
  Context->>Context: Assemble enabled services from composition
  API->>Guard: requireUser, requireAdmin,<br/>requireCapability, or requireEntitlement
  Guard->>D1: Recheck deletion, allowlist,<br/>billing state, or capability tier
  alt Access denied
    Guard-->>Web: UNAUTHORIZED or FORBIDDEN
  else Access allowed
    Guard->>Module: Continue procedure
    Module->>D1: Read or write through repository/service
    D1-->>Module: Domain result
    Module-->>Web: Bounded typed response
  end
```

Administrator access and paid entitlement are independent. UI visibility is
presentation only; the Server guard makes the authorization decision on every
protected procedure.

## Checkout to verified entitlement or credits

```mermaid
sequenceDiagram
  autonumber
  actor User
  participant Client as Web client
  participant RPC as Protected billing or credits RPC
  participant Service as Payment or Credits service
  participant Operation as D1 payment operation
  participant Provider as Configured payment provider
  participant Inbox as billing_event inbox
  participant Ledger as Billing and credits state
  participant Capability as Entitlement/capability reader

  User->>Client: Choose plan or credit package
  Client->>RPC: Create checkout with operation ID
  RPC->>Service: Validate user, feature, plan, price, and transition
  Service->>Operation: Get or create idempotent checkout operation
  alt Completed operation already exists
    Operation-->>Client: Return stored checkout result
  else New or claimable operation
    Service->>Provider: Create checkout with idempotency key and metadata
    Provider-->>Service: Hosted checkout URL and provider session ID
    Service->>Operation: Persist provider result and checkout session
    Service-->>Client: Checkout URL
  end
  Client->>Provider: Complete hosted payment
  Provider-->>Client: Redirect to success URL
  Note right of Client: Redirect is presentation only and grants nothing
  Provider->>Inbox: Signed webhook through API Worker
  Inbox->>Inbox: Deduplicate and claim event lease
  Inbox->>Ledger: Upsert verified purchase/subscription or credit grant
  Inbox->>Inbox: Mark event processed
  Client->>Capability: Refresh billing status, balance, or protected feature
  Capability->>Ledger: Read server-owned verified state
  Ledger-->>Client: Entitlement tier or credit balance
```

The checkout operation prevents duplicate provider sessions; the webhook event
prevents duplicate financial effects. Only verified server state affects
entitlements and balances.

## Verified payment webhook and entitlement update

```mermaid
sequenceDiagram
  autonumber
  participant Provider as Stripe, Creem, Waffo,<br/>or RevenueCat
  participant HTTP as Hono webhook route
  participant Adapter as Payment provider adapter
  participant Inbox as billing_event inbox
  participant Handler as Provider event handler
  participant Ledger as Billing and credits tables
  participant Outbox as billing_outbox
  participant Cron as Scheduled recovery

  Provider->>HTTP: Raw body + signature
  HTTP->>Adapter: Verify signature and normalize event
  Adapter-->>HTTP: providerEventId + type + payload
  HTTP->>Inbox: Insert pending event<br/>unique by provider + event ID
  HTTP->>Inbox: Atomically claim processing lease
  alt Duplicate or already claimed
    Inbox-->>Provider: Acknowledge without a second effect
  else Claimed
    HTTP->>Handler: Dispatch verified payload
    Handler->>Ledger: Upsert purchase/subscription<br/>or grant/revoke credits
    opt External follow-up required
      Handler->>Outbox: Enqueue deduplicated provider effect
    end
    Handler->>Inbox: Mark processed
    HTTP-->>Provider: received
  end

  Cron->>Inbox: Reclaim due or expired events
  Cron->>Handler: Replay persisted payload
  Cron->>Outbox: Claim due external effects
  Outbox->>Adapter: Execute provider effect
  Adapter-->>Outbox: Mark processed or back off/dead-letter
```

Future capability checks read the webhook-backed billing state. A redirect or
client-side success screen never grants entitlement.

## Billable operation settlement

```mermaid
sequenceDiagram
  autonumber
  participant Module as Product service or Job handler
  participant Credits as Credits Service
  participant Operation as billable_operation
  participant Ledger as credit_transaction ledger
  participant Work as External or product work

  Module->>Module: Validate input, compute cost, hash request
  Module->>Credits: beginBillableOperation
  Credits->>Ledger: Check billing hold and spendable balance
  Credits->>Operation: Get or create user-scoped operation
  alt Same operation already succeeded
    Operation-->>Module: Return stored success reference
  else Same operation is running
    Operation-->>Module: Return running without a second execution
  else Failed or refunded operation
    Operation-->>Module: Return failed without another charge
  else New pending operation
    Credits->>Ledger: Consume credits once by operation source ID
    Credits->>Operation: Attach transaction and atomically claim running
    Operation-->>Module: started
    Module->>Work: Execute exactly one server-side effect
    alt Work succeeds
      Work-->>Module: Result reference
      Module->>Credits: completeBillableOperation
      Credits->>Operation: Mark succeeded with result reference
    else Work fails
      Work-->>Module: Failure
      Module->>Credits: failBillableOperation
      Credits->>Ledger: Insert one compensating refund
      Credits->>Operation: Mark refunded with failure reason
    end
  end
```

The operation ID and request hash bind one validated request to one charge and
one execution. Failure compensation is ledger-based and idempotent; callers do
not edit balances directly.

## Durable Job lifecycle

```mermaid
sequenceDiagram
  autonumber
  participant Product as Product service
  participant Jobs as Job Service
  participant D1 as D1 job + outbox
  participant Queue as Cloudflare Queue
  participant Worker as Queue consumer
  participant Handler as Registered handler
  participant DLQ as Cloudflare DLQ
  participant Admin as Admin recovery

  Product->>Jobs: create(idempotencyKey, type, payload)
  Jobs->>D1: Batch insert job + outbox
  alt Same key and same input
    D1-->>Product: Return existing job
  else New job
    Jobs->>Queue: Publish job ID
    Jobs->>D1: Mark outbox published
    Jobs-->>Product: Return durable job ID
  end

  Queue->>Worker: Deliver at least once
  Worker->>D1: Claim job with lease token
  Worker->>Handler: Run idempotent handler
  alt Success
    Handler-->>Worker: Result
    Worker->>D1: Mark succeeded if lease still owned
    Worker-->>Queue: Ack
  else Retryable failure
    Worker->>D1: Return to pending and record error
    Worker-->>Queue: Retry with backoff
  else Attempts exhausted
    Worker->>D1: Mark failed
    Worker-->>Queue: Leave for DLQ transfer
    Queue->>DLQ: Move terminal message
    DLQ->>D1: Persist failed_job_event
    Admin->>Jobs: Retry resolved failure
    Jobs->>D1: Reset job + outbox atomically
    Jobs->>Queue: Publish again
  end
```

Creating the D1 job and its outbox is the durability boundary. Queue delivery
is at least once, so handler external effects must also use the job's
idempotency contract.

## Product asset lifecycle

```mermaid
sequenceDiagram
  autonumber
  actor User
  participant Module as Product module
  participant Asset as Asset Service
  participant R2 as R2 provider
  participant D1 as asset metadata

  User->>Module: Upload product file
  Module->>Asset: createAsset(owner, visibility, key, data)
  Asset->>R2: Put object
  R2-->>Asset: Stored key + size
  Asset->>D1: Insert asset record and ACL metadata
  alt Metadata write fails
    Asset->>R2: Delete orphaned object
    Asset-->>Module: Fail upload
  else Metadata persisted
    Asset-->>Module: Return public asset ID
  end

  User->>Module: Read asset by ID
  Module->>Asset: getAsset(assetId, viewerId)
  Asset->>D1: Check owner or public visibility
  alt Not authorized
    Asset-->>Module: Not found
  else Authorized
    Asset->>R2: Get object by private storage key
    R2-->>Module: Stream object + authorized metadata
  end
```

The existing avatar storage route is a constrained legacy raw-key path. New
product files use asset IDs and the Asset Service; a raw storage key is never a
public authorization decision.

## New-site adoption and release

```mermaid
sequenceDiagram
  autonumber
  actor Maintainer
  participant Offer as Paid offer
  participant Profile as Product profile
  participant Config as Product-owned config
  participant Modules as Product modules
  participant Checks as Local verification
  participant Cloud as Cloudflare resources
  participant Guard as Production preflight
  participant Deploy as Explicit migration/deploy

  Maintainer->>Offer: Define item, price, collection,<br/>fulfillment, and refund behavior
  Offer-->>Maintainer: Automatic entitlement or manual delivery
  Maintainer->>Profile: Choose the smallest matching technical baseline
  Profile-->>Maintainer: Required capabilities and resources
  Note right of Profile: Describes capabilities and does not mutate files or create resources
  Maintainer->>Config: Set identity, providers, feature choices,<br/>content flags, and public metadata
  Maintainer->>Modules: Add product domains without editing core semantics
  Maintainer->>Checks: Record deferred checks and review the core goal
  opt Automated verification explicitly requested
    Maintainer->>Checks: Run focused checks, then release gates
    Checks-->>Maintainer: Repository and product behavior verified
  end
  Maintainer->>Cloud: Create buyer-owned Worker, D1,<br/>R2, Queue, domains, and secrets
  Maintainer->>Guard: pnpm verify:production-config
  alt Identity, binding, or live-mode mismatch
    Guard-->>Maintainer: Fail closed with configuration errors
  else Preflight passes
    Maintainer->>Deploy: Explicitly apply reviewed migration and deploy
    Deploy-->>Maintainer: Verify production URLs and critical flow
  end
```

Production migration and deployment are separate, explicit operator actions.
No profile, build, test, or coding-agent task should perform them implicitly.
Charging money does not force every product through the full Billing stack:
manual services may use a product-owned order and provider payment link, while
automatic entitlement always uses verified webhook-backed state.
