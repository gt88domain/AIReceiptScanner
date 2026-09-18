# Add a provider adapter

Keep provider SDK initialization in a core adapter, not a product module. Define
the product-facing operation in a service contract, normalize provider errors,
and make webhook/event handling idempotent. Record supported configuration,
failure behavior, and compatibility in the PR. Do not expose SDK credentials or
raw provider objects to web/mobile code.
