## Description

<!-- What does this PR do? Why is it needed? Link any related issues. -->
Closes #

## Type of change

- [ ] Bug fix
- [ ] New feature
- [ ] Refactor / chore
- [ ] Documentation
- [ ] CI / tooling

## Summary

<!-- Describe the change and link the issue (for example, Closes COD-89). -->

## Security and access

- [ ] Authentication, authorization, and tenant boundaries reviewed where affected
- [ ] No production credentials or sensitive data added to workflow logs or artifacts

## Data and rollout

- [ ] No database migration
- [ ] Database migration included and reviewed for fresh install and populated upgrade
- [ ] Rollout, backfill, and rollback notes added below when needed

## Validation

<!-- List the exact commands and results; include relevant coverage changes. -->

- [ ] `pnpm test:unit` passes
- [ ] `pnpm test:integration` passes
- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes

## Code review checklist

- [ ] Existing conventions and patterns are followed
- [ ] Inputs are validated and workspace ownership is enforced where relevant
- [ ] Server actions return the standardized `ActionResponseType` where relevant
- [ ] Tests cover changed behavior
- [ ] No unsafe casts or production credentials introduced
- [ ] Docs are updated when behavior changes

## Dependency exceptions

- [ ] No dependency exception required
- [ ] Exception documented with package, advisory, scope, owner, expiry, and remediation issue

## Screenshots and reviewer notes

<!-- Add screenshots or context reviewers need. -->
