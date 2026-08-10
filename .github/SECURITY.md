# Security Policy

## Reporting a vulnerability

We take security seriously. **Please do not open a public issue** for a security vulnerability.

Report suspected vulnerabilities privately via GitHub's Security Advisories:

👉 https://github.com/codewithnuh/handoff/security/advisories/new

Please include:

- The affected version / commit
- A description of the vulnerability and its impact
- Steps to reproduce (or a minimal proof of concept)
- Any suggested remediation, if you have one

## Response

- We will acknowledge your report within **5 business days**.
- We will work with you to reproduce, fix, and validate the issue.
- We aim to ship a fix in a timely manner, coordinated with a coordinated disclosure if needed.
- You will be credited (unless you prefer to remain anonymous).

## Supported versions

| Version | Supported          |
| ------- | ------------------ |
| latest  | ✅                 |
| < latest| ❌                 |

We recommend always running the latest release.

## General security notes

- Secrets (`BETTER_AUTH_SECRET`, `AUTH_SECRET`, `DATABASE_URL`) must never be committed.
- Use a long, random `BETTER_AUTH_SECRET` (min 32 chars) in production.
- Run with secure cookies in production (`useSecureCookies` is enabled when `NODE_ENV === "production"`).
