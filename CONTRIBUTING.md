# Contributing to Outpipe SDKs

Contributions are welcome for the multi-language SDKs, framework adapters, and protocol conformance tests.

## Prerequisites

- Node.js 24 or newer and npm 10 or newer (for TypeScript SDKs)
- Go 1.26 or newer (for Go SDK)
- Rust stable and Cargo (for Rust SDK)
- PHP 8.4 or newer and Composer (for PHP SDK)

## Development and testing

### TypeScript packages

```sh
npm install
npm run fmt
npm run build:packages
npm run typecheck
npm test
```

### Go SDK

```sh
npm run test:go
# Or navigate to package:
cd packages/go && go test -v ./...
```

### Rust SDK

```sh
npm run test:rust
# Or navigate to package:
cd packages/rust && cargo test
```

### PHP SDK

```sh
npm run test:php
# Or navigate to package:
cd packages/php && composer test
```

## Protocol conformance

All SDK clients must validate against the shared test fixtures under `protocol/fixtures/`:
- `conformance_fixtures.json`: Envelope and message serialization/deserialization.
- `http_tunnel_contract.json`: HTTP API request and response payload structures.

## Pull requests

- Keep PRs scoped to a single language or framework package where possible.
- Update tests to assert new features or bug fixes against the protocol specification.
- Ensure all CI checks for the affected language pass before requesting review.
