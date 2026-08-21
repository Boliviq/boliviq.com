import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Ticket, Percent, Mail, TrendingUp, Users, Inbox, Link2, Copy } from "lucide-react";
import { toast } from "sonner";
import { getMarketingOverview } from "@/lib/admin-users.functions";
import { relative } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/marketing")({
  component: Marketing,
});

const templates = [
  { key: "welcome", name: "Welcome email", subject: "Welcome to Boliviq 🎉", body: "Hi {{first_name}},\n\nWelcome aboard! Here's how to get your first deal analyzed in under 5 minutes…" },
  { key: "trial-reminder", name: "Trial reminder (3 days left)", subject: "3 days left on your trial", body: "Hi {{first_name}},\n\nYour trial ends {{trial_end}}. Upgrade any time to keep your workspace…" },
  { key: "trial-expired", name: "Trial expired", subject: "Your trial has ended", body: "Hi {{first_name}},\n\nYour trial has ended. Your data is preserved for 30 days — upgrade to continue…" },
  { key: "upgrade-request", name: "Upgrade nudge", subject: "You're close to your plan limit", body: "Hi {{first_name}},\n\nYou're at {{usage_pct}}% of your {{plan}} plan…" },
  { key: "feature", name: "New feature announcement", subject: "New in Boliviq: {{feature_name}}", body: "Hi {{first_name}},\n\nWe just shipped {{feature_name}} — here's what you can do with it…" },
  { key: "referral", name: "Referral invitation", subject: "Get $20 off Boliviq", body: "Hi {{friend_name}},\n\n{{referrer_name}} thinks you'd love Boliviq. Use code {{code}} for $20 off…" },
];

function couponDiscount(c: any) {
  if (c.discount_type === "percent") return `${c.discount_value}% off`;
  return `$${c.discount_value} off`;
}

