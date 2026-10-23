# astro-homepage

The RU/EN portfolio & resume Site for Sviataslau Kuntsov — Astro, deployed to
Vercel.

## Layout

The repo is flat: the Astro project lives at the root (`src/`, `public/`,
`astro.config.mjs`, `tsconfig.json`, `package.json`). Domain docs live alongside
it: `GLOSSARY.md`, `docs/adr/`, `docs/specs/`.

## Commands

```sh
pnpm install   # install dependencies
pnpm dev       # dev server at http://localhost:4321
pnpm build     # production build to ./dist/
pnpm preview   # preview the production build
```

Uses **pnpm** (pinned in `package.json`). Build approvals for native dependencies
live in `pnpm-workspace.yaml`.
