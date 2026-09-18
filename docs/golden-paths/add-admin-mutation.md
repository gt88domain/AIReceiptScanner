# Add an admin mutation

Expose the mutation through a server admin procedure, call `requireAdmin`,
validate input at the API boundary, and write an audit record with redacted
before/after data. Test ordinary-user denial, allowlisted-admin success, and
audit output. Hidden UI is not authorization.
