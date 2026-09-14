# @silaikaam/api-gateway

NestJS API Gateway (foundation only — no auth, routing to services, or business logic yet).

Provides, ready for future use:

- Global `ValidationPipe` (whitelist + transform)
- Global exception filter (`src/common/filters`)
- Global logging interceptor (`src/common/interceptors`)
- Centralized env config via `@silaikaam/config` (`src/config`)
- Health check: `GET /health`

## Dev

```bash
pnpm --filter @silaikaam/api-gateway dev
```

## Test

```bash
pnpm --filter @silaikaam/api-gateway test
```
