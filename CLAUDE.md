@AGENTS.md

## Project
BizSim — multi-tenant business simulation platform for universities (tenants, teachers, students, scenarios, grading, PayTR billing).
Stack: Next.js 16 (App Router), React 19, TypeScript, Prisma 5 (SQLite dev / Postgres prod), NextAuth v5, next-intl (az/en/tr), Tailwind 4, Vitest, Playwright.

## Structure
- `src/app/` — routes (App Router)
- `src/components/` — UI components
- `src/lib/` — business logic, services, utils
- `src/i18n/`, `messages/` — translations (az.json, en.json, tr.json — large, grep keys, don't read fully)
- `prisma/` — schema, migrations, seeds
- `scripts/` — worker, cron, maintenance scripts
- `e2e/` — Playwright tests
- `docs/`, `*_PROMPT.md`, `PROJECT_OVERVIEW.md` — reference only, read only when asked

## Commands
- Install: `npm install`
- Run: `npm run dev`
- Test: `npx vitest run <file>` (single file) / `npm test`
- Lint: `npx eslint <file>` / `npm run lint`
- Types: `npx tsc --noEmit`
- DB: `npm run db:push` / `npm run db:seed`

## Token-saving rules (ALWAYS follow)
- Be concise. No long explanations unless asked. No summaries of what you just did.
- Do not explore the whole repo. Read only the files needed for the task. Ask if unsure which file.
- Never read full data files (csv, xlsx, json dumps, `messages/*.json`, seed data). Use grep or `head -20`.
- Never read `node_modules/` (except `node_modules/next/dist/docs/` per AGENTS.md), `.next/`, `coverage/`, `uploads/`, `dist/`, `build/`, `.git/`, `package-lock.json`, `tsconfig.tsbuildinfo`.
- Trim command output: pipe long output through `| tail -30` or `| grep -i error`.
- Run only the relevant test file with quiet flags when possible.
- Edit files with small targeted edits. Do not rewrite whole files.
- Do not create extra files (README, docs, examples) unless asked.
- For big or unclear tasks: propose a short plan first, wait for approval, then code.

## Code style
- TypeScript strict, functional React components, server components by default.
- All user-facing text via next-intl — add keys to all 3 locales.
- Raw SQL: guard Postgres-only queries with `isPostgresDatabase()`.
- Keep functions small; comments only where logic is non-obvious.
