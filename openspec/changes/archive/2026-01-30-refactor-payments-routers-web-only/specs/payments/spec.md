## ADDED Requirements
### Requirement: Payments APIs are web-only
The system SHALL expose payments and payments admin APIs only under the web router namespace and SHALL NOT expose them to native clients via the shared router.

#### Scenario: Web API exposure
- **WHEN** a web client uses the `AppRouterClient`
- **THEN** payments APIs are available under the web router namespace

#### Scenario: Native API isolation
- **WHEN** a native client uses the shared router surface
- **THEN** payments APIs are not exposed
