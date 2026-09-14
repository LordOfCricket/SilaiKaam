# @silaikaam/web

Next.js + React + TypeScript web application (foundation only — no business pages yet).

## Development

```bash
cp .env.local.example .env.local
pnpm --filter @silaikaam/web dev
```

## Structure

```text
src/
├── app/         Next.js App Router routes/layouts
├── components/  Shared/reusable UI components
├── features/    Feature-scoped modules
├── lib/         Framework-agnostic utilities
├── hooks/       React hooks
├── services/    API/data-fetching clients
├── types/       Local TypeScript types
├── constants/   Local constants
├── config/      Environment/app configuration
└── styles/      Global/shared styles
```

3D dependencies (`three`, `@react-three/fiber`, `@react-three/drei`) are installed and
ready for future SilaiKaam 3D work.
