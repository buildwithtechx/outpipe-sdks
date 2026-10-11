# Agent Instructions

## Project boundary

This repository contains the official multi-language SDKs and framework integrations for Outpipe. It provides client libraries in TypeScript/JavaScript, Go, Rust, and PHP, alongside web framework middleware.

All client libraries communicate with Outpipe relays and management endpoints via public HTTP and WebSocket APIs defined in `protocol/schema/`.

## Code style

- Keep files under 350 lines.
- Keep one module or component per source file.
- Use named exports in TypeScript.
- Avoid comments, GoDoc, and JSDoc unless required by a tool or language directive.
- Adhere to idiomatic ecosystem standards:
  - TypeScript: Use Biome for formatting and linting. Never use Prettier.
  - Go: Format with standard `gofmt`. Always check and wrap errors with useful context.
  - Rust: Format with `cargo fmt`. Check clippy lints where applicable.
  - PHP: Strict typing enabled (`declare(strict_types=1);`). PSR-12 compliant.

## Conformance and protocol contracts

- Protocol schemas live under `protocol/schema/` and must remain language-neutral.
- Do not edit generated bindings under `protocol/generated/` by hand.
- SDK clients must conform to the shared test fixtures in `protocol/fixtures/conformance_fixtures.json` and `protocol/fixtures/http_tunnel_contract.json`.

## Workspace packages

- `packages/sdk`: Core universal TypeScript / Node.js client.
- `packages/react`: React hooks and provider.
- `packages/next`: Next.js middleware and route handlers.
- `packages/nest`: NestJS module and injectable service.
- `packages/express`: Express middleware.
- `packages/angular`: Angular service and module.
- `packages/hono`: Hono middleware and bindings.
- `packages/tanstack-start`: TanStack Start integration.
- `packages/vite-plugin`: Vite development proxy integration.
- `packages/go`: Official Go client module.
- `packages/rust`: Official Rust crate.
- `packages/php`: Official PHP Composer package.

## Workflow

- Read files before editing them.
- Use targeted patches for edits.
- Run `npm run fmt` before finishing a change session.
- Run the relevant ecosystem tests (`npm test`, `npm run test:go`, `npm run test:rust`, or `npm run test:php`).
- Do not commit or push unless explicitly requested.
