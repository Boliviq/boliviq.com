import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  CircleDashed,
  Rocket,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from '@/hooks/use-current-user';
import {
  runLaunchPrecheck,
  verifyOwnerSubscription,
  dryRunDuplicateGuard,
  listRecentWebhookEvents,
  type PrecheckItem,
  type SubscriptionSnapshot,
} from '@/lib/launch-verification.functions';
import { createBoliviqPortalSession } from '@/lib/billing.functions';
import { getStripeEnvironment } from '@/lib/stripe';

export const Route = createFileRoute('/_authenticated/admin/launch-verification')({
  component: Gate,
});

function Gate() {
  const { userId, loading } = useCurrentUser();
  const { data, isLoading } = useQuery({
    queryKey: ['is-admin', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId!)
        .eq('role', 'admin')
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });
  if (loading || isLoading) return <div className="p-8 text-sm text-muted-foreground">Checking access…</div>;
  if (!data) {
    return (
      <div className="p-8">
        <Card className="max-w-lg">
          <CardHeader className="flex flex-row items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            <CardTitle>Admin access required</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            The Launch Verification Center is restricted to accounts with the <code>admin</code> role
            (enforced server-side too).
          </CardContent>
        </Card>
      </div>
    );
  }
  return <LaunchVerification />;
}

type Status = 'NOT STARTED' | 'WAITING FOR OWNER' | 'CHECKING' | 'PASS' | 'WARNING' | 'FAIL';

