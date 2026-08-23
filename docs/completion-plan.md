# Boliviq Completion Plan — Engine First, Pages Last

This is the plan to finish Boliviq against all **19 canons** in `docs/canons/boliviq-canons-combined.md`.

The old phase list in `docs/build-plan.md` is still useful as a checklist of remaining product work. **This document is the engine-layer sequencing guide.** Gate status lives in `docs/launch-readiness.md`. The production path lives in `docs/canonical-architecture.md`. Finished pages are not available yet. We will not wait on design, and we will not polish throwaway screens in the middle of the build.

### How the 10 gates map to pages-last

The owner prompt’s Gates 1–10 and the L0–L8 layers are the same sequence. Pages stay last.

| Gate | Layer | Meaning |
| --- | --- | --- |
| 1 Law | L0 | Canon as typed code |
| 2 Data | L1 | Schema, RLS, storage, fresh **and** upgrade migrate |
| 3 Access | L2 | Server + RLS; hidden buttons are not security |
| 4 Workflow | L3 | State machines without finished pages |
| 5 Integration contracts | L4 | Flag-gated adapters; mocks until credentials |
| 6 E2E | L3/L6 scripts | Journeys across API/DB (Playwright only after Gate 8 starts) |
| 7 Observe & protect | L5/L7 | Audit, ceilings, rate limits, reconciliation |
| 8 Production UI | L8 | Insert finished pages last |
| 9 Live integration | after L7 | Owner secrets via platform fields, not frontend forms |
| 10 Launch | L7 + human | Security, backup, legal/UAT |

Temporary diagnostic screens are allowed to prove Gates 1–7. They are not Gate 8.

**Alterations kept:** pending review is not a badge; Administrator is not a signup role; connections use real role IDs; widget IDs do not collide; Canon 9 is the only integration catalog; Canon 7 ledger vs Canon 8 credit-pack sales.

**Billing alteration:** architecture is decided now (keep `embedded_page_v4` on this repo). The owner is not asked to pick among four historical Stripe branches. Credentials remain a later Gate 9 form.

Effort is described by scope, invasiveness, and risk — not calendar time.

---

## What you click (non-coder)

You do not need pages, terminals, or code reviews to keep this moving.

| When | What you do | Why |
| --- | --- | --- |
| Now (optional) | One-click merge of the current working PR when you want this work on the connected Lovable branch | Saves the engine already built (data, identity, marketplace loop) |
| Later, labeled form | Production database URL + keys | Required only when we turn on a real hosted environment |
| Later, labeled form | Stripe test key + webhook | Architecture is already this repo’s `embedded_page_v4`. Keys are Gate 9 only |
| Later | Provider accounts (email, SMS, maps, e-sign, CAPTCHA) | Required only for live outbound integrations |
| Last | Legal / UAT sign-off | Launch gate, after the engine and then the pages |

Until those later buttons appear, you do not need to do anything. Pages stay last.

---

## The one sequencing rule

A finished page is inserted only after all of the following already pass **without that page**:

1. **Law** — the canon rule exists as typed code (`src/lib/canons.ts` and related catalogs).
2. **Data** — tables, columns, RLS, storage buckets, and migrations exist and apply from an empty database.
3. **Access** — server functions authorize the caller. Hidden buttons are not security.
4. **Workflow** — the state machine is tested at the database / API: create, transition, convert, fail, isolate, audit.
5. **Integrations** — optional providers are flag-gated. The app still works when they are off.

If a flow cannot be proven with a script or integration test, it is not ready for a page.

### Honest fact about the repo

Many route files already exist under `src/routes/` (Lovable shells: marketplace, messages, CRM, billing, marketing pages, admin). **Treat those as unfinished skins, not finished pages.**

- Do not spend engine layers “making the current screens look done.”
- Do not block engine work because a route file is missing or ugly.
- When finished pages arrive, they replace or wrap these shells.
- A page is “inserted” only when it is wired to the already-proven engine.

`src/routes/_authenticated/properties.tsx` still has explicit Coming Soon tabs. That is a skin problem. The property **engine** is what we finish first.

---

## What Boliviq is when complete

One operating system for the real-estate lifecycle (Canon 1):

> Find an opportunity → Connect with people → Analyze the property → Finance and close → Repair or construct → Sell, rent, or manage → (loop)

Key system rule:

