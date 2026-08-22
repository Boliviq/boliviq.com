# Boliviq Build Plan — Now → Launch

A phased build plan to take Boliviq from its current state to a complete, launch-ready platform that satisfies the 19 canons (`docs/canons/boliviq-canons-combined.md`).

The plan is organized into **phases** (dependency-ordered slices of scope), each ending in a **break** (a hard checkpoint: stop, run the full test gate, review against the canon exit criteria, and make a go/no-go decision before starting the next phase). Effort is described by scope, invasiveness, and risk — not calendar time.

---

## Current state (grounded in the code on `main`)

The full-platform DB schema already exists (`supabase/migrations/20260821040000_canon_platform.sql`: `workspaces`, `marketplace_listings`, `conversations`/`messages`, `professional_profiles`, `verification_records`, `projects`, `documents`, `credit_wallets`/`credit_ledger`, `admin_audit_logs`, plus RLS). Routes exist for nearly every canon area. The decisive gap is **how features are backed**:

| Area | Backing today | Canon-ready? |
| --- | --- | --- |
| Investor CRM: `leads`, `contacts`, `pipeline`, `tasks`, `deal-analyzer`, `calculators`, `calls`, `reports`, `settings`, `properties`, `promotions`, `automations` | Real Supabase serverFns | Mostly — needs unification + depth |
| Billing/Stripe (`billing`, webhook, coupons, entitlements) | Real Supabase + Stripe | Close — needs full lifecycle + credits |
| Marketplace, Messages, Projects, Documents, Professionals, Verification, Assistant, Dashboard | `src/lib/workspace-store.ts` = browser `localStorage` seeded with static data | No — prototype only |
| `properties.tsx` | Explicit `ComingSoon` placeholder | No |

Core arc: **move the canon platform features off `localStorage` onto the real Supabase tables (persisted, multi-user, RLS-secured, real-time), deepen each canon and integration, then harden and launch.**

## Baseline test gate (measured on this run)

| Check | Command | Result |
| --- | --- | --- |
| Typecheck | `npm run typecheck` | Pass |
| Unit tests | `npm run test` | 15/15 pass (3 suites: `canons`, `checkout-config`, `workspace-store`) |
| Build | `npm run build` | Pass (Nitro/Cloudflare `.output`) |
| Dev server | `npm run dev` | Boots on `:8080`, serves real content |
| Lint | `npm run lint` | 3961 findings: 3830 auto-fixable Prettier + 133 real (117 `@typescript-eslint/no-explicit-any`, 6 `react-refresh/only-export-components`, 5 `react-hooks/exhaustive-deps`, 1 `react-hooks/rules-of-hooks`, 1 `no-img-element`) |

Package manager is `bun` (native to this Lovable repo). See `AGENTS.md` for run notes.

## How to read the checklist

- `[ ]` unchecked = not started, `[x]` = done.
- Each phase lists **Scope**, a **Test gate**, and a **Break** (exit criteria).
- Do not cross a break until its test gate is green and the break criteria are met.

---

## Phase 0 — Trunk consolidation & environment baseline

- [x] Consolidate branches into the trunk (see note below)
- [x] Stand up local Supabase, apply all migrations from empty DB
- [x] Add CI: typecheck + lint + `vitest` + build on every PR (`.github/workflows/ci.yml`)
- [x] Establish Prettier auto-format (pre-commit via husky + lint-staged, `lint:fix`) so formatting stops dominating lint
- [x] Triage lint findings; fix blocking errors (`rules-of-hooks` false positive, stray `no-img-element`, empty `catch`); demote `no-explicit-any` to warn
- [x] Fix `canon_platform` migration bugs found by the empty-DB apply (see below)
- [ ] Wire production secrets (Supabase URL/keys, Stripe test keys/webhook) — user action

