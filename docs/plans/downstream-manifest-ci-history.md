# Downstream manifest CI history

## Core goal

Allow a downstream repository that correctly records an adopted EasyStarter
release in `.template/source.json` to pass the template modification audit in
the standard Quality workflow.

## Acceptance criteria

- The Quality test job checks out enough Git history for
  `git merge-base --is-ancestor <source-release> HEAD` to resolve a recorded
  release commit.
- Static and build jobs keep their shallow defaults because they do not run the
  downstream modification audit.
- No product runtime, deployment configuration, or release accounting is
  changed.

## Deferred test plan

- The existing `pnpm test` in the Quality test job runs
  `scripts/check-template-modifications.mjs`; the private downstream adoption
  PR is the regression scenario.
- Verify that a source manifest pointing at the adopted release passes in CI
  after the change, then release as a template patch.

## Status

- Implementation: complete
- Core-goal review: passed — full history is scoped only to the job that needs
  ancestry inspection.
- Test authoring: covered by the existing end-to-end modification audit.
- Test execution: passed — Quality, build, static, and OSV checks passed on
  PR #130.