> Every property, person, lead, project, document, conversation, estimate, transaction, and AI action should be connected — without exposing information to anyone who does not have permission to see it.

Completion means all 19 canons are real in the engine, then the finished pages are dropped on last.

| Canons | Domain |
| --- | --- |
| 1–11 | Platform: accounts, auth, marketplace, communication, CRM, trust, AI, billing, integrations, admin, mobile/PWA |
| 12–19 | Profiles: homeowner, contractor/trade, realtor, investor/wholesaler, lender, property manager, transaction-support, design/supply |

---

## Current engine (already built)

Do not rebuild these. Later layers extend them.

| Engine | Status | Proof |
| --- | --- | --- |
| Canon catalog | 19 canons in `src/lib/canons.ts` + combined spec | `tests/canons.test.ts` |
| Local database + RLS foundation | Canon platform schema + later migrations | `supabase db reset` from empty DB |
| Documents, projects, marketplace, conversations, professionals, verification requests, credits, account drafts, assistant logs | Persist in Supabase via RLS-scoped server functions | `tests/workspace-data.integration.test.ts` |
| Identity | Signup creates personal workspace + wallet; onboarding drafts; workspace create/switch/invite; MFA; sessions; suspend → `/suspended` | Phase 2 functions + hooks |
| Marketplace loop | Search/filters, media bucket, views, saved searches, listing → CRM lead | Phase 3 functions + hooks |
| Investor CRM shells | Leads, contacts, pipeline, tasks, etc. already talk to Supabase | Needs unification with canon CRM (Layer 3) |
| Billing / Stripe | Partial real Stripe + entitlements | Needs one chosen Stripe line + full lifecycle (Layer 3) |
| CI | Typecheck, lint, unit tests, build | `.github/workflows/ci.yml` |

`src/lib/workspace-store.ts` is types/helpers only. Persistence is `src/lib/workspace.functions.ts`, `src/lib/identity.functions.ts`, `src/lib/marketplace.functions.ts`.

---

## Layer map (do these in order)

```
L0  Law          canon types, stages, entitlements, forbidden actions
L1  Data         schema, RLS, storage, migrations
L2  Access       server functions + authorization (no new pages)
L3  Workflows    state machines proven at API
L4  Integrations flag-gated providers, graceful degradation
L5  Operations   admin APIs + complete audit
L6  Platform     PWA/i18n/a11y as config and APIs first
L7  Hardening    security, backups, legal text as data, API UAT
L8  Pages LAST   insert / replace finished screens
```

L0–L2 can proceed for several domains in parallel **as long as each domain still follows Law → Data → Access before its Workflow**. Do not start a domain’s workflow tests until its tables and server functions exist. Do not start L8 for any screen until that screen’s workflows pass.

Existing route files may call new server functions during L2–L3 so we can prove a loop. That is **temporary wiring**, not page insertion.

---

## L0 — Law (canon as code)

**Goal:** every product rule a page will later display already exists as typed constants and helpers.

**Invasiveness:** low. Mostly `src/lib/canons.ts` and small helper modules.

**Do**

- Keep `PROFILE_ROLES`, widgets, shortcuts, and connection matrix as the role catalog.
- Keep `MARKETPLACE_CATEGORIES` aligned with Canon 3’s category list.
- Keep `CRM_PIPELINE_STAGES` as the 12 canon stages; map any leftover investor-CRM statuses through `LEGACY_STATUS_TO_PIPELINE`.
- Keep `AI_FORBIDDEN_ACTIONS` as the hard list agents cannot do.
- Add missing catalogs as code, not as page copy:
  - verification badges (unverified + stackable identity / license / insurance / certified) vs request states (not started / pending review / rejected / granted)
  - Canon 7 wallet operations (reserve, charge, release, refund, admin adjust) vs Canon 8 purchases (pack, subscription deposit)
  - notification consent + quiet-hours rules
  - entitlement keys (team seats, AI access, credits, marketplace, CRM, storage, automations)
  - conversion graph: listing → lead → project → transaction / property record
  - role-compliance notice keys (wholesaling by state, lending, appraisal, legal, wire-fraud)
- Add tests that fail if a catalog drifts from the combined canon document.

**Do not** design dashboards here. Widgets in `canons.ts` are a contract for L8, not a UI build ticket.

**Exit:** catalog tests pass; a later page can import rules instead of inventing them.

---

