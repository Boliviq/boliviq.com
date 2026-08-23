# Launch readiness

Living Gate 1–10 status for Boliviq. Sequencing: canons first, then this file, then `docs/completion-plan.md` (engine layers), then `docs/build-plan.md` (backlog). Architecture: `docs/canonical-architecture.md`.

Status labels:

- **VERIFIED** — implemented and tested in this repo
- **IMPLEMENTED — EXTERNAL VERIFICATION REQUIRED** — code present; live provider/domain not proven
- **PARTIAL** — real code, gates incomplete
- **NOT STARTED** — no meaningful engine yet
- **BLOCKED — HUMAN ACTION REQUIRED** — cannot verify further without the owner

Temporary Lovable screens are not Gate 8.

| System | Canon | Law | Data | Access | Workflow | Integration | E2E | Observe | UI | Live Verify | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Canon catalog | 1–19 | VERIFIED | n/a | n/a | n/a | n/a | unit | n/a | n/a | n/a | VERIFIED |
| Identity / auth / onboarding | 2 | VERIFIED | VERIFIED | PARTIAL | PARTIAL | PARTIAL (CAPTCHA off) | PARTIAL | PARTIAL | shell | IMPLEMENTED — EXTERNAL | PARTIAL |
| Workspaces / RBAC | 1 | VERIFIED | VERIFIED | VERIFIED | PARTIAL | n/a | PARTIAL | PARTIAL | shell | n/a | PARTIAL |
| Marketplace | 3 | VERIFIED | VERIFIED | VERIFIED | PARTIAL (listing→lead) | maps off | PARTIAL | PARTIAL | shell | n/a | PARTIAL |
| Communication | 4 | VERIFIED | PARTIAL | PARTIAL | PARTIAL | email/SMS off | PARTIAL | NOT STARTED | shell | n/a | PARTIAL |
| CRM + property hub | 5 | PARTIAL | PARTIAL | PARTIAL | NOT STARTED (unify + conversions) | n/a | NOT STARTED | NOT STARTED | shell / Coming Soon | n/a | PARTIAL |
| Trust / verification | 6 | VERIFIED | PARTIAL | PARTIAL | NOT STARTED (admin review) | identity_verification off | NOT STARTED | PARTIAL | shell | n/a | PARTIAL |
| AI assistant / agents | 7 | VERIFIED | PARTIAL | PARTIAL | NOT STARTED | AI provider off | NOT STARTED | PARTIAL (logs) | shell | n/a | PARTIAL |
| Credits wallet | 7 | VERIFIED | PARTIAL | PARTIAL | NOT STARTED (reserve/charge) | n/a | NOT STARTED | NOT STARTED | shell | n/a | PARTIAL |
| Billing / Stripe | 8 | PARTIAL (plan map) | PARTIAL | PARTIAL | PARTIAL | architecture chosen; keys later | NOT STARTED | PARTIAL | shell | BLOCKED — HUMAN (keys) | PARTIAL |
| Integrations catalog | 9 | VERIFIED | NOT STARTED (flags) | n/a | NOT STARTED | adapters not started | NOT STARTED | NOT STARTED | shell | BLOCKED — HUMAN (providers) | PARTIAL |
| Admin Intelligence | 10 | PARTIAL | PARTIAL | PARTIAL | NOT STARTED | n/a | NOT STARTED | PARTIAL (audit table) | shell | n/a | PARTIAL |
| PWA / a11y / i18n | 11 | PARTIAL | NOT STARTED | n/a | NOT STARTED | translation off | NOT STARTED | NOT STARTED | NOT STARTED | n/a | NOT STARTED |
| Role engines 12–19 | 12–19 | PARTIAL (widgets) | NOT STARTED | NOT STARTED | NOT STARTED | role providers off | NOT STARTED | NOT STARTED | NOT STARTED | n/a | NOT STARTED |
| Hardening / launch | 1–19 | n/a | PARTIAL (fresh migrate yes; upgrade test new) | PARTIAL | n/a | n/a | NOT STARTED | NOT STARTED | n/a | BLOCKED — HUMAN (legal/UAT) | PARTIAL |

## Already proven (do not rebuild)

- Fresh `supabase db reset` applies every migration on this branch
- RLS isolation tests in `tests/workspace-data.integration.test.ts` when local Supabase env is set
- Canon catalog tests in `tests/canons.test.ts` (19 canons, signup excludes admin, widget IDs, credit-pack ownership, 23 integrations)
- Marketplace listing → CRM lead
- Signup creates personal workspace + empty wallet
- CI: typecheck, lint, unit, build (`.github/workflows/ci.yml`)

## Gaps this file is tracking next

1. Communication remaining: Realtime delivery, file attachments, outbound email/SMS intents
2. CRM + property hub conversions
3. Trust admin-review → badge
4. Credit reserve/charge idempotency on the chosen billing line
5. Provider adapters (flag-gated, mocked)
6. Upgrade-from-older-schema automation (fresh install is already proven)
7. Gate 8 pages — last