function StatusPill({ status }: { status: Status }) {
  const map: Record<Status, { tone: string; Icon: React.ComponentType<{ className?: string }> }> = {
    'NOT STARTED': { tone: 'text-muted-foreground', Icon: CircleDashed },
    'WAITING FOR OWNER': { tone: 'text-warning', Icon: AlertTriangle },
    CHECKING: { tone: 'text-muted-foreground', Icon: RefreshCw },
    PASS: { tone: 'text-success', Icon: CheckCircle2 },
    WARNING: { tone: 'text-warning', Icon: AlertTriangle },
    FAIL: { tone: 'text-destructive', Icon: XCircle },
  };
  const { tone, Icon } = map[status];
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${tone}`}>
      <Icon className="h-3.5 w-3.5" />
      {status}
    </span>
  );
}

function precheckAgg(items?: PrecheckItem[]): Status {
  if (!items?.length) return 'NOT STARTED';
  if (items.some((i) => i.status === 'FAIL')) return 'FAIL';
  if (items.some((i) => i.status === 'WARNING')) return 'WARNING';
  if (items.some((i) => i.status === 'WAITING FOR OWNER')) return 'WAITING FOR OWNER';
  return 'PASS';
}

function LaunchVerification() {
  const currentEnv = getStripeEnvironment();
  const runPre = useServerFn(runLaunchPrecheck);
  const verifySub = useServerFn(verifyOwnerSubscription);
  const dupCheck = useServerFn(dryRunDuplicateGuard);
  const listEvents = useServerFn(listRecentWebhookEvents);
  const openPortal = useServerFn(createBoliviqPortalSession);

  const [env, setEnv] = useState<'sandbox' | 'live'>(currentEnv);
  const [busy, setBusy] = useState<string | null>(null);
  const [precheck, setPrecheck] = useState<{ environment: 'sandbox' | 'live'; items: PrecheckItem[] } | null>(null);
  const [subSnap, setSubSnap] = useState<SubscriptionSnapshot | null>(null);
  const [dup, setDup] = useState<Awaited<ReturnType<typeof dryRunDuplicateGuard>> | null>(null);
  const [events, setEvents] = useState<Awaited<ReturnType<typeof listRecentWebhookEvents>> | null>(null);
  const [portalOwnerConfirmed, setPortalOwnerConfirmed] = useState(false);
  const [cancelOwnerConfirmed, setCancelOwnerConfirmed] = useState(false);
  const [sandboxFailureConfirmed, setSandboxFailureConfirmed] = useState(false);
  const [sandboxRecoveryConfirmed, setSandboxRecoveryConfirmed] = useState(false);

  async function run<T>(key: string, fn: () => Promise<T>): Promise<T | undefined> {
    setBusy(key);
    try {
      return await fn();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Request failed.');
    } finally {
      setBusy(null);
    }
  }

  async function handlePortal() {
    const res = await run('portal', () =>
      openPortal({ data: { environment: env, returnUrl: `${window.location.origin}/billing` } }),
    );
    if (!res) return;
    if ('error' in res) return toast.error(res.error);
    window.open(res.url, '_blank', 'noopener,noreferrer');
    toast.success('Portal opened in a new tab.');
  }

  // Section statuses
  const preStatus = precheckAgg(precheck?.items);
  const purchaseStatus: Status =
    subSnap?.hasRow && subSnap.db?.hasPaidAccess && !subSnap.mismatches.length
      ? 'PASS'
      : subSnap?.hasRow && subSnap.mismatches.length
        ? 'WARNING'
        : subSnap
          ? 'FAIL'
          : 'WAITING FOR OWNER';
  const webhookStatus: Status = events == null ? 'NOT STARTED' : events.length ? 'PASS' : 'WAITING FOR OWNER';
  const dupStatus: Status = dup == null ? 'NOT STARTED' : dup.guardWouldFire ? 'PASS' : 'WAITING FOR OWNER';
  const portalStatus: Status = portalOwnerConfirmed ? 'PASS' : 'WAITING FOR OWNER';
  const cancelStatus: Status = cancelOwnerConfirmed ? 'PASS' : 'WAITING FOR OWNER';
  const sandboxFailStatus: Status = sandboxFailureConfirmed ? 'PASS' : 'WAITING FOR OWNER';
  const sandboxRecoverStatus: Status = sandboxRecoveryConfirmed ? 'PASS' : 'WAITING FOR OWNER';

  const allPass = [
    preStatus,
    purchaseStatus,
    webhookStatus,
    dupStatus,
    portalStatus,
    cancelStatus,
    sandboxFailStatus,
    sandboxRecoverStatus,
  ].every((s) => s === 'PASS');

  return (
    <>
      <PageHeader
        title="Billing Launch Verification"
        description="Guided owner-assisted checks that must all pass before Boliviq is marked READY FOR PUBLIC LAUNCH."
      />
      <div className="space-y-6 p-4 sm:p-8">
        <Card className="border-primary/40">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Rocket className="h-5 w-5 text-primary" />
              <CardTitle>Overall status</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Testing environment</span>
              <div className="inline-flex rounded-md border p-0.5 text-xs">
                {(['sandbox', 'live'] as const).map((e) => (
                  <button
                    key={e}
                    onClick={() => setEnv(e)}
                    className={`px-2 py-1 rounded ${env === e ? 'bg-primary text-primary-foreground' : ''}`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <SummaryTile label="Precheck" status={preStatus} />
            <SummaryTile label="Live purchase" status={purchaseStatus} />
            <SummaryTile label="Webhooks" status={webhookStatus} />
            <SummaryTile label="Entitlement" status={purchaseStatus} />
            <SummaryTile label="Portal" status={portalStatus} />
            <SummaryTile label="Duplicate guard" status={dupStatus} />
            <SummaryTile label="Cancellation" status={cancelStatus} />
            <SummaryTile label="Sandbox failure + recovery" status={sandboxFailStatus === 'PASS' && sandboxRecoverStatus === 'PASS' ? 'PASS' : 'WAITING FOR OWNER'} />
            <div className="col-span-2 sm:col-span-4 mt-2 rounded-md border p-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Final readiness</span>
                <Badge variant={allPass ? 'default' : 'outline'}>
                  {allPass ? 'READY FOR PUBLIC LAUNCH' : 'READY FOR OWNER LIVE PAYMENT TESTING'}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                READY FOR PUBLIC LAUNCH requires every section above to PASS.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 1. Precheck */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">1 · Live configuration precheck ({env})</CardTitle>
              <p className="text-xs text-muted-foreground">
                Verifies API key, webhook secret, Stripe authentication, all 10 lookup keys, portal
                configuration, registered endpoints, and recent webhook activity. Secrets are never
                displayed.
              </p>
            </div>
            <StatusPill status={preStatus} />
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              size="sm"
              disabled={busy === 'precheck'}
              onClick={async () => {
                const r = await run('precheck', () => runPre({ data: { environment: env } }));
                if (r) setPrecheck(r);
              }}
            >
              {busy === 'precheck' ? 'Checking…' : 'Run precheck'}
            </Button>
            {precheck && (
              <div className="rounded-md border">
                <table className="w-full text-xs">
                  <thead className="text-muted-foreground">
                    <tr>
                      <th className="text-left p-2">Check</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {precheck.items.map((i) => (
                      <tr key={i.key} className="border-t">
                        <td className="p-2 font-medium">{i.label}</td>
                        <td className="p-2"><StatusPill status={i.status as Status} /></td>
                        <td className="p-2 text-muted-foreground">{i.detail}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 2. Live purchase */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">2 · Guided real live purchase</CardTitle>
              <p className="text-xs text-muted-foreground">
                Use a dedicated non-admin account. Buy Beginner Monthly ($49/month) through the
                normal /billing checkout — do NOT initiate the charge from this page. Then return
                and click <em>Verify my subscription</em> below.
              </p>
            </div>
            <StatusPill status={purchaseStatus} />
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
              <li>Sign in to a dedicated non-admin account on the production site.</li>
              <li>Go to <code>/billing</code> and start checkout for Beginner Monthly ($49).</li>
              <li>Complete the real payment on Stripe Checkout. Do not close the tab.</li>
              <li>When Stripe returns to <code>/billing</code>, wait for the confirmation banner.</li>
              <li>
                Come back to this page and click <em>Verify my subscription</em> (must be run
                while logged in as the test buyer).
              </li>
            </ol>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  const r = await run('verify', () => verifySub({ data: { environment: env } }));
                  if (r) setSubSnap(r);
                }}
                disabled={busy === 'verify'}
              >
                {busy === 'verify' ? 'Verifying…' : 'Verify my subscription'}
              </Button>
              <a href="/billing" className="inline-flex items-center gap-1 text-xs underline text-primary">
                Open /billing <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            {subSnap && (
              <div className="rounded-md border p-3 text-xs">
                {!subSnap.hasRow && <div>No subscription row for the current user in {env}.</div>}
                {subSnap.db && (
                  <div className="grid gap-1 sm:grid-cols-2">
                    <div><strong>Plan:</strong> {subSnap.db.plan}</div>
                    <div><strong>Status:</strong> {subSnap.db.status} ({subSnap.db.normalizedStatus})</div>
                    <div><strong>Paid access:</strong> {subSnap.db.hasPaidAccess ? 'yes' : 'no'}</div>
                    <div><strong>Price lookup:</strong> {subSnap.db.priceLookup ?? '—'}</div>
                    <div><strong>Stripe customer:</strong> {subSnap.db.stripeCustomerMasked}</div>
                    <div><strong>Stripe subscription:</strong> {subSnap.db.stripeSubscriptionMasked}</div>
                    <div><strong>Period end:</strong> {subSnap.db.currentPeriodEnd ?? '—'}</div>
                    <div><strong>Cancel at period end:</strong> {String(subSnap.db.cancelAtPeriodEnd)}</div>
                  </div>
                )}
                {subSnap.stripe && (
                  <>
                    <Separator className="my-2" />
                    <div className="grid gap-1 sm:grid-cols-2">
                      <div><strong>Stripe customer found:</strong> {String(subSnap.stripe.customerFound)}</div>
                      <div><strong>Stripe subscription found:</strong> {String(subSnap.stripe.subscriptionFound)}</div>
                      {subSnap.stripe.subscriptionStatus && (
                        <div><strong>Stripe status:</strong> {subSnap.stripe.subscriptionStatus}</div>
                      )}
                      {subSnap.stripe.priceLookup && (
                        <div><strong>Stripe price lookup:</strong> {subSnap.stripe.priceLookup}</div>
                      )}
                      {subSnap.stripe.amount != null && (
                        <div><strong>Stripe amount:</strong> ${subSnap.stripe.amount} / {subSnap.stripe.interval}</div>
                      )}
                      <div><strong>Active subs on this customer:</strong> {subSnap.stripe.duplicateActiveCount}</div>
                    </div>
                  </>
                )}
                {subSnap.mismatches.length > 0 && (
                  <div className="mt-2 rounded bg-destructive/10 p-2 text-destructive">
                    {subSnap.mismatches.map((m, i) => <div key={i}>• {m}</div>)}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 3. Webhook confirmation */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">3 · Webhook confirmation</CardTitle>
              <p className="text-xs text-muted-foreground">
                Lists the most recent Stripe events processed and stored with idempotency for
                environment <code>{env}</code>. Event IDs are masked.
              </p>
            </div>
            <StatusPill status={webhookStatus} />
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              size="sm"
              disabled={busy === 'events'}
              onClick={async () => {
                const r = await run('events', () => listEvents({ data: { environment: env, limit: 25 } }));
                if (r) setEvents(r);
              }}
            >
              {busy === 'events' ? 'Loading…' : 'Load recent events'}
            </Button>
            {events && events.length === 0 && (
              <div className="text-xs text-muted-foreground">No events processed yet in this environment.</div>
            )}
            {events && events.length > 0 && (
              <div className="rounded-md border">
                <table className="w-full text-xs">
                  <thead className="text-muted-foreground">
                    <tr>
                      <th className="text-left p-2">Event ID (masked)</th>
                      <th className="text-left p-2">Type</th>
                      <th className="text-left p-2">Env</th>
                      <th className="text-left p-2">Processed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((e, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="p-2 font-mono">{e.idMasked}</td>
                        <td className="p-2">{e.type}</td>
                        <td className="p-2">{e.env}</td>
                        <td className="p-2 text-muted-foreground">{new Date(e.processedAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 4. Customer Portal */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">4 · Customer Portal verification</CardTitle>
              <p className="text-xs text-muted-foreground">
                Server checks: authenticated, customer id read from database (never the browser),
                approved return URL. Owner confirms the portal displays the correct subscription and
                controls.
              </p>
            </div>
            <StatusPill status={portalStatus} />
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Button size="sm" onClick={handlePortal} disabled={busy === 'portal'}>
              {busy === 'portal' ? 'Opening…' : 'Open Customer Portal'}
            </Button>
            <label className="flex items-start gap-2 text-xs">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={portalOwnerConfirmed}
                onChange={(e) => setPortalOwnerConfirmed(e.target.checked)}
              />
              <span>
                I confirm the portal opened and shows: correct customer, Beginner subscription at
                $49/month, payment-method management, invoice history, and a cancellation option.
              </span>
            </label>
          </CardContent>
        </Card>

        {/* 5. Duplicate guard */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">5 · Duplicate-subscription protection</CardTitle>
              <p className="text-xs text-muted-foreground">
                Runs the exact server-side check used by <code>createBoliviqCheckout</code>. Must be
                executed while logged in as the account that just purchased — no second real
                checkout is created.
              </p>
            </div>
            <StatusPill status={dupStatus} />
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Button
              size="sm"
              disabled={busy === 'dup'}
              onClick={async () => {
                const r = await run('dup', () => dupCheck({ data: { environment: env } }));
                if (r) setDup(r);
              }}
            >
              {busy === 'dup' ? 'Checking…' : 'Test duplicate guard'}
            </Button>
            {dup && <div className="rounded-md border p-3 text-xs text-muted-foreground">{dup.detail}</div>}
          </CardContent>
        </Card>

        {/* 6. Cancellation */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">6 · Cancellation verification</CardTitle>
              <p className="text-xs text-muted-foreground">
                Cancel the test subscription from inside the Customer Portal. Then re-run
                <em> Verify my subscription</em> above to confirm status &amp;
                <code> cancel_at_period_end</code> updated. Cancellation ≠ refund — a refund is a
                separate owner action in Stripe.
              </p>
            </div>
            <StatusPill status={cancelStatus} />
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
              <li>Open the Customer Portal (button above).</li>
              <li>Cancel the test subscription according to your portal policy.</li>
              <li>Return here and click <em>Verify my subscription</em> in section 2.</li>
              <li>
                Confirm Boliviq shows the correct scheduled or immediate cancellation state
                (matches the mismatches list in section 2 being empty).
              </li>
            </ol>
            <label className="flex items-start gap-2 text-xs">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={cancelOwnerConfirmed}
                onChange={(e) => setCancelOwnerConfirmed(e.target.checked)}
              />
              <span>
                I completed cancellation in the portal and Boliviq now shows the correct
                cancellation state.
              </span>
            </label>
          </CardContent>
        </Card>

        {/* 7. Sandbox failure + recovery */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">7 · Sandbox payment failure &amp; recovery</CardTitle>
              <p className="text-xs text-muted-foreground">
                Do NOT test declined payments in live mode. Switch the environment above to
                <code> sandbox</code>, create a real sandbox subscription with a failing test card, then
                recover with a successful test card. Watch the events feed and verify status
                transitions.
              </p>
            </div>
            <StatusPill status={sandboxFailStatus === 'PASS' && sandboxRecoverStatus === 'PASS' ? 'PASS' : 'WAITING FOR OWNER'} />
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
              <li>Switch this page's environment toggle to <strong>sandbox</strong>.</li>
              <li>
                On the preview app, sign in as a dedicated sandbox test user and subscribe to
                Beginner Monthly.
              </li>
              <li>
                In the Stripe sandbox dashboard, attach failing test card
                <code> 4000 0000 0000 0341</code> (attach → fails on charge) or advance a test clock so
                the next invoice fails.
              </li>
              <li>
                Reload webhook events here — you should see
                <code> invoice.payment_failed</code> and the subscription status change to
                <code> past_due</code>.
              </li>
              <li>Replace the card with <code>4242 4242 4242 4242</code> and retry the invoice.</li>
              <li>
                Reload webhook events — you should see <code>invoice.paid</code> and status return to
                <code> active</code>. Run <em>Verify my subscription</em> to confirm.
              </li>
            </ol>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="flex items-start gap-2 text-xs">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={sandboxFailureConfirmed}
                  onChange={(e) => setSandboxFailureConfirmed(e.target.checked)}
                />
                <span>
                  Confirmed: <code>invoice.payment_failed</code> processed, status changed to
                  <code> past_due</code>, /billing shows a payment warning, Manage Billing still works.
                </span>
              </label>
              <label className="flex items-start gap-2 text-xs">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={sandboxRecoveryConfirmed}
                  onChange={(e) => setSandboxRecoveryConfirmed(e.target.checked)}
                />
                <span>
                  Confirmed: <code>invoice.paid</code> processed, status back to <code>active</code>,
                  warning cleared, no duplicate subscription created.
                </span>
              </label>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function SummaryTile({ label, status }: { label: string; status: Status }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1"><StatusPill status={status} /></div>
    </div>
  );
}