function Marketing() {
  const overviewFn = useServerFn(getMarketingOverview);
  const { data, isLoading } = useQuery({
    queryKey: ["marketing-overview"],
    queryFn: () => overviewFn({ data: {} }),
  });

  const coupons = data?.coupons ?? [];
  const submissions = data?.submissions ?? [];

  return (
    <>
      <PageHeader title="Marketing tools" description="Referrals, coupons, email templates, and inbound submissions." />
      <div className="p-4 sm:p-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          <Kpi icon={TrendingUp} label="Active paid subs" value={isLoading ? "—" : String(data?.activeSubscriptions ?? 0)} />
          <Kpi icon={Users} label="New signups (7d)" value={isLoading ? "—" : String(data?.newUsers7d ?? 0)} />
          <Kpi icon={Ticket} label="Inbound forms" value={isLoading ? "—" : String(data?.inboundCount ?? 0)} />
          <Kpi icon={Percent} label="Coupon redemptions" value={isLoading ? "—" : String(data?.couponRedemptions ?? 0)} />
        </div>

        <Tabs defaultValue="coupons">
          <TabsList className="flex flex-wrap">
            <TabsTrigger value="coupons"><Percent className="mr-1 h-4 w-4" />Coupons</TabsTrigger>
            <TabsTrigger value="referrals"><Ticket className="mr-1 h-4 w-4" />Referrals</TabsTrigger>
            <TabsTrigger value="emails"><Mail className="mr-1 h-4 w-4" />Email templates</TabsTrigger>
            <TabsTrigger value="submissions"><Inbox className="mr-1 h-4 w-4" />Submissions</TabsTrigger>
            <TabsTrigger value="affiliate"><Link2 className="mr-1 h-4 w-4" />Affiliate</TabsTrigger>
          </TabsList>

          <TabsContent value="coupons" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Coupons</CardTitle>
                <Button size="sm" asChild><Link to="/promotions">Manage in Promotions</Link></Button>
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase text-muted-foreground"><tr><th className="text-left py-2">Code</th><th className="text-left py-2">Discount</th><th className="text-left py-2">Uses</th><th className="text-left py-2">Status</th></tr></thead>
                  <tbody>
                    {coupons.length === 0 && (
                      <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">No coupons yet. Create them on the Promotions page.</td></tr>
                    )}
                    {coupons.map((c: any) => (
                      <tr key={c.code} className="border-t">
                        <td className="py-2 font-mono">{c.code}</td>
                        <td className="py-2">{couponDiscount(c)}</td>
                        <td className="py-2">{c.current_uses ?? 0}</td>
                        <td className="py-2"><Badge variant={c.active ? "default" : "outline"}>{c.active ? "active" : "paused"}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="referrals" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Promo / referral codes</CardTitle>
                <Button size="sm" asChild><Link to="/promotions">New code</Link></Button>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-muted-foreground">
                  Referral and launch codes live in the same coupon ledger as checkout promotions.
                </p>
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase text-muted-foreground"><tr><th className="text-left py-2">Code</th><th className="text-left py-2">Credit</th><th className="text-left py-2">Uses</th><th className="text-left py-2">Status</th><th></th></tr></thead>
                  <tbody>
                    {coupons.length === 0 && (
                      <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No codes yet.</td></tr>
                    )}
                    {coupons.map((r: any) => (
                      <tr key={r.code} className="border-t">
                        <td className="py-2 font-mono">{r.code}</td>
                        <td className="py-2">{couponDiscount(r)}</td>
                        <td className="py-2">{r.current_uses ?? 0}</td>
                        <td className="py-2"><Badge variant={r.active ? "default" : "outline"}>{r.active ? "active" : "paused"}</Badge></td>
                        <td className="py-2 text-right"><Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(r.code); toast.success("Copied"); }}><Copy className="h-4 w-4" /></Button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="emails" className="mt-4">
            <div className="grid gap-4 md:grid-cols-2">
              {templates.map((t) => (
                <Card key={t.key}>
                  <CardHeader><CardTitle className="text-base">{t.name}</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <Label className="text-xs">Subject</Label>
                      <Input defaultValue={t.subject} id={`${t.key}-subject`} />
                    </div>
                    <div>
                      <Label className="text-xs">Body</Label>
                      <Textarea defaultValue={t.body} rows={5} id={`${t.key}-body`} />
                    </div>
                    <Button size="sm" onClick={() => {
                      const subject = (document.getElementById(`${t.key}-subject`) as HTMLInputElement | null)?.value ?? t.subject;
                      const body = (document.getElementById(`${t.key}-body`) as HTMLTextAreaElement | null)?.value ?? t.body;
                      navigator.clipboard.writeText(`${subject}\n\n${body}`);
                      toast.success("Template copied to clipboard.");
                    }}>Copy template</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="submissions" className="mt-4">
            <Card>
              <CardHeader><CardTitle>Inbound submissions</CardTitle></CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase text-muted-foreground"><tr><th className="text-left py-2">Type</th><th className="text-left py-2">From</th><th className="text-left py-2">Subject</th><th className="text-left py-2">When</th></tr></thead>
                  <tbody>
                    {submissions.length === 0 && (
                      <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">No contact or demo forms yet.</td></tr>
                    )}
                    {submissions.map((s: any) => (
                      <tr key={s.id} className="border-t">
                        <td className="py-2"><Badge variant={s.kind === "demo" ? "default" : "secondary"}>{s.kind === "demo" ? "Demo request" : "Contact"}</Badge></td>
                        <td className="py-2">{s.email || s.name || "—"}</td>
                        <td className="py-2">{s.subject || "—"}</td>
                        <td className="py-2 text-muted-foreground">{s.created_at ? relative(s.created_at) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="affiliate" className="mt-4">
            <Card>
              <CardHeader><CardTitle>Affiliate program</CardTitle></CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Use Promotions coupons for partner attribution until a dedicated Stripe Connect affiliate payout is wired. Codes and redemptions already appear in the tables above.
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

function Kpi({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase"><Icon className="h-4 w-4 text-success" />{label}</div>
        <div className="mt-2 font-display text-2xl font-bold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}
