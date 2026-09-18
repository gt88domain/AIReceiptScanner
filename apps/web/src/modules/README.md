# Web domain modules

`src/modules/<domain>/` is the home for new product-domain web code. Keep
TanStack route files thin: they validate route parameters, invoke the module,
and render its page entry point. Domain-specific loaders, components, copy,
and view models belong in the matching module rather than global `components/`
or `lib/` directories.

Some downstream repositories may still carry the legacy `src/custom/`
directory. Do not add new domains there; migrate a legacy domain only when a
separate product change already requires touching it.
