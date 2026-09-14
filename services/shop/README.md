# shop-service

Placeholder scaffolding for the **shop** microservice.

This is an initial service boundary, not final architecture — it exists only to prove out
the shared NestJS service template (health check, config module, validation pipe).
No business logic, database schema, or authentication is implemented yet.

## Dev

```bash
pnpm --filter @silaikaam/shop-service dev
```

Health check: `GET http://localhost:3103/health`
