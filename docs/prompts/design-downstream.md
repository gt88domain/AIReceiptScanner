# Downstream public-site design prompt

Use this prompt after adopting EasyStarter and before editing public pages. The
starter landing page is intentionally plain and disposable. The upstream owns
reliable behavior; the downstream product owns its visual identity.

## Copy this into the downstream AI task

```text
Design and implement this product's public site as product-owned UI. Do not try
to preserve the EasyStarter starter landing page or make small className patches
until it resembles the requested design.

First write a short design brief from the inputs below, then implement one page
family at a time:

- Product and audience:
- Primary user job:
- Three brand adjectives:
- Reference URLs and what to borrow from each:
- Designs or patterns to avoid:
- Information density: low / medium / high
- Motion: none / restrained / expressive
- Typography direction:
- Required pages: landing / directory / detail / search / blog / pricing / other
- Required states: loading / empty / error / signed out / signed in

Hard boundaries:

1. Keep auth, authorization, billing, data ownership, API, migration, and
   deployment contracts unchanged unless the task explicitly changes them.
2. Preserve semantic HTML, keyboard interaction, visible focus, reduced-motion
   behavior, URL/SEO contracts, and product-owned data semantics.
3. Keep shared `--skin-*` token names stable when reusing upstream public
   primitives. Token values are free to change in a product skin.
4. Public visual components may be composed, copied into the product module, or
   replaced when their structure does not fit. Prefer that over layered
   `className` overrides against shared internals.
5. Use existing dependencies first. Use a native select for a simple choice;
   use the existing Radix primitives for action menus, focus-managed overlays,
   and compound controls. Do not add a second headless component library for a
   single control.
6. The default production page must make no third-party image requests. Give
   images explicit dimensions and lazy-load non-critical media. Animate only
   transform and opacity, and honor `prefers-reduced-motion`.

Before handoff, verify mobile and desktop layouts, keyboard navigation, all
interaction states, production build, the shared CSS/JS budgets, and the real
Cloudflare preview URL. Record intentional deviations from upstream primitives.
```

## Ownership rule

Low visual constraint is intentional; zero engineering constraint is not.
Downstream code can replace public marketing, directory, article, and search
surfaces. It must not fork protected core behavior to achieve a visual result.
When three products need the same component behavior and substantially the same
props, propose an upstream primitive. Until then, keep it product-owned.
