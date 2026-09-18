# 01 — Data owner

Complete this after the audit and before designing tables or an import script.
Every record needs one authoritative writer during the migration.

## Ownership ledger

For each entity, record:

| Field | Required answer |
| --- | --- |
| Source of truth | The system that is authoritative before and after cutover. |
| Data owner | The product/team accountable for correctness and approval. |
| Writers | Which services may create or update it in each phase. |
| Identifier | Stable legacy key, new key, and any mapping table required. |
| Classification | Public, private, payment, authentication, or sensitive personal data. |
| Retention | What must be retained, deleted, anonymized, or archived. |

Never run two uncontrolled writers against the same entity. If a temporary
dual-write is required, state its conflict rule, start/end date, and the person
who can disable it.

## Import boundary

The importer belongs to the destination domain and writes only that domain's
tables and assets. It must not silently update auth, admin membership,
entitlements, payment ledgers, or credits. Those systems have their own verified
inputs: session/allowlist, payment webhooks, and credit services.
