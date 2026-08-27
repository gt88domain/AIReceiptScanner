## ADDED Requirements

### Requirement: The default commercial baseline SHALL require payment

The mother template SHALL not automatically grant signup credits or configure
a subscription trial. The internal `free` entitlement MAY continue to
represent the absence of a paid entitlement, but SHALL not be presented as a
default public product offer.

#### Scenario: A new paid product adopts the template defaults

- **WHEN** its billing or credits capability is enabled
- **THEN** a new account receives no automatic signup credit
- **AND** the example subscription prices contain no default trial period
- **AND** any future promotion requires an explicit downstream pricing decision

### Requirement: Planning data SHALL be structurally valid and current

The maintained module TODO CSV SHALL have a stable schema, equal field count in
every record, unique task IDs, no dangling task references, and evidence paths
that resolve against the reviewed repository baseline.

#### Scenario: CSV is consumed by a spreadsheet or AI

- **WHEN** the maintained CSV is parsed with a standards-compliant CSV parser
- **THEN** every record has the same number of fields as the header
- **AND** every dependency ID exists
- **AND** intentional numeric gaps do not fail validation

### Requirement: The first public launch SHALL publish English only

The product SHALL expose only English public routes, navigation, sitemap
entries, canonical alternates, hreflang tags, and transactional-language
fallbacks until another locale is explicitly approved.

#### Scenario: A crawler inspects the first launch

- **WHEN** public pages and metadata are generated
- **THEN** only English pages are advertised
- **AND** `/zh/*` and `/jp/*` are not advertised or prerendered
- **AND** no `hrefLang="jp"` tag is emitted

### Requirement: Enabled authentication methods SHALL be complete end-to-end

Every authentication method exposed by public configuration or UI SHALL have a
matching server capability, abuse controls, and delivery path. Disabled methods
SHALL not be advertised.

#### Scenario: Email OTP is not selected for launch

- **WHEN** the English-first template is built
- **THEN** no email OTP tab or client method is exposed
- **AND** no product configuration switch implies that the absent server plugin
  can be enabled safely
- **AND** verified email/password login and reset remain available

### Requirement: Non-public routes SHALL share one indexing classification

Response headers, robots output, sitemap generation, and prerender filtering
SHALL derive their non-public route prefixes from one maintained Web source.

#### Scenario: A private route is introduced or reviewed

- **WHEN** the route matches Admin, Auth, Billing, Credits, Dashboard, Help,
  Purchases, Settings, Tickets, Users, API, or RPC
- **THEN** it receives the appropriate no-index treatment
- **AND** it is absent from sitemap and prerender output
- **AND** authorization continues to be enforced independently on the server

### Requirement: Repository deploy commands SHALL preserve environment safety

Every repository-provided command that can target the default production Worker
configuration SHALL run the production safety preflight. Preview commands SHALL
use an explicit preview configuration.

#### Scenario: A maintainer selects a documented deploy command

- **WHEN** the command targets the production configuration
- **THEN** identity and production safety checks run before Wrangler deploys
- **AND** no `deploy:dev` convenience script bypasses that contract

### Requirement: D1 recovery SHALL have a solo-operable runbook

Before a paid product stores production business data, the repository SHALL
document who owns recovery, which current Cloudflare recovery/export mechanism
is used, where protected exports are retained, and how restoration is rehearsed
without writing production data.

#### Scenario: Recovery readiness is reviewed

- **WHEN** the first paid deployment is prepared
- **THEN** the operator can identify a current backup or recovery mechanism
- **AND** can rehearse restoration against a non-production database
- **AND** no unverified retention guarantee is presented as fact

### Requirement: Test work SHALL follow implementation review

For this change, test planning SHALL be recorded before implementation, but test
files SHALL be authored only after the complete implementation has passed a
core-goal review. Test and build commands SHALL run only after explicit user
authorization.

#### Scenario: Implementation reaches its first checkpoint

- **WHEN** all planned production and documentation changes are present
- **THEN** the maintainer reviews goals and non-goals before tests are added
- **AND** mandatory Auth and deployment-safety tests are added after acceptance
- **AND** no automated test or build command runs merely because planning or
  implementation completed
