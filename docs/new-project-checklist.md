# New project launch checklist

The template ships docs and blog as disabled, zero-example content capabilities.
Keep them disabled until the product owns their content and route acceptance
criteria. Listing and landing-page composer routes remain absent.

Before the first public deployment:

- set the app name, support email, public URLs, favicon, and Open Graph image;
- replace the landing-page copy while keeping its components and visual style
  if they suit the product;
- review the privacy policy and terms with the product owner; and
- enable newsletter, contact, billing, storage, jobs, or tickets only when the
  corresponding provider and product workflow are ready; and
- enable docs/blog only after turning on `features.docs`/`features.blog` in
  `packages/app-config/src/product-config.ts`, adding product-owned content, and
  accepting the routes in every supported locale.

Do not restore template examples as production content. Blog and docs content,
authors, and categories must remain product-owned.