## L1 — Data (schema, RLS, storage)

**Goal:** every record a finished page will show already has a table, permissions, and indexes.

**Invasiveness:** medium. New migrations. After each schema change: reset or migrate local DB, regenerate `src/integrations/supabase/types.ts`, format it.

**Hard RLS rules already learned (do not reintroduce)**

1. Do not add `conversation_participants` SELECT policies that query the same table.
2. Workspace member/owner policies must use `SECURITY DEFINER` helpers, not cross-table `EXISTS` that re-enter RLS.
3. Conversation `INSERT … RETURNING` needs a direct `created_by = auth.uid()` SELECT policy; a helper cannot see the new row yet.

### L1 remaining tables / columns (engine, not pages)

| Domain | Data still needed |
| --- | --- |
| Communication (Canon 4) | Message attachments; read receipts; thread types (direct / group / property / project); blocks; spam reports; notification_preferences (email/SMS consent, quiet hours, opt-out) |
| CRM (Canon 5) | Unify investor CRM with canon objects: companies, opportunities, notes, appointments, assignment rules, duplicate keys; `leads` already has `listing_id` |
| Properties | Property record as the hub object: units, owners, strategy, linked listings/leads/projects/documents; kill the need for Coming Soon by giving those tabs real tables |
| Trust (Canon 6) | Admin review queue fields on `verification_records`; badge grants; complaint status; response-time aggregates |
| Billing / credits (Canons 7–8) | Reservation rows or ledger states for reserve → charge → release; plan catalog if not already admin-editable; grace / dunning fields |
| AI (Canon 7) | Agent run records; tool-call audit; credit reservation link; grounding snapshot (which workspace records were in scope) |
| Roles (Canons 12–19) | Role-specific records that pages will later bind: buy-box, bids/estimates, showings, loan conditions, work orders, inspection reports, title milestones, supplier quotes — stored as data, not as screens |
| Admin (Canon 10) | Feature flags, support tickets, dispute cases, integration health, i18n strings table if needed; audit log already exists and must stay complete |
| Platform (Canon 11) | Offline draft store (server or sync table); push subscription records |

**Storage buckets (private unless a canon says public)**

- `marketplace-media` — already public-read / auth-write
- private document bucket with **signed URLs only**
- verification document bucket (admin + owner only)
- message attachments (participants only)

**Exit:** `supabase db reset` applies every migration from empty; regenerated types compile; RLS isolation tests exist for each new table.

---

## L2 — Access (server functions, no new pages)

**Goal:** every write a finished page will submit already has an authorized server function.

**Invasiveness:** medium. Follow the existing pattern:

- `createServerFn` + `requireSupabaseAuth`
- client JWT via `attachSupabaseAuth` in `src/start.ts`
- react-query hooks for later pages to subscribe to

Add functions next to the current modules (`workspace`, `identity`, `marketplace`). New files are fine (`crm.functions.ts`, `billing.functions.ts`, `trust.functions.ts`, `ai.functions.ts`, `admin.functions.ts`) as long as they share the same auth helper.

**Rules**

- Entitlements are checked on the server (Canon 8).
- AI functions refuse `AI_FORBIDDEN_ACTIONS` even if a future page asks.
- Admin functions write `admin_audit_logs` with identity, timestamp, record, before, after, reason.
- No function trusts a client-supplied `owner_id` / `workspace_id` without membership proof.

**Do not** build role dashboards here. Hooks are enough for temporary shells and for L8.

**Exit:** each function has a test: happy path, cross-workspace reject, spoofed owner reject, entitlement deny.

---

## L3 — Workflows (prove the product without finished pages)

**Goal:** the connected lifecycle works as API tests and scripts. This is the largest remaining engine layer.

Each workflow below is **done** when a test or script can run the loop and assert database results. Screens are not the proof.

### W1 — Communication protocol (Canon 4)

- Thread types: direct, group, property-linked, project-linked.
- Send / receive / search; file share; read status; block; report.
- Realtime via Supabase Realtime (two clients, no page required — can be two server sessions or a small harness).
- Notification **intent** records created with consent + quiet-hours checks. Actual email/SMS send waits for L4.
- Call/video: store a scheduling link field only; provider join is L4.

**Break:** two users converse in real time; a quiet-hours user does not get an outbound intent.

### W2 — CRM + property hub (Canon 5 + connectivity rule)

