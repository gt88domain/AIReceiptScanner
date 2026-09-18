# Product-owned D1 ledger and capability installs

This policy applies to **new EasyStarter products**. It prevents a product's
database history from becoming a second copy of the template's history.

It does not rewrite a live product's applied migrations. Existing products
keep their ledger and use the migration playbook for every forward change.

## One product, one ledger

A new product creates and owns its D1 migration sequence from
`0000_product_init.sql`. That sequence is the only history applied to that
product's database and the only history recorded in its `d1_migrations` table.

Template releases provide runtime code, checks, documentation, and optional
capability designs. They are not a second migration stream to merge into an
existing product. A normal product update therefore starts with
`pnpm template:upgrade-check`, then adopts reviewed runtime/tooling changes in
a scoped PR. Do not resolve a migration-directory overlap by editing applied
SQL or by copying the template's numbered SQL files into the product.

This policy deliberately does not use a `.gitattributes` `merge=ours` rule.
That name requires a machine-local custom Git driver, so committing the
attribute would create a false portable guarantee. A migration overlap remains
a review stop signal.

## Install an optional capability explicitly

When a product elects to use an optional capability whose schema it does not
yet have:

1. Review the capability's source release, SQL, runtime gate, and dependencies.
2. Write reviewed, self-contained SQL as the product's next migration number.
   It may create or alter only tables owned by that capability; it must not
   replay template migration history.
3. Record the adoption in `template-capabilities.lock.json`, using
   [`template-kit/capabilities.lock.example.json`](../template-kit/capabilities.lock.example.json)
   as the shape.
4. Apply and verify it through the product's normal Wrangler D1 workflow,
   including a fresh-database reproduction and the production-migration
   playbook where applicable.
5. Enable/register the runtime capability only after the product migration and
   lock entry are reviewed together.

The lock is evidence, not an executor. It records where the reviewed SQL came
from, the installed product migration, its content hash, and the dependencies
the reviewer checked. It never runs SQL automatically.

## Capability dependency rule

Each installed capability declares any required capability IDs. For example,
an optional billing installation can require `core-auth`. The product review
must prove those requirements are already installed before it enables the
dependent runtime. Missing schema or a missing lock entry is fail-closed: leave
the capability disabled instead of allowing an import or endpoint to reach
tables that do not exist.

## What stays product-owned

This policy does not standardize a product's domain schema, catalog tables,
URL contract, SEO, taxonomy, filters, or seed data. It only makes database
ownership and optional platform-capability adoption auditable. See the
[migration guide](./migration-guide.md) for legacy adoptions and
[upstream sync](./upstream-sync.md) for released-tag review.
