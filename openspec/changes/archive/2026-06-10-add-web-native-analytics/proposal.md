# Change: Add web and native analytics

## Why
EasyStarter needs first-party analytics wiring for web traffic and native screen usage while keeping credentials outside source control.

## What Changes
- Add Web GA4 page view tracking from a public measurement ID.
- Add Web OpenPanel initialization and explicit tracking helpers without automatic event tracking.
- Add Native OpenPanel initialization and explicit tracking helpers without automatic route-change screen view tracking.
- Document placeholder environment variables for local and EAS builds.

## Impact
- Affected specs: analytics
- Affected code: web root/provider analytics, native root analytics, package dependencies, environment examples
