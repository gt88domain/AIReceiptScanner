# Extension points

EasyStarter uses static, source-controlled extension points rather than a
runtime plugin loader. This keeps deployment, migrations, and authorization
auditable.

| Need | Extension point |
| --- | --- |
| Product behavior | `apps/server/src/modules/<domain>` and `apps/web/src/modules/<domain>` |
| API surface | oRPC contracts and routers mounted by the Server Worker |
| Background work | a registered handler in `apps/server/src/modules/jobs` |
| Paid access | capability configuration and standard auth guards |
| Product files | Asset service and its visibility policy |
| Optional platform | source-controlled mobile capability plus explicit config gate |

Core abstractions are added only when multiple products need the same contract.
Do not create a dynamic plugin system, runtime code discovery, or arbitrary
provider initialization in a product module.

## Contract requirements

Job handlers are registered, idempotent, and retry/DLQ-safe. Provider adapters
own SDK initialization, normalize failures, and document webhook idempotency.
Admin contributions use standard guards and audit logging. Auth lifecycle work
belongs in the adapter/guard boundary, never a product feature. Capability
contributions declare a stable capability name and enforce it on the server.
Each extension PR states compatibility, ordering, failure behavior, and focused
test evidence.
