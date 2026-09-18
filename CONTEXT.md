# EasyStarter

Domain language for EasyStarter product, billing, credits, storage, and platform behavior.

## Language

**Membership Catalog**:
The product-level source of membership plan and price semantics, including tier, price type, billing interval, and status. Platform and provider identifiers attach to the Membership Catalog as adapter data, but they are not the catalog's core meaning.
_Avoid_: Web payments config, native payments config, provider catalog

**Membership Tier**:
The rank of membership entitlement a user receives from the Membership Catalog. A Membership Tier is not the same as a billing interval.
_Avoid_: Billing interval, price interval

**Free Membership**:
The default membership tier for a user with no paid membership entitlement. Free Membership is not a purchasable Membership Plan.
_Avoid_: Free plan

**Membership Entitlement**:
The current membership access a user has, including membership tier and entitlement source. A Membership Entitlement is not the same as Billing Status, which includes provider and account management details.
_Avoid_: Billing status, subscription status

**Credit Package**:
A purchasable bundle of credits that grants credit ledger balance after payment. A Credit Package is not part of the Membership Catalog because it does not create membership entitlement.
_Avoid_: Membership plan, membership price
