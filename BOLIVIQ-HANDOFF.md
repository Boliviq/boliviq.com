# Boliviq technical handoff — July 15, 2026

## Completed in this repair pass

- Regenerated `package-lock.json` so `npm ci` works from a clean environment.
- Added a standard Vitest test runner; the checkout configuration tests no longer require Bun.
- Added `npm run typecheck` and `npm run test:watch` scripts.
- Migrated deprecated TanStack server-function `.inputValidator()` calls to `.validator()`.
- Added `.env.example` and updated `.gitignore` so local secret files are not committed.
- Added direct Stripe API support using normal Stripe keys.
- Kept the existing Lovable Stripe connector as a backwards-compatible fallback.
- Added direct Stripe publishable-key selection for sandbox and live builds.
- Added direct webhook secret support with backwards-compatible legacy variable aliases.

Independent Stripe keys (`STRIPE_SECRET_KEY_TEST` / `STRIPE_SECRET_KEY_LIVE`) are preferred.
If you instead set `STRIPE_SANDBOX_API_KEY` / `STRIPE_LIVE_API_KEY` to real `sk_test_` / `sk_live_` values, those are also used as direct Stripe secrets. Non-`sk_` values in those names are treated as Lovable connection keys and still require `LOVABLE_API_KEY`.

## Verified locally

- `npm ci` — passes
- `npm run test` — 3/3 checkout tests pass
- `npm run typecheck` — passes
- `npm run build` — passes and creates a Nitro/Cloudflare-compatible `.output`

## Environment variables for independent deployment

Client/public variables:

- `VITE_STRIPE_MODE=sandbox` or `live`
- `VITE_STRIPE_PUBLISHABLE_KEY_TEST=pk_test_...`
- `VITE_STRIPE_PUBLISHABLE_KEY_LIVE=pk_live_...`
- Supabase variables listed in `.env.example`

Server-only variables:

- `STRIPE_SECRET_KEY_TEST=sk_test_...`
- `STRIPE_SECRET_KEY_LIVE=sk_live_...`
- `STRIPE_WEBHOOK_SECRET_TEST=whsec_...`
- `STRIPE_WEBHOOK_SECRET_LIVE=whsec_...`

Legacy aliases (still accepted): `STRIPE_SANDBOX_API_KEY`, `STRIPE_LIVE_API_KEY`, `PAYMENTS_SANDBOX_WEBHOOK_SECRET`, `PAYMENTS_LIVE_WEBHOOK_SECRET`.

Never prefix a Stripe secret key or webhook secret with `VITE_`.

## Remaining live verification

A real live-mode payment still requires deployment with the actual Stripe and Supabase environment variables. After deployment, verify:

1. Open `/admin/checkout-verification` as an admin.
2. Confirm the live lookup keys exist and are active in Stripe.
3. Start a live embedded checkout and verify the card-entry form appears.
4. Complete one real payment.
5. Confirm the webhook reaches `/api/public/payments/webhook?env=live`.
6. Confirm the subscription and entitlement record updates in Supabase.
7. Open the Stripe Customer Portal and test cancellation at period end.

## Known non-blocking cleanup

- The full ESLint command reports thousands of Prettier-only formatting findings inherited from the source export. These are not production build failures.
- Vite reports that `vite-tsconfig-paths` is redundant in Vite 8, but the plugin is currently supplied by the Lovable config package. Removing that package should be handled as a separate deployment-adapter change.
