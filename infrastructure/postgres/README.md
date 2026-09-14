# PostgreSQL (local development)

Uses the official `postgres` Docker image with credentials from the root `.env`
(`POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`). No init scripts yet — the
database schema is designed in a later phase.

Place future local-only init SQL (extensions, roles) in this directory and mount it
into the container's `/docker-entrypoint-initdb.d/` if/when needed.
