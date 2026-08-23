# Canonical production path

This repository and its declared production database/deployment configuration are the sole implementation source of truth. Legacy Lovable, Base44, Stripe, Supabase, prototype, and abandoned branches are reference material only unless explicitly marked canonical. No fix is considered complete if it exists only in a non-production branch.

## One of each

| Concern | Canonical choice | Reference only |
| --- | --- | --- |
| Repository | `github.com/Boliviq/boliviq-professional-redesign` | Older Lovable/Base44 exports |
| Primary branch | `main` (Lovable-connected). Engine work lands via PR into `main`. | Feature branches, including the four Stripe experiments |
| Database | Supabase Postgres + Auth + Storage + RLS. Local: `supabase start`. Hosted project id in `supabase/config.toml`: `sgewxijthmdguvuvvapw` | Prior experimental Supabase projects |
| Schema history | Ordered files in `supabase/migrations/` on this repo only | Conflicting `20260816140000_*` files on Stripe experiment branches |
| App runtime | TanStack Start + Vite, bun lockfile, Nitro/Cloudflare `.output` | Abandoned adapters |
| Deployment | Lovable-connected `main` → Cloudflare (Nitro). Domains: `boliviq.com`, `www.boliviq.com` | Preview apps such as `*.lovable.app` |
| Env strategy | `.env.example` names. Server secrets never `VITE_`. Local `.env.local` (gitignored) points at local Supabase | Ad-hoc shell exports |
| Billing | **This repo’s** `embedded_page_v4` line: `src/lib/billing.functions.ts`, `src/lib/stripe.server.ts`, `src/routes/api/public/payments/webhook.ts`, `src/lib/checkout-config.ts`, `src/lib/plans.ts` | `cursor/fix-stripe-supabase-integration-{1dca,58bf,6790,39d2}` — do not merge |

## Billing architecture (decided during engine work)

The four historical Stripe branches each rewrite the same files and stamp different `20260816140000_*` migrations. Merging more than one collides.

**Decision:** keep the billing code already on this repository (`BILLING_IMPLEMENTATION_VERSION = embedded_page_v4`). Treat the four branches as design notes. If a specific hardening (webhook idempotency, entitlement RLS) is still missing, re-implement it as an additive patch on this line. Do not cherry-merge those branches.

**Not decided by the owner yet (Gate 9):** Stripe test/live keys and webhook secrets. Architecture does not wait on those credentials.

Canon 8 recommended groups (`SUBSCRIPTION_GROUPS` in `src/lib/canons.ts`) are the product grouping. `src/lib/plans.ts` is the sellable Stripe catalog currently wired to checkout. `PLAN_TO_CANON_GROUP` maps one onto the other. Do not maintain a third price list.

## Persistence rule

Canon workspace records persist through RLS-scoped server functions. `src/lib/workspace-store.ts` is types/helpers only.

## Pages

Existing `src/routes/**` files are unfinished Lovable shells unless a workflow has already passed Gates 1–7. Gate 8 (production UI) is last.
