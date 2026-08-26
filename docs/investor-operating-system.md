# Boliviq Investor Operating System

Property-centered investor workflow connecting discovery → analysis → funding → construction → transaction → portfolio on **one canonical property record**.

## Architecture

```
canonical_properties  (intelligence hub)
        ↕ canonical_property_id
CRM properties / deals / portfolio_assets  (workspace hub)

Shared:
  workspaces · memberships · RLS · credits · subscriptions · marketplace · notifications · AI
```

Do **not** create parallel user, CRM, billing, or property systems.

## Capabilities

| # | Capability | Primary surface |
| --- | --- | --- |
| 1 | Property Intelligence Passport | `/investor-os/passport/$id` |
| 2 | AI Acquisition Agent | `/investor-os/acquisition` |
| 3 | Capital / Funding Marketplace | `/investor-os/capital` |
| 4 | Construction Intelligence | Passport → Construction tab |
| 5 | Deal-Risk Intelligence | Passport → Risk tab |
| 6 | Exit Strategy Engine | Passport → Exits (+ Deal Analyzer) |
| 7 | Owner Outreach Center | Passport → Outreach |
| 8 | Investor Buyer Matching | Passport → Buyers |
| 9 | Permit & Zoning Intelligence | Passport → Permits & Zoning |
| 10 | Transaction Command Center | `/investor-os/transactions` |
| 11 | Portfolio Command Center | `/investor-os/portfolio` |
| 12 | Opportunity Radar | `/investor-os/radar` |

Hub: `/investor-os` · Admin: `/admin/investor-os`

## Database

Migration: `supabase/migrations/20260826060000_investor_operating_system.sql`

Extends Distressed Engine migration `20260826050000_*` (`canonical_properties`, `distress_events`, …).

New / extended tables include timeline, field provenance, deal risk reports, exit scenarios, construction estimates & bids, zoning/permits, buy boxes & radar matches, lenders & funding matches, buyer profiles/matches, outreach suppressions/campaigns, deal transactions & milestones, portfolio assets, AI agent runs, investor OS entitlements.

## Scoring (distinct)

- Distress Score
- Opportunity Score
- Deal Risk Score / level (GREEN / YELLOW / RED)
- Buyer Match Score
- Funding Match Score

Each score stores version + component reasons; AI may not invent property facts.

## Entitlements

`src/lib/investor-os/entitlements.ts` — plan flags (`opportunity_radar`, `ai_acquisition_agent`, `funding_marketplace`, …). Free users can explore **DEMO** paths; live send/charge requires plan entitlement.

## Providers

Commercial property / skip-trace / telephony providers remain optional. Without keys, DEMO adapters run through the real pipeline and are labeled **DEMO DATA**.

## Tests

```bash
bun run test
bun run typecheck
```

See `tests/investor-os.test.ts` and `tests/distress-engine.test.ts`.
