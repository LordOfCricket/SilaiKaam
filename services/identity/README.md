# identity-service

Placeholder scaffolding for the **identity** microservice.

This is an initial service boundary, not final architecture — it exists only to prove out
the shared NestJS service template (health check, config module, validation pipe).
No business logic, database schema, or authentication is implemented yet.

## Dev

```bash
pnpm --filter @silaikaam/identity-service dev
```

Health check: `GET http://localhost:3101/health`
