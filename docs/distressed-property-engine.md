# Boliviq National Distressed Property Engine

Production architecture for nationwide multi-signal distressed-property intelligence.

## Architecture

```
Provider adapters (ATTOM / federal / local / auction / demo)
        ↓
RAW → VALIDATE → NORMALIZE → MATCH/DEDUPE → canonical_properties
        ↓
distress_events + distress_source_records
        ↓
Distress Score + Opportunity Score
        ↓
Search UI → Property detail → Saved search / Watchlist / CRM / AI / Marketplace
```

**Canonical catalog vs CRM:** Shared searchable inventory lives in `canonical_properties`. User CRM `properties` rows optionally link via `canonical_property_id`. This extends Boliviq without duplicating billing, credits, roles, or pipeline systems.

## Database

Migration: `supabase/migrations/20260826050000_national_distressed_property_engine.sql`

Key tables:

| Table | Purpose |
| --- | --- |
| `geo_countries` / `geo_states` / `geo_counties` / `geo_municipalities` / `geo_zip_codes` | National geography + FIPS |
| `distress_providers` | Adapter registry + connection metadata |
| `county_data_sources` | Per-county source registry (verification ≠ URL) |
| `canonical_properties` | Shared property intelligence records |
| `distress_events` | Multi-signal history (never delete; mark resolved) |
| `distress_source_records` | Raw retention + idempotent source keys |
| `distress_score_weights` | Admin-tunable score versioning |
| `distress_plan_entitlements` | Plan limits (not hard-coded in UI) |
| `distress_saved_searches` / `distress_watchlist` / `distress_notifications` | Alerts & watchlists |
| `distress_ingestion_runs` / `distress_coverage_metrics` | Health monitoring |

RLS: authenticated read on catalog/reference data; user-owned write on saved searches/watchlists; admin write on registry/config via `has_role(auth.uid(), 'admin')`; ingestion writes via service role.

## Provider adapter standard

Interface: `src/lib/distress/providers/types.ts`

Each adapter declares:

- credential env keys
- API / file / webhook / incremental support
- `getHealth()` → `not_connected` | `configured` | `healthy` | …
- retries with exponential backoff
- parse/normalize entry points

Adapters implemented:

| Key | Status |
| --- | --- |
| `demo` | Healthy — labeled demo feed |
| `attom` | Adapter ready — `ATTOM_API_KEY` required |
| `hud` / `usda` / `va` / `fannie_mae` / `freddie_mac` | Adapter ready — credentials required |
| `local_government` | File/JSON/CSV + webhook normalization |
| `auction_platform` | Adapter ready — `AUCTION_PROVIDER_API_KEY` required |

Commercial providers enhance coverage; they are **not** a hard dependency. Demo + local adapters run the full pipeline without paid APIs.

## Ingestion flow

Implemented in `src/lib/distress/ingestion/pipeline.ts`:

1. Validate identity + subtype
2. Deterministic `source_key` (idempotency)
3. Match property by FIPS+APN → normalized address → geo proximity
4. Upsert canonical property with confidence-aware field merge
5. Create/update distress events (history preserved)
6. Recalculate distress + opportunity scores

## County source registry

Admin UI: `/admin/distress`

Statuses: `unknown`, `discovered`, `pending_validation`, `verified`, `active`, `degraded`, `unavailable`, `blocked`, `manual_only`, `invalid`, `replaced`

**A URL alone never marks a source verified.**

### How to add another county

1. Ensure geography seeded (`Seed US geography` in admin).
2. Insert `county_data_sources` row for the county (agency, category, URL, access method).
3. Leave `verification_status = discovered` or `pending_validation`.
4. After a successful live sync, admin marks `verified` / `active`.
5. Wire a local adapter mapper if the portal needs county-specific parsing.

### How to add another provider

1. Implement `DistressProviderAdapter` in `src/lib/distress/providers/`.
2. Register in `PROVIDER_ADAPTERS`.
3. Insert `distress_providers` row (or extend migration seed).
4. Document env vars in `.env.example` (server-only, never `VITE_`).
5. Surface health on `/admin/distress`.

## Scoring

- **Distress Score (0–100):** weighted active signals; weights in `distress_score_weights`.
- **Opportunity Score (0–100):** separate blend of distress, equity, spread, bid discount, rent, timing.
- UI shows contributing signals (why the score).

## Permissions & credits

Entitlements table `distress_plan_entitlements` (free → team_ai_max).

AI analysis / enrichment / owner lookup charge existing `credit_wallets` + `credit_ledger` (reserve/charge/idempotency). Viewing ingested public records does not consume credits by default.

## Environment variables

Optional server-only:

```
ATTOM_API_KEY=
HUD_API_KEY=
USDA_API_KEY=
VA_API_KEY=
FANNIE_MAE_API_KEY=
FREDDIE_MAC_API_KEY=
AUCTION_PROVIDER_API_KEY=
```

## Admin workflows

1. Deploy migration.
2. `/admin/distress` → Seed US geography.
3. Seed TN test-market sources (discovered, not verified).
4. Run demo ingestion (validates pipeline; rows tagged `is_demo`).
5. Connect provider credentials when purchased.
6. Verify sources only after live sync succeeds.

## Troubleshooting failed ingestion

| Symptom | Check |
| --- | --- |
| `not_connected` | Missing server env credential |
| Auth failures on run | `distress_ingestion_runs.auth_failures` |
| Duplicates climbing | Expected on re-sync; events should not multiply |
| Empty search | Include demo toggle, or run demo ingestion after migration |
| CRM import fails on stage | Enum may lack `watching` until migration applied — falls back to `researching` |

## UI routes

- `/distressed-opportunities` — search, filters, map layers, cards
- `/distressed-opportunities/$id` — distress intelligence, timeline, sources, AI
- `/admin/distress` — coverage dashboard + registry

## Tests

```
npm run test -- tests/distress-engine.test.ts
```

Covers matching, idempotent ingestion, multi-source merge, scoring, providers, geography, entitlements, AI claim kinds.
