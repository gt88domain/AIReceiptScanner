# Contributing to EasyStarter

This repository is an upstream template. Keep a PR focused and identify it as
core, platform module, extension, or product work before writing code.

For core changes, first consider a downstream product module or existing static
extension point. Changes to auth, money, D1/migrations, Jobs, storage, shared
contracts, CI, or deployment safeguards require focused tests and maintainer
review. Never rewrite applied migrations or deploy infrastructure from a PR.

Run the documented verification commands and complete the PR template. Read
[GOVERNANCE.md](GOVERNANCE.md), the [architecture boundaries](docs/architecture-boundaries.md),
and the [migration playbook](docs/migration/00-audit.md) before a migration.