- One pipeline: the 12 canon stages. Transition tests for legal vs illegal jumps if we define them.
- Assignment, reminders, duplicate detection, CSV import/export round-trip.
- **Connectivity conversions** (the product):
  1. listing → lead (already exists)
  2. lead → project
  3. lead / listing → property record
  4. project → transaction / completed property state
  5. completed renovation → new listing or rental-management record
- Property record becomes the hub: documents, conversations, estimates, and tasks hang off it.

**Break:** a script can walk listing → lead → project → property without a browser.

### W3 — Trust review (Canon 6)

- Professional submits verification request + documents (request path exists).
- Admin review function grants/denies stackable badges.
- Unverified shows only when no stackable badge exists.
- Disclaimer flag stored with every badge: Boliviq does not guarantee services.

**Break:** request → review → badge grant is proven in tests; no page required.

### W4 — Billing + credits (Canons 7 credits, 8)

- **Architecture decided:** keep `embedded_page_v4` on this repo. Do not merge the four old Stripe branches. Credentials are Gate 9.
- Plan catalog admin-editable; checkout; portal; proration; trials; coupons; failed-payment + grace; invoices; tax hook.
- Credit wallet: reserve → charge → release/refund; immutable idempotent ledger; low-balance event; packs; subscription deposits; admin adjust.
- Server entitlement enforcement on gated functions.

**Break:** Stripe test-mode webhook updates entitlements; a reserved credit cannot be double-spent.

### W5 — AI guardrails (Canon 7)

Depends on W4 for metering.

- Assistant grounded in role, permissions, workspace, and authorized documents only.
- Specialized agents as **server tools** (qualify lead, analyze property, estimate, match, follow up, monitor, compliance, support, docs, BI).
- Every tool call: permission check → credit reserve → execute → charge or release → audit row.
- Forbidden: send/sign/pay/publish/delete, lending decisions, licensed legal or appraisal conclusions.

**Break:** tests prove an agent cannot send a message, move money, or emit an “appraisal” label; credits meter.

### W6 — Role engines (Canons 12–19), still no dashboards

Build the **records and conversions** each role needs. Pages in L8 only bind widgets to these.

| Canon | Engine to finish before any role page |
| --- | --- |
| 12 Homeowner | Property post converts to public listing, private opportunity, repair request, bid request, cash-offer request, realtor consult, financing request, PM request |
| 13 Contractor / trade | Bid, estimate, scope, change order, daily log, invoice; trades list is data |
| 14 Realtor | Buyer/seller opportunities, CMA record, showing, offer, milestone; **never** mark off-market as MLS unless MLS integration said so |
| 15 Investor / wholesaler | Buy-box, analyzers as server calc + stored result labeled **estimate**; wholesale compliance notice key by state |
| 16 Lender | Intake, conditions, construction draws; **no lending decision** in engine or AI |
| 17 Property manager | Units, work orders, vendor assign; tenant screening / rent / lease stay off until a compliant L4 provider exists |
| 18 Transaction support | Inspection report immutable to AI; appraisal vs estimate separation; title room + wire-fraud flags; attorney matter intake |
| 19 Design / supply | Plans + revisions; supplier catalog + quote requests |

**Break:** each role’s primary conversion exists as a tested function. Role dashboards wait for L8.

---

## L4 — Integrations (Canon 9), flag-gated

**Goal:** providers are plugs. The engine stays up when a plug is missing.

| Integration | Engine contract before any UI |
| --- | --- |
| Stripe | Already required by W4 |
| Email | Verification, alerts, follow-up; honor consent |
| SMS / voice | Consent required; professionals first |
| Maps / geocoding | Replace city-text grouping with real coords + radius search |
| Calendar | Appointment sync |
| Cloud storage | Signed URLs; no public private files |
| E-signature | Envelope status on estimates/contracts |
| MLS / IDX | Realtor-gated; off-market ≠ MLS |
| Property data / comps | Investor/realtor; outputs labeled estimates |
| Accounting export | CSV / API dump |
| Video meetings | Link on appointments |
| AI model providers | Swap-able; same guardrails |
| CAPTCHA | Replaces signup honeypot |
| Analytics + error monitoring | Admin-only |
| Translation | Feeds i18n strings, not page chrome |

**Rules:** least data to each provider; credentials server-side; retry + error log; documented replacement; feature flag default off until configured.

