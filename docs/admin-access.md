# Administrator access

Administrator authorization has two separate layers:

1. Cloudflare Access can protect the Web application's `/admin` path before a
   request reaches the application.
2. Better Auth plus the exact, normalized `ADMIN_EMAILS` server secret protects
   every administrative oRPC procedure through `adminProcedure`.

Cloudflare Access is a useful perimeter, not an authorization replacement. An
Access policy must never be treated as permission to call an administrative API;
the server-side admin check remains mandatory for every procedure.

## Configure the `/admin` perimeter

Configure this manually in the Cloudflare Zero Trust dashboard:

1. Open **Access controls** → **Applications** → **Add an application** →
   **Self-hosted**.
2. Set the application's domain to the production Web hostname and add the path
   `/admin` (or the dashboard's equivalent path rule). Do not use a broad rule
   unless every Web route is intentionally in scope.
3. Create an Allow policy for named administrator identities, using full email
   addresses only. Do not allow an entire email domain and do not use an
   `Everyone` rule.
4. Require the chosen identity provider's MFA and choose a short application
   session duration appropriate for administrator access.
5. Confirm the policy is active, then keep the server's `ADMIN_EMAILS` secret
   restricted to the same approved people.

This only guards the browser route. It does not protect all API requests, and
it does not change Better Auth sessions or the server's authorization decision.
Verifying Access JWTs inside the application may be considered later if a
product requirement needs that additional boundary; it is intentionally out of
scope for this setup.

## Manual verification

After each policy change, verify all of the following:

1. A visitor without an Access login is denied the `/admin` page.
2. An Access-authenticated person who is not in `ADMIN_EMAILS` is denied the
   application's admin experience and every admin API call.
3. A person allowed by Cloudflare Access but absent from `ADMIN_EMAILS` cannot
   call an admin oRPC endpoint directly.
4. A non-admin Better Auth session calling an admin oRPC endpoint directly is
   denied even when the request does not pass through the Web route.
