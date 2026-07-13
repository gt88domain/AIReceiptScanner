# Change: Sync admin plan and price creation with Stripe

## Why
Admin plan setup currently requires manual Stripe product/price creation and manual ID entry, which is error-prone and slows onboarding.

## What Changes
- Auto-create Stripe Products when admins create plans.
- Auto-create Stripe Prices when admins create Stripe prices (subscription or one-time).
- Store Stripe product IDs on plans and Stripe price IDs on prices.
- Keep non-Stripe providers as manual ID entry.

## Impact
- Affected specs: payments
- Affected code: apps/server, apps/web, packages/i18n, docs
