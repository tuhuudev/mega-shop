# CLAUDE.md — mega-shop

Single-store e-commerce: Next.js 15 (App Router) + Supabase (Postgres, Auth, RLS) + VNPay sandbox. Money is integer VND everywhere. README.md holds the architecture, slice ownership and contracts — read it first.

## Commands
- `npm ci`
- `npm run typecheck` — `tsc --noEmit` (strict, `noUncheckedIndexedAccess`, `verbatimModuleSyntax` → use `import type`)
- `npm test` — Vitest, tests live next to code as `src/**/*.test.ts`; `vitest.config.ts` sets fake VNPay env
- `npm run build` — needs `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` set (placeholders are fine)
- typecheck + test + build must pass before a PR (same as CI). `npm run lint` has no ESLint config yet.

## Key places
- `src/lib/schemas.ts` — zod contracts shared by all slices; don't redefine types elsewhere.
- `src/lib/payment/vnpay.ts` — sign/verify (HMAC-SHA512). `src/app/api/payment/vnpay/{create,return}` — payment flow.
- `supabase/migrations/0001_init.sql` — schema, RLS, `place_order` RPC. Any table change needs a new migration file.

## Rules
- Never trust client-supplied amounts/status; payment state changes only in server handlers using `createAdminClient()` after signature + amount checks.
- Never commit `.env.local` or real keys.
