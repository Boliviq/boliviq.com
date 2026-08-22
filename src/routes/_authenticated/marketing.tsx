import { createFileRoute } from "@tanstack/react-router";
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

export const Route = createFileRoute("/_authenticated/marketing")({
  component: Marketing,
});

const referrals = [
  { code: "ALEX20", uses: 12, credit: "$20", status: "active" },
  { code: "LAUNCH50", uses: 84, credit: "$50", status: "active" },
];

const coupons = [
  { code: "SPRING25", discount: "25% off first 3 months", uses: 47, status: "active" },
  { code: "TEAMS100", discount: "$100 off Team annual", uses: 12, status: "active" },
];

const templates = [
  {
    key: "welcome",
    name: "Welcome email",
    subject: "Welcome to Boliviq 🎉",
    body: "Hi {{first_name}},\n\nWelcome aboard! Here's how to get your first deal analyzed in under 5 minutes…",
  },
  {
    key: "trial-reminder",
    name: "Trial reminder (3 days left)",
    subject: "3 days left on your trial",
    body: "Hi {{first_name}},\n\nYour trial ends {{trial_end}}. Upgrade any time to keep your workspace…",
  },
  {
    key: "trial-expired",
    name: "Trial expired",
    subject: "Your trial has ended",
    body: "Hi {{first_name}},\n\nYour trial has ended. Your data is preserved for 30 days — upgrade to continue…",
  },
  {
    key: "upgrade-request",
    name: "Upgrade nudge",
    subject: "You're close to your plan limit",
    body: "Hi {{first_name}},\n\nYou're at {{usage_pct}}% of your {{plan}} plan…",
  },
  {
    key: "feature",
    name: "New feature announcement",
    subject: "New in Boliviq: {{feature_name}}",
    body: "Hi {{first_name}},\n\nWe just shipped {{feature_name}} — here's what you can do with it…",
  },
  {
    key: "referral",
    name: "Referral invitation",
    subject: "Get $20 off Boliviq",
    body: "Hi {{friend_name}},\n\n{{referrer_name}} thinks you'd love Boliviq. Use code {{code}} for $20 off…",
  },
];

const submissions = [
  {
    type: "Contact",
    from: "info@bluebrickcap.com",
    subject: "Enterprise pricing question",
    when: "2h ago",
  },
  {
    type: "Demo request",
    from: "sam@ridgewayre.com",
    subject: "Team of 6 — flip focused",
    when: "5h ago",
  },
  {
    type: "Contact",
    from: "hello@parkviewholdings.com",
    subject: "Integration with our CRM",
    when: "1d ago",
  },
];

function Marketing() {
  return (
    <>
      <PageHeader
        title="Marketing tools"
        description="Referrals, coupons, email templates, and inbound submissions."
      />
      <div className="p-4 sm:p-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          <Kpi icon={TrendingUp} label="Trial → paid (30d)" value="34%" />
          <Kpi icon={Users} label="New signups (7d)" value="128" />
          <Kpi icon={Ticket} label="Referral signups" value="96" />
          <Kpi icon={Percent} label="Coupon redemptions" value="59" />
        </div>

        <Tabs defaultValue="referrals">
          <TabsList className="flex flex-wrap">
            <TabsTrigger value="referrals">
              <Ticket className="mr-1 h-4 w-4" />
              Referrals
            </TabsTrigger>
            <TabsTrigger value="coupons">
              <Percent className="mr-1 h-4 w-4" />
              Coupons
            </TabsTrigger>
            <TabsTrigger value="emails">
              <Mail className="mr-1 h-4 w-4" />
              Email templates
            </TabsTrigger>
            <TabsTrigger value="submissions">
              <Inbox className="mr-1 h-4 w-4" />
              Submissions
            </TabsTrigger>
            <TabsTrigger value="affiliate">
              <Link2 className="mr-1 h-4 w-4" />
              Affiliate
            </TabsTrigger>
          </TabsList>

          <TabsContent value="referrals" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Referral codes</CardTitle>
                <Button size="sm" onClick={() => toast.success("Referral code created.")}>
                  New code
                </Button>
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="text-left py-2">Code</th>
                      <th className="text-left py-2">Credit</th>
                      <th className="text-left py-2">Uses</th>
                      <th className="text-left py-2">Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {referrals.map((r) => (
                      <tr key={r.code} className="border-t">
                        <td className="py-2 font-mono">{r.code}</td>
                        <td className="py-2">{r.credit}</td>
                        <td className="py-2">{r.uses}</td>
                        <td className="py-2">
                          <Badge>{r.status}</Badge>
                        </td>
                        <td className="py-2 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              navigator.clipboard.writeText(r.code);
                              toast.success("Copied");
                            }}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="coupons" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Coupons</CardTitle>
                <Button size="sm" onClick={() => toast.success("Coupon created.")}>
                  New coupon
                </Button>
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="text-left py-2">Code</th>
                      <th className="text-left py-2">Discount</th>
                      <th className="text-left py-2">Uses</th>
                      <th className="text-left py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coupons.map((c) => (
                      <tr key={c.code} className="border-t">
                        <td className="py-2 font-mono">{c.code}</td>
                        <td className="py-2">{c.discount}</td>
                        <td className="py-2">{c.uses}</td>
                        <td className="py-2">
                          <Badge>{c.status}</Badge>
                        </td>
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
                  <CardHeader>
                    <CardTitle className="text-base">{t.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <Label className="text-xs">Subject</Label>
                      <Input defaultValue={t.subject} />
                    </div>
                    <div>
                      <Label className="text-xs">Body</Label>
                      <Textarea defaultValue={t.body} rows={5} />
                    </div>
                    <Button size="sm" onClick={() => toast.success("Template saved.")}>
                      Save
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="submissions" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Inbound submissions</CardTitle>
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="text-left py-2">Type</th>
                      <th className="text-left py-2">From</th>
                      <th className="text-left py-2">Subject</th>
                      <th className="text-left py-2">When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((s, i) => (
                      <tr key={i} className="border-t">
                        <td className="py-2">
                          <Badge variant={s.type === "Demo request" ? "default" : "secondary"}>
                            {s.type}
                          </Badge>
                        </td>
                        <td className="py-2">{s.from}</td>
                        <td className="py-2">{s.subject}</td>
                        <td className="py-2 text-muted-foreground">{s.when}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="affiliate" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Affiliate program</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Affiliate tracking will be wired up to your billing provider. When Stripe is
                connected, per-affiliate attribution and payouts activate here.
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase">
          <Icon className="h-4 w-4 text-success" />
          {label}
        </div>
        <div className="mt-2 font-display text-2xl font-bold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}
