# Protect core and product boundaries

## Decision

Core infrastructure is maintained upstream; product business domains live in
named application modules downstream. CODEOWNERS, AI rules, and a narrow import
check make the boundary reviewable without adding a runtime plugin framework.

## Why

Downstream products need to receive template security and infrastructure fixes
without repeatedly reconciling product-specific changes to core modules.

## Consequences

- Core changes require maintainer review and a template version bump.
- Products consume documented contracts and keep their own behavior in modules.
- The static check is intentionally limited to obvious forbidden imports; it is
  not a substitute for architectural review.
