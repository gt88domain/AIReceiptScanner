# Golden path: SaaS

Use this path for a Web-first subscription product.

1. Adopt a released template tag and create `.template/manifest.json`.
2. Configure Better Auth, Web payments, and production safety secrets.
3. Add each business domain under `apps/server/src/modules/<domain>` and a
   matching thin web module under `apps/web/src/modules/<domain>`.
4. Gate paid operations with `requireCapability`; never compare plan names in
   product code.
5. Record payments through verified webhooks and run the template gate before
   each release.

Do not enable mobile, Jobs, or Storage until the product needs them.
