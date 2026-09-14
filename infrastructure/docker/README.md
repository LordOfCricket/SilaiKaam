# Docker (local development)

The root `docker-compose.yml` defines local infrastructure containers (PostgreSQL,
RabbitMQ). Application containers are intentionally not included yet — apps/services
run directly via `pnpm dev` during this foundation phase.
