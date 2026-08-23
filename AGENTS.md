<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Cursor Cloud specific instructions

Package manager is `bun` (`bun.lock`). `npm` 10.x can crash in this environment (`Exit handler never called!`); use `~/.bun/bin/bun` or the `npm run *` scripts after bun is on PATH.

Local Supabase is the development database (`supabase start`). After applying a new migration, regenerate types with `supabase gen types typescript --local` and run Prettier on `src/integrations/supabase/types.ts`. Integration tests in `tests/workspace-data.integration.test.ts` stay skipped unless `SUPABASE_TEST_URL` and `SUPABASE_TEST_ANON_KEY` are set (use the local anon JWT from `supabase status`).

Canon workspace records are no longer read from `localStorage`. `src/lib/workspace-store.ts` exports view-model types and helpers only. Persistence goes through RLS-scoped server functions in `src/lib/workspace.functions.ts` and `src/lib/identity.functions.ts`. Pages refresh via react-query hooks in `src/hooks/use-workspace-data.ts` and `src/hooks/use-identity.ts` — `useWorkspace().tick` is gone.

New signups create a personal workspace + empty credit wallet via `handle_new_user()`. Existing local users created before that trigger need a one-time `ensurePersonalWorkspace` backfill (runs inside `getAccessStateFn` / `listWorkspacesFn`). `supabase db reset` wipes local users; recreate test accounts after a reset.

Suspended profiles (`profiles.suspended_at`) are redirected to `/suspended` by `_authenticated/route.tsx`. Password reset lives at `/forgot-password` and `/reset-password`. Optional TOTP MFA is enrolled from Settings. Provider CAPTCHA is Phase 10; signup has a honeypot only.

Standard commands: `npm run typecheck`, `npm run lint`, `npm run test`, `npm run dev` (port 8080). Sequencing source of truth is `docs/completion-plan.md` (engine first, finished pages last). `docs/build-plan.md` is the older phase checklist.

Marketplace listing photos upload to the local `marketplace-media` storage bucket (public read, authenticated write). After `supabase db reset`, the bucket is recreated by `20260823120000_phase3_marketplace.sql`. Convert-to-lead writes `leads.listing_id` + `leads.title`. Map view groups by location text until Phase 10 geocoding.
