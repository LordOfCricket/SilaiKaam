#!/usr/bin/env bash
# One-time local dev setup: env file, dependencies, infra containers, Prisma client.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example — review it before continuing."
fi

pnpm install
pnpm docker:up
pnpm db:generate

echo "Setup complete. Run 'pnpm dev' to start the apps."
