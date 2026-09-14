# SilaiKaam

Monorepo foundation for SilaiKaam — a tailoring/fitting marketplace platform.

> **Status:** Project foundation only. No business features, schema, or auth are implemented yet.

## Stack

- **Web:** Next.js, React, TypeScript
- **Mobile:** React Native, TypeScript
- **Backend:** NestJS (API Gateway + microservices), TypeScript
- **Database:** PostgreSQL + Prisma
- **Messaging:** RabbitMQ
- **3D:** Three.js + React Three Fiber
- **Infra:** Docker Compose (local dev)

## Structure

```text
apps/           Next.js web, React Native mobile, NestJS API gateway
services/       Placeholder microservices (identity, user, shop, catalog, order,
                fitting, assignment, pricing, notification, admin)
packages/       Shared technical packages (config, types, constants, validation,
                logger, database, messaging, shared)
infrastructure/ Docker, Postgres, RabbitMQ local dev config
docs/           Architecture, database, API, decision docs
scripts/        Repo automation scripts
```

## Prerequisites

- Node.js >= 20
- pnpm >= 9 (`npm install -g pnpm`)
- Docker Desktop (for PostgreSQL + RabbitMQ)

## Getting started

```bash
cp .env.example .env
pnpm install
pnpm docker:up        # starts PostgreSQL + RabbitMQ
pnpm dev               # runs web, api-gateway (and other dev-enabled apps) in parallel
```

## Root scripts

| Script                | Description                         |
| --------------------- | ----------------------------------- |
| `pnpm dev`            | Run apps/services in dev mode       |
| `pnpm build`          | Build all workspace packages        |
| `pnpm lint`           | Lint all workspace packages         |
| `pnpm typecheck`      | Type-check all workspace packages   |
| `pnpm format`         | Format the repo with Prettier       |
| `pnpm format:check`   | Check formatting without writing    |
| `pnpm test`           | Run tests across workspace packages |
| `pnpm docker:up/down` | Start/stop local infra containers   |
| `pnpm db:generate`    | Generate Prisma client              |
| `pnpm db:migrate`     | Run Prisma migrations (dev)         |

## Notes

- Service boundaries under `services/` are placeholders and will be finalized later.
- Shared packages hold reusable technical code only — never business logic.
- See `docs/` for architecture notes and decisions as they are added.
