# One-time local dev setup: env file, dependencies, infra containers, Prisma client.
$ErrorActionPreference = "Stop"
Set-Location "$PSScriptRoot\.."

if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  Write-Host "Created .env from .env.example — review it before continuing."
}

pnpm install
pnpm docker:up
pnpm db:generate

Write-Host "Setup complete. Run 'pnpm dev' to start the apps."
