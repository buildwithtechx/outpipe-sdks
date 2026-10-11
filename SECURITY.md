# Security Policy

## Supported versions

Security fixes are prioritized for the latest release tags of each respective package and the default development branch.

## Reporting a vulnerability

Do not disclose security vulnerabilities in public issues, pull requests, or discussions.

Report vulnerabilities privately through the repository's GitHub Security Advisory tab or email project maintainers directly.

Please include:
- The affected SDK package and version (e.g., `@outpipe/sdk`, `outpipe` crate, `packages/go`, `packages/php`).
- A description of the vulnerability (e.g., token leakage in query strings, SSRF vectors, insecure transport defaults, header injection).
- Minimal reproduction code or instructions.

## Scope

In scope:
- Client authentication and token handling.
- Transport security (TLS verification and default configurations).
- Conformance validation and safe deserialization of protocol messages.
- Framework middleware security (request forwarding, header verification).
