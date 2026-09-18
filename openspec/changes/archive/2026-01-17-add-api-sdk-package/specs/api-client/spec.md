## ADDED Requirements

### Requirement: Shared API client
The system SHALL provide a workspace package that exposes a typed oRPC client and shared TanStack Query helpers for web and native apps.

#### Scenario: Create client with base URL
- **WHEN** a caller creates a client with a base URL and optional auth hook
- **THEN** the client package returns a typed oRPC client and query utilities bound to that base URL

### Requirement: Configurable auth injection
The system SHALL allow callers to inject auth headers or custom fetch behavior when creating the client.

#### Scenario: Native cookie injection
- **WHEN** the caller supplies a header factory that returns a Cookie header
- **THEN** requests include the supplied header values

### Requirement: Type sharing without app-relative imports
The system SHALL export API router types from the client package so clients do not import from `apps/server`.

#### Scenario: Native client imports types
- **WHEN** the native app imports the client type from the client package
- **THEN** no path import from `apps/server` is required
