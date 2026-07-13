# Web App

TanStack Start web app.

Important areas:

- `src/routes`: file-based routes.
- `src/components`: shared UI and feature components.
- `src/configs`: web config, nav, landing page registry.
- `src/lib`: browser/server utilities.
- `src/utils/orpc.ts`: typed API client wiring.

Rules:

- Do not access D1 or server secrets from web code.
- Keep custom product UI under `src/custom/<module>/` when possible.
- Route files may connect custom modules to the app, but larger logic should
  stay in the module folder.
