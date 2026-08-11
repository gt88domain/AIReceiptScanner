# Control read transport runbook

ControlReadV1 is read-only. This runbook describes manual Cloudflare setup only;
it does not create, deploy, or modify any Cloudflare resource.

## Same account: Service Binding RPC

1. Deploy the downstream project normally.
2. In the future Central Admin Worker's `wrangler.jsonc`, add a service binding
   for that Worker with `entrypoint: "ControlReadEntrypoint"`.
3. Call only `getSnapshot`, `getOverview`, `getAnalytics`, `listUsers`,
   `getIntegrations`, `listAudit`, or `getSystem` from the Central Worker.

The binding is available only within the same Cloudflare account. Do not add an
application-level secret to it.

## Cross account: Cloudflare Access HTTPS

1. Configure a dedicated hostname such as `control.project.example`; never use
   the public product hostname or a wildcard.
2. Create a Cloudflare Access self-hosted application for that hostname with a
   **Service Auth only** policy.
3. Create or select a Service Token. Keep its Client ID and Client Secret in the
   future Central Admin Worker only.
4. Set the downstream Worker's non-secret server configuration:

   ```text
   CONTROL_READ_HTTP_HOST=control.project.example
   CONTROL_ACCESS_TEAM_DOMAIN=https://team.cloudflareaccess.com
   CONTROL_ACCESS_AUD=the-access-application-audience
   ```

5. Run production preflight, deploy through the normal downstream release flow,
   and verify a server-to-server GET to `/__control/v1/snapshot`.
6. Rotate or revoke the Access Service Token in Cloudflare Access when needed;
   update only the Central Admin secret store.

Do not add CORS, a downstream copy of the Client Secret, a shared API key, or a
browser caller. One Service Token per target Cloudflare account/security domain
is sufficient initially, provided the Access policy limits it to the intended
Control applications.