**Exit:** fault-injection tests: provider down → core CRUD still works; outbound send skipped with a visible (later) degraded state.

**Your later action:** create provider accounts when we reach a live integration. Until then, flags stay off.

---

## L5 — Operations (Canon 10 admin APIs)

**Goal:** the Intelligence Center is an API first. The admin pages in L8 only call it.

Covered operations (each writes a complete audit row):

- User and workspace management; suspend / restore / appeal
- Verification and license/insurance review (from W3)
- Subscription and credit adjustments
- Marketplace moderation and reports
- Disputes
- AI cost + agent kill switches
- Integration health
- Feature flags, coupons, referrals
- Revenue / usage reports (query layer)
- Support tickets
- Notification templates
- Data export and deletion requests

**Exit:** permission tests (non-admin denied); audit completeness tests (identity, time, before, after, reason, reference).

Existing `admin.tsx` / `admin.users.tsx` shells may call these functions as temporary wiring. Finished admin pages wait for L8.

---

## L6 — Platform capabilities as engine (Canon 11 minus visual polish)

**Goal:** mobile/PWA requirements that are data or config, not visual design.

- Offline draft API (listing, message, onboarding) so a later PWA can sync
- Push subscription table + send path (flag-gated)
- Deep-link route **names** reserved (do not restyle)
- Language catalog + string keys (major US languages) as data
- Accessibility **rules** documented for L8 (focus, labels, contrast) — do not rebuild current shells
- App-store payment rule review is a launch checklist item, not a page

**Exit:** drafts persist without a network; string keys exist for L8 to bind.

---

## L7 — Hardening (before pretty pages)

**Goal:** the engine is safe enough that inserting pages cannot bypass it.

- RLS coverage review on every table
- Signed URL expiry and bucket policies
- Anti-wire-fraud banners and restricted fields on title/closing records
- Abuse / bot (CAPTCHA from L4)
- Encryption in transit (already) + at-rest confirmation on hosted DB
- Backups + restore drill on the hosted project
- Load / error monitoring
- Privacy export / delete (from L5) proven
- Legal disclaimer **copy stored as data** (privacy, terms, wholesaling, lending, appraisal, legal, no-guarantee badges)
- Full API regression + scripted UAT of the lifecycle

**Break (pre-page launch gate):** go/no-go on the engine. If this fails, do not insert finished pages.

---

## L8 — Page insertion (LAST)

Only start this layer when the workflows that a page needs already pass.

Insertion means: drop in the finished screen, bind it to existing hooks / server functions, delete or shrink the Lovable shell, and prove the same loop in a browser that the API tests already proved.

### How a page is allowed to ship

1. Name the workflow IDs it depends on (W1–W6, plus L4 flags).
2. Confirm those tests are green.
3. Replace the shell (or add the missing route).
4. Bind widgets from `PROFILE_ROLES` — do not invent a second information architecture.
5. Manual hello-world: one real user action that writes a real row (not “page loaded”).
6. Accessibility pass for that page (Canon 11).

### Insertion order (still pages-last, but internal order once we start)

Insert in this order so each screen has somewhere to go:

1. **App chrome** — signed-in nav, workspace switcher, role gate, suspend wall (shells exist; replace last).
2. **Auth / onboarding / settings / billing portal** — users must enter the product.
3. **Shared modules** used by every role: marketplace, messages, documents, projects, professionals, notifications.
4. **Property hub + CRM** — the connectivity screens.
5. **Trust / verification** display (badges + disclaimers).
6. **Assistant** grounded UI (the engine already refuses forbidden actions).
7. **Eight role homes** (Canons 12–19), each only showing catalog widgets.
8. **Admin Intelligence Center** screens.
9. **Marketing site** (index, features, pricing, about, legal) — last among last, because they do not prove the OS.
10. **PWA install / a11y / i18n polish** on the finished pages (not on the old shells).

### Page inventory to insert (you do not have these yet)

These are the finished surfaces. Until they exist, we keep building L0–L7.

**Marketing (public)**

- Home, features, pricing, about, demo, FAQ, help, contact
- Legal: terms, privacy, cookies, disclaimer, acceptable use
- Auth: sign in / sign up, forgot password, reset password

**Shared app**

- Role-aware home / dashboard
- Onboarding (save-and-resume already in engine)
- Settings + security
- Marketplace search / post / detail
- Messages
- Documents
- Projects
- Professionals directory
- Verification request + badge display
- Billing + credit wallet
- Notifications center
- Support
- Suspended / appeal

