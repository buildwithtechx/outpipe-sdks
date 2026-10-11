# Outpipe SDKs

Official multi-language client SDKs and framework integrations for [Outpipe](https://github.com/buildwithtechx/outpipe).

## Packages

| Package | Language / Framework | Description |
| :--- | :--- | :--- |
| [`@outpipe/sdk`](packages/sdk) | TypeScript | Core Outpipe client library |
| [`@outpipe/shared`](packages/shared) | TypeScript | Shared crypto, schemas, and brand tokens |
| [`@outpipe/react`](packages/react) | React | React hooks and tunnel status providers |
| [`@outpipe/hono`](packages/hono) | Hono | Middleware for Hono applications |
| [`@outpipe/tanstack-start`](packages/tanstack-start) | TanStack Start | Full-stack tunnel adapter |
| [`@outpipe/next`](packages/next) | Next.js | Route handlers and server middleware |
| [`@outpipe/nest`](packages/nest) | NestJS | NestJS module and interceptor |
| [`@outpipe/express`](packages/express) | Express | Express middleware |
| [`@outpipe/angular`](packages/angular) | Angular | Angular services |
| [`@outpipe/vite-plugin`](packages/vite-plugin) | Vite | Vite dev server proxy plugin |
| [`outpipe-go`](packages/go) | Go | Native Go client library |
| [`outpipe-rust`](packages/rust) | Rust | Native Rust client library |
| [`outpipe-php`](packages/php) | PHP | Native PHP Composer client library |

## Development

```bash
# Install dependencies
npm install

# Build all TypeScript packages
npm run build:packages

# Run tests
npm test
```

## License

AGPL-3.0-or-later
