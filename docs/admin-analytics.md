# Admin analytics

## Purpose

`/admin/analytics` is an administrator-only summary of platform business data already stored
in D1. It is a small operational read model, not an analytics platform.

## Included metrics

| Area | Metric | Source | Window behavior |
| --- | --- | --- | --- |
| Users | Total users | `user` | All-time; excludes `deleted_at` rows. |
| Users | New users | `user.created_at` | `7d`, `30d`, `90d`, or all-time. |
| Billing | Active subscriptions | `billing_subscription` | Current state, using `ACTIVE_SUBSCRIPTION_STATUSES`. |
| Billing | Successful purchases | `billing_purchase` | `succeeded` rows in the selected paid-at window. |
| Credits | Granted, consumed, revoked, restored | `credit_account` | All-time account aggregates; preserves the v0.4.9 accounting definitions. |
| Jobs | Pending and failed | `job` | Current state; only when Jobs is enabled. |
| Webhooks | Pending and dead-lettered | `billing_event` | Current processing state; only when Billing is enabled. |
| Audit | Administrative changes | `admin_audit_log` | All-time count of administrator mutations. |

Revenue is deliberately not shown. `billing_purchase` has no amount or currency facts, and
`credit_order` covers only credit-package payments. Combining either into a platform revenue
number would be unreliable or mix currencies.

## Module and infrastructure boundary

The analytics router is part of Admin Core and uses only D1 aggregations plus the resolved
platform composition. Disabled modules return `null` and their queries are not scheduled.
It does not initialize payment providers, require Queue/R2 bindings, call provider APIs, or
call Cloudflare APIs.

Traffic, request, runtime, logs, traces, and Cloudflare resource metrics remain in Cloudflare.
This page does not collect page views, events, sessions, presence, or online users.

## Query cost

The route returns one consolidated DTO and performs `COUNT`/`SUM` in D1. It never selects user,
payment, audit, or webhook rows for JavaScript aggregation. The current schema does not have
standalone indexes for `user.created_at`, `billing_purchase.paid_at`, or
`admin_audit_log.created_at`; their windowed aggregates are admin-only reads. If production data
makes either a hot path, record `ANALYTICS_INDEX_BLOCKER` and add a dedicated, reviewed migration
in a later change rather than weakening the metric or adding a hidden index here.

## Product extension boundary

Downstream products may statically compose their own section after the platform metrics. The
template does not load, register, persist, or execute extensions dynamically.

```ts
type AdminAnalyticsMetric = {
  id: string;
  label: string;
  value: number | string;
  description?: string;
};

type AdminAnalyticsExtension = {
  id: string;
  title: string;
  metrics: readonly AdminAnalyticsMetric[];
};

const aibrandingAnalytics: AdminAnalyticsExtension = {
  id: "aibranding",
  title: "AIBranding",
  metrics: [
    { id: "brandProjects", label: "Brand projects", value: 42 },
    { id: "domainSearches", label: "Domain searches", value: 18 },
    { id: "logoGenerations", label: "Logo generations", value: 63 },
  ],
};
```

The example is a downstream contract only. EasyStarter does not implement, store, or calculate
those product metrics.

## Excluded

- Traffic, logs, CPU, traces, and infrastructure observability
- Revenue conversion or currency conversion
- Product-specific metrics
- Realtime analytics, charts, online users, and session replay
- Ticket, Inbox, CRM, RBAC, or user mutation
- New tables, migrations, queues, crons, workers, or third-party analytics dependencies