**Branch consolidation outcome:**
- Merged `cursor/fix-canon-conflicts-c593` (canon connection fixes + a test) into the trunk. The lockfile fix (PR #1) is already included.
- Skipped `cursor/canon-platform-foundation-06fa`: its canon content is already in `main` (PR #2); its remaining commits only extend the `localStorage` `workspace-store`, which Phase 1 is replacing.
- Did **not** merge the four `cursor/fix-stripe-supabase-integration*` branches (`1dca`, `58bf`, `6790`, `39d2`): they are **mutually-exclusive parallel attempts** at the same work — each ships a different migration stamped `20260816140000` (`fix_has_role_and_subscription_rls` vs `lock_subscription_writes` vs `fix_entitlements_and_admin_rpc`) and each rewrites the same `billing.functions.ts`/`stripe.server.ts`/`webhook.ts`. Merging more than one collides. Choosing the canonical Stripe line is a product decision (e.g. `1dca`'s admin-editable pricing vs `6790`'s entitlements + workspace-data wiring) and is tracked for a dedicated integration pass, not a blind merge.

**Migration bugs fixed during Phase 0 (surfaced by `supabase start` on an empty DB):**
1. `documents` was re-`CREATE TABLE`d though the initial CRM migration already creates it → changed to `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`.
2. `admin_audit_logs` RLS called `has_role('admin', auth.uid())` (wrong arg order) → fixed to `has_role(auth.uid(), 'admin')` matching the function signature.

**Test gate:** typecheck, lint (0 errors), and unit tests green; all migrations apply cleanly from empty DB; dev server boots; auth + RLS smoke.
**Break 1:** single trunk builds, migrations apply clean, CI green. _Status: lint/typecheck/test/build green; migrations verified from empty DB; branch merge + CI-on-remote remain._

## Phase 1 — Data foundation: canon features off `localStorage` onto Supabase

_In progress. Foundation + first modules landed; remaining modules follow the same pattern._

- [x] Regenerate `types.ts` from the canon schema so canon tables are typed
- [x] Establish the reusable pattern: RLS-scoped serverFns (`src/lib/workspace.functions.ts`) + react-query hooks (`src/hooks/use-workspace-data.ts`)
- [x] `documents` — Supabase-backed (list/create), route + dashboard count migrated
- [x] `projects` — Supabase-backed (list/create), route + dashboard count migrated
- [x] `marketplace_listings` — Supabase-backed (list/create/save/report); added `saved_listings` + `listing_reports` tables (RLS); extra fields in `details` JSONB; convert-to-project uses the Supabase project mutation
- [x] Integration tests: CRUD + cross-user RLS isolation + spoofed-owner rejection + public-read + saved isolation + report visibility (gated for CI)
- [ ] `conversations`/`messages` (assemble threads; later Supabase Realtime in Phase 4)
- [ ] `professional_profiles`, `verification_records`
- [ ] `credit_wallets`/`credit_ledger`; `workspaces`/`workspace_members`
- [ ] Account/onboarding draft → `profiles`; assistant log (needs a table)
- [ ] Convert seeds (`marketplace-seed`, `professional-seed`, `platform-seed`) to admin-only demo seeding
- [ ] Remove `workspace-store.ts` once all modules are migrated

**Test gate:** integration tests per module (CRUD + cross-workspace isolation), migration/RLS tests, Phase 0 regression.
**Break 2:** canon features persist across sessions/devices; workspace isolation enforced by RLS. _Status: proven for documents + projects (UI reload + DB rows + RLS tests); remaining modules pending._

## Phase 2 — Identity, onboarding & access control (Canons 1, 2)

- [ ] Save-and-resume onboarding wizard; primary + secondary role selection; workspace create/join
- [ ] Email + phone verification, optional MFA, password reset, session/device history
- [ ] Brute-force + bot/spam protection (CAPTCHA)
- [ ] RBAC + server-side entitlement gating; account suspension + appeal

**Test gate:** e2e signup → verify → MFA → onboarding → gated dashboard; RLS + entitlement authorization tests; suspension/appeal path.
**Break 3:** a new user registers, picks a role, onboards, and lands in a correctly gated dashboard.

## Phase 3 — Marketplace & Search (Canon 3)

- [ ] Listing CRUD with media upload (cloud storage + signed URLs), categories/subcategories, visibility, expiration, reporting, view/response analytics
- [ ] Search + filters, map + list views, favorites, saved searches, alerts
- [ ] "Create lead from listing" conversion

**Test gate:** listing lifecycle e2e, search/filter correctness, storage signed-URL access control, moderation hooks.
**Break 4:** create → discover → message → convert-to-lead loop works end to end.

## Phase 4 — Communication Center (Canon 4)

- [ ] Real-time messaging (Supabase Realtime); direct/group/property/project threads
- [ ] File sharing, read status, conversation search
- [ ] Email/SMS notifications with consent, opt-out, and quiet hours; blocking/spam reporting
- [ ] Call/video scheduling links

**Test gate:** realtime delivery tests, consent/opt-out + quiet-hours enforcement, notification-provider integration tests.
**Break 5:** two users converse in real time with notifications and consent honored.

## Phase 5 — CRM & Pipeline unification (Canon 5)

- [ ] Unify investor CRM with canon CRM (leads/contacts/companies/opportunities/tasks/notes/appointments/documents)
- [ ] 12 pipeline stages, assignment rules, duplicate detection, reminders, reporting
- [ ] CSV import/export
- [ ] Connected-ecosystem conversions: listing → lead → project → transaction

**Test gate:** pipeline transition tests, dedupe, import/export round-trip, cross-object conversion tests.
**Break 6:** an object's lifecycle connects across modules per the connectivity rule.

## Phase 6 — Trust & Verification (Canon 6)

- [ ] Verification tiers + badges (identity/license/insurance/certified/unverified)
- [ ] Request → admin-review → badge workflow
- [ ] Response time, reviews, complaint status display; "no guarantee" disclaimers

**Test gate:** verification request→review→badge e2e, badge disclaimer rules, admin audit logging.
**Break 7:** professional requests verification, admin approves, badge renders with correct disclaimers.

## Phase 7 — Subscriptions, Billing & AI Credit System (Canons 7 credits, 8)

- [ ] Admin-editable plan catalog; upgrades/downgrades/proration, trials, coupons
- [ ] Failed-payment recovery + grace periods, billing portal, invoices/receipts, tax
- [ ] Credit wallet: reserve → charge → release/refund, immutable idempotent ledger, low-balance alerts, credit packs
- [ ] Server-side entitlement enforcement (no hidden-button-only access)

**Test gate:** full billing lifecycle against Stripe test mode (webhook-driven entitlements), credit-ledger idempotency/reservation tests, entitlement enforcement tests.
**Break 8:** paid entitlements + credits gate features server-side; billing lifecycle verified.

## Phase 8 — AI Features (Canon 7)

- [ ] Boliviq assistant grounded in role/permissions/workspace/documents
- [ ] Specialized agents (lead qualification, property analysis, estimating, matching, follow-up, monitoring, compliance, support, docs, BI)
- [ ] Hard permission guardrails (no unauthorized send/sign/pay/publish/delete)
- [ ] Credit metering per operation + audit trail

**Test gate:** permission-boundary tests (agents cannot exceed scope), credit reservation-on-AI-op tests, grounding/eval checks.
**Break 9:** assistant performs only authorized actions and meters credits correctly.

## Phase 9 — Role/profile depth (Canons 12–19)

- [ ] Homeowner; contractor/trade; realtor/broker; investor/wholesaler; lender; property manager; transaction-support (inspector/appraiser/title/insurance/attorney); design/supply
- [ ] Role dashboards/widgets/shortcuts (defined in `src/lib/canons.ts`)
- [ ] Compliance notices (state wholesaling, lending/appraisal/legal disclaimers)

**Test gate:** per-role smoke, connection-matrix tests (role A ↔ role B per canon), compliance-notice presence tests.
**Break 10:** each role has a functional, compliant profile + workspace.

## Phase 10 — External Integrations (Canon 9)

- [ ] Modular, flag-gated integration layer with graceful degradation
- [ ] Email, SMS/voice, maps/geocoding, calendar, cloud storage, e-signature, MLS/IDX (realtor-gated), property-data/comps, accounting export, video, AI providers, CAPTCHA, analytics, error monitoring, translation
- [ ] Per integration: consent, retry rules, credential security, documented replacement strategy

**Test gate:** fault-injection (provider down → app still works), data-minimization/consent checks, per-integration contract tests.
**Break 11:** core integrations live; disabling any optional provider degrades gracefully.

## Phase 11 — Administrative Intelligence Center (Canon 10)

- [ ] User/workspace management, verification + license/insurance review, subscription/credit management
- [ ] Marketplace moderation + reported content, disputes, AI controls + cost config
- [ ] Integration health, security alerts, audit logs, feature flags, coupons/referrals
- [ ] Revenue/usage reporting, support tickets, templates, i18n management, data export/deletion

**Test gate:** audit completeness (admin identity, timestamp, before/after, reason), permission tests, moderation-flow e2e.
**Break 12:** admins can operate the platform with fully audited actions.

## Phase 12 — Mobile, PWA & accessibility (Canon 11)

- [ ] Installable PWA (offline draft saving, push, saved login)
- [ ] Responsive nav, camera/document capture, deep links
- [ ] Major US languages (i18n), WCAG accessibility
- [ ] Apple/Google packaging + payment-rule review

**Test gate:** Lighthouse PWA + a11y, offline-draft e2e, push delivery, cross-device.
**Break 13:** installable PWA passes PWA/a11y audits; app-store readiness reviewed.

## Phase 13 — Hardening, security, compliance & launch

- [ ] Security review (RLS coverage, signed URLs, anti-wire-fraud on title/closing, abuse/bot protection, encryption in transit + at rest)
- [ ] Performance/load testing; error monitoring + alerting; backups/DR
- [ ] Legal/compliance disclaimers; privacy data export/deletion
- [ ] Full regression + UAT

**Test gate:** full regression, security/authorization review, abuse-case tests, load test, DR restore drill, UAT sign-off.
**Break 14 (launch gate):** go/no-go with every exit criterion met. Post-launch: monitoring, incident runbooks, iteration backlog.

---

## Cross-cutting test strategy (applies every phase)

- Layers: unit (`vitest`), integration (Supabase test DB + RLS), e2e (Playwright against the dev server), Stripe/webhook contract tests, migration tests, accessibility, performance, and security/authorization.
- CI gates: typecheck + lint + unit on every PR; integration + e2e on merge to trunk; each break additionally requires a green full suite plus a manual smoke sign-off against that phase's canon exit criteria.
- Near-term investment: add Playwright and a Supabase-backed integration harness in Phase 0/1 so every later phase has an e2e safety net.

## Sequencing notes & risks

- Phase 1 is the linchpin and the riskiest edit (removing `workspace-store` in favor of RLS-secured Supabase access). Do it before building further on the mock store.
- Phases 3–6 depend on Phases 1–2; Phase 8 (AI) depends on Phase 7 (credits) for metering; Phases 10–11 can partly parallelize once the data foundation is stable.
- Compliance items (wholesaling, lending, appraisal, legal, app-store payments) recur as gates across Phases 8–13 rather than a single phase.
