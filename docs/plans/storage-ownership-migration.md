# Storage ownership migration

## Core goal

Make the existing asset table the authorization and listing source for stored
avatars, while preserving current avatar URLs and refusing to infer ownership
for unknown R2 objects.

## Implementation status

| ID | Decision | Status |
| --- | --- | --- |
| STORE-101 | Delete by asset ID after an owner-ID database lookup; never authorize from URL/key prefix | Implemented and statically reviewed |
| STORE-102 | Upload, list, replacement cleanup, and delete now call the asset module | Implemented and statically reviewed |
| STORE-104 | Keep the existing provider-shaped R2 URL for compatibility; Aliyun remains archived | No further code change by design |
| STORE-105 | List newest asset records with a maximum of 100; bound provider list calls; keep five-minute serve cache | Implemented and statically reviewed |

## Historical data policy

The only trustworthy legacy ownership relation available in the repository is
the avatar URL persisted on a user row. On list or before replacement, that URL
is parsed, the R2 object is read with `head`, and an idempotent asset record is
created with its original upload timestamp. A storage-key prefix identifies the
avatar purpose but never establishes ownership.

Unreferenced R2 objects are deliberately not adopted. Before production
cutover, operators must inventory them and choose deletion, external evidence,
or quarantine; the application must not guess an owner.

The current active provider set contains only R2, so asset rows do not add a
second provider discriminator. Both the new `{ assetId }` delete request and
the historical `{ url }` shape are accepted; URL compatibility still resolves
an owner-scoped asset row before deletion and never authorizes from key text.

## Deferred test plan

After core-goal review, add focused tests proving:

- uploads create an asset row and clean up R2 when metadata persistence fails;
- deletion rejects another user's asset ID without touching its object;
- legacy adoption works only for the current persisted `user.image`;
- a colliding asset key owned by another user is never reassigned;
- list returns at most 100 records in descending creation order;
- purpose filtering never broadens the owner predicate;
- replacement deletes the previous tracked avatar and cleans up a staged upload
  when the user update fails;
- R2 provider list calls never collect more than the requested bounded limit.

Recommended commands, not run:

```sh
pnpm --filter server check-types
pnpm --filter server test:config
pnpm test:integration
```

No D1 migration, R2 mutation, test, build, deploy, or production inventory was
run while preparing this change.

## Review and test-authoring status

- Core-goal review: passed after two independent reviews and correction of one
  missing URL-parser import.
- Accepted residual risk: D1 and R2 cannot commit atomically; current delete is
  retry-safe and upload attempts best-effort object cleanup.
- Future provider gate: adding a provider after R2 requires an asset provider
  discriminator and migration review.
- Test authoring: focused ownership and R2-bound tests added after core review.
- Test execution: not authorized and not run.
