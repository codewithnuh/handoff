# Production dependency audit exceptions

The production dependency CI check fails on high and critical advisories. No active exceptions are approved by default. A registry or scanner outage is not an exception and keeps the CI check failed until it can be rerun.

Any time-limited exception must be reviewed and recorded in the pull request with all of these fields:

- Package and advisory identifier
- Affected production scope and why the exposure is constrained
- Named owner
- Expiry date
- Remediation issue and planned fix

Exceptions must be removed when the dependency is patched or the expiry is reached. Critical findings require remediation before merge; do not add an exception for a critical advisory.
