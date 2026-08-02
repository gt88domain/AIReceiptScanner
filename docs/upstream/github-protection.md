# GitHub protection

Apply these settings to `main` manually. Repository settings are not changed by
template code.

1. Require a pull request, block direct pushes, force pushes, and branch deletion.
2. Require the stable `verify` and `osv` checks. Path-filtered optional checks
   are informational unless they run for the changed paths.
3. Require conversation resolution, dismiss stale approvals after relevant
   changes, and restrict bypasses to the template maintainer.
4. Prefer squash merges for focused upstream changes.

For a solo maintainer, keep the required approval count at zero: a mandatory
second human would block legitimate maintenance. CODEOWNERS still documents
ownership and should become a required review when an independent reviewer is
available. Record any emergency bypass in the merge PR.