**CRM + property (shared professional)**

- Leads, contacts, companies, pipeline, tasks, notes, appointments
- Properties (all current Coming Soon tabs become real: units, financials, documents, activity — only after L3 property hub)
- Reports / automations (gated by entitlements)

**Role homes (one each; widgets from `canons.ts`)**

| Role | Home widgets to bind |
| --- | --- |
| Homeowner | property record, repair requests, professionals, messages, documents |
| Contractor | lead feed, bids, projects, estimates, verification |
| Trade | job feed, availability, projects, invoices |
| Realtor | listings, buyer/seller pipeline, showings, offers, documents |
| Investor | hot deals, pipeline, analyzers, projects, crm_leads |
| Wholesaler | seller pipeline, buyer list, assignments, compliance, documents |
| Lender | loan pipeline, prequal, documents, conditions |
| Property manager | work orders, vendors, properties, documents, messages |
| Inspector | appointments, inspection_reports, repair tags, messages |
| Appraiser | appointments, appraisal_reports, documents |
| Title | closing_orders, milestones, documents, messages |
| Insurance | insurance_quotes, policies, referrals, messages |
| Attorney | matters, documents, appointments |
| Designer | portfolio, plans, projects, approvals |
| Supplier | catalog, material_quotes, material_orders, vendor_leads |
| Admin | users, verification review, moderation, credits, audit |

**Admin**

- Intelligence Center home
- Users / workspaces
- Launch + checkout verification (ops tools already sketched)
- Moderation, flags, tickets, templates, i18n, export/delete

If a finished page arrives early, it sits in a holding folder or a dark route. It is not the product until its engine tests pass.

---

## Cross-cutting test strategy

| Layer | What must pass |
| --- | --- |
| L0 | Catalog vs canon document |
| L1 | Empty-DB migrations; RLS isolation |
| L2 | AuthZ: happy, cross-workspace, spoof, entitlement |
| L3 | Workflow scripts / integration tests for W1–W6 |
| L4 | Provider down still serves core; consent honored |
| L5 | Admin audit completeness |
| L6 | Offline draft + i18n keys |
| L7 | Security review, restore drill, API UAT |
| L8 | Browser hello-world per inserted page + a11y |

CI today: typecheck + lint + unit on every PR. Integration tests run when `SUPABASE_TEST_URL` and `SUPABASE_TEST_ANON_KEY` are set. Playwright e2e is added when L8 starts — not before, because we refuse to snapshot throwaway shells.

Package manager is `bun`. Commands live in `package.json` and `AGENTS.md`.

---

## Risks (engine, not design)

| Risk | Why it matters | Mitigation |
| --- | --- | --- |
| Stripe line not chosen | Four branches collide | One later button; do not merge more than one |
| RLS recursion | Already bitten twice | Helpers + the three hard rules in L1 |
| Unifying two CRMs | Investor CRM and canon CRM can fork | One pipeline catalog; conversion tests |
| AI without credits | Metering lies | W5 after W4 |
| MLS / off-market mixup | Legal | Flag + rule in data before realtor pages |
| Tenant / lending / legal scope | Regulatory | Keep those actions off until licensed providers; AI inherits bans |
| Polishing shells | Wasted work once real pages arrive | L8 is the only visual finish line |
| Secrets / providers missing | Cannot prove hosted billing or SMS | Engine tests use local Supabase + flags off |

---

## What we will not do until L8

- Redesign current Lovable screens
- Build eight custom dashboards on mock data
- Block engine work on missing Figma / page files
- Treat “the route exists” as “the canon is done”
- Add Playwright against Coming Soon tabs

---

## Immediate next engine slice (no pages)

Resume autonomously, in this order, still on the working branch:

1. CRM remaining (W2): companies, notes, appointments, CSV, duplicate detection.
2. Communication remaining (W1): Realtime delivery. Attachments and outbound intents are in.
3. Billing (W4) on `embedded_page_v4`: Stripe webhook deposits into the Canon 7 wallet. Do not merge the four old Stripe branches. Keys stay Gate 9.
4. AI guardrails (W5) after credits: forbidden-action rejects + reserve/charge around tool calls.

That is the entire remaining product, sequenced so **pages are inserted last**.
