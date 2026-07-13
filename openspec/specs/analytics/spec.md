# analytics Specification

## Purpose
TBD - created by archiving change add-web-native-analytics. Update Purpose after archive.
## Requirements
### Requirement: Web analytics SHALL track page views when configured
The web app SHALL initialize Google Analytics and OpenPanel from public environment variables. Google Analytics SHALL track page views for client-side route changes when configured, and OpenPanel SHALL only record events when explicit tracking helpers are called.

#### Scenario: Web analytics disabled without credentials
- **WHEN** the web app runs without analytics environment variables
- **THEN** it renders without loading Google Analytics or sending OpenPanel events

#### Scenario: Web page view tracking
- **WHEN** the web app runs with analytics environment variables and the route changes
- **THEN** it records Google Analytics page views without sending OpenPanel events for automatic route changes

### Requirement: Native analytics SHALL track OpenPanel screen views when configured
The native app SHALL initialize OpenPanel from public Expo client ID and client secret environment variables and SHALL only record OpenPanel events when explicit tracking helpers are called.

#### Scenario: Native analytics disabled without credentials
- **WHEN** the native app runs without OpenPanel environment variables
- **THEN** it renders without sending OpenPanel events

#### Scenario: Native screen view tracking
- **WHEN** the native app runs with an OpenPanel client ID, client secret, and the route path changes
- **THEN** it does not record OpenPanel screen views automatically for route changes

