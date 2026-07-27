import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MarketingLayout } from "@/components/marketing-layout";
import { Check, Sparkles } from "lucide-react";
import { plans, AI_MAX_DISCLAIMER } from "@/lib/plans";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Boliviq" },
      { name: "description", content: "Free, Beginner, Professional, Team, and AI Max plans. Save 20% with annual billing." },
      { property: "og:title", content: "Pricing — Boliviq" },
      { property: "og:description", content: "Plans, AI Max add-ons, and Boliviq Credits." },
    ],
  }),
  component: Pricing,
});

function Pricing() {
  const [annual, setAnnual] = useState(false);
  const core = plans.filter((p) => !p.aiMax);
  const aiMax = plans.filter((p) => p.aiMax);

  return (
    <MarketingLayout>
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold sm:text-5xl">Pricing that scales with you</h1>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Start free. Upgrade when you're ready. Add AI Max for full AI access. Cancel anytime.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border bg-card p-1">
            <button onClick={() => setAnnual(false)} className={`rounded-full px-4 py-1.5 text-sm font-medium ${!annual ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Monthly</button>
            <button onClick={() => setAnnual(true)} className={`rounded-full px-4 py-1.5 text-sm font-medium ${annual ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Annual · save 20%</button>
          </div>
        </div>

        <div className="mt-12 grid gap-4 lg:grid-cols-4">
          {core.map((p) => {
            const price = annual ? p.annual : p.monthly;
            return (
              <Card key={p.tier} className={p.highlight ? "border-success ring-2 ring-success/30" : ""}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold">{p.name}</div>
                    {p.badge && <Badge className="bg-success text-success-foreground">{p.badge}</Badge>}
                  </div>
                  <div className="mt-3 font-display text-4xl font-bold">
                    ${price}
                    <span className="text-base font-normal text-muted-foreground">{annual ? "/yr" : "/mo"}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{p.tagline}</p>
                  {p.seatNote && <p className="mt-1 text-xs text-muted-foreground">{p.seatNote}</p>}
                  <ul className="mt-4 space-y-2 text-sm">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" /> {f}
                      </li>
                    ))}
                  </ul>
                  <Link to="/auth" className="mt-6 block">
                    <Button className="w-full" variant={p.highlight ? "default" : "outline"}>
                      {p.tier === "free" ? "Start free" : `Start ${p.name}`}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/5 px-4 py-1.5 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Powered by Boliviq AI
          </div>
          <h2 className="mt-4 text-3xl font-bold sm:text-4xl">AI Max</h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Unlock the highest level of AI capability across Boliviq — full AI access, priority processing, advanced automation, and premium future features.
          </p>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {aiMax.map((p) => {
            const price = annual ? p.annual : p.monthly;
            return (
              <Card key={p.tier} className="border-primary/40 ring-2 ring-primary/20">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold">{p.name}</div>
                    <Badge className="bg-primary text-primary-foreground">AI Max</Badge>
                  </div>
                  <div className="mt-3 font-display text-4xl font-bold">
                    ${price}
                    <span className="text-base font-normal text-muted-foreground">{annual ? "/yr" : "/mo"}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{p.tagline}</p>
                  {p.seatNote && <p className="mt-1 text-xs text-muted-foreground">{p.seatNote}</p>}
                  <ul className="mt-4 space-y-2 text-sm">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {f}
                      </li>
                    ))}
                  </ul>
                  <Link to="/auth" className="mt-6 block">
                    <Button className="w-full">Start {p.name}</Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <div className="mt-3 text-center text-xs text-muted-foreground">{AI_MAX_DISCLAIMER}</div>

        <Card className="mt-12">
          <CardContent className="flex flex-col items-start justify-between gap-4 p-6 md:flex-row md:items-center">
            <div>
              <div className="font-semibold">Enterprise</div>
              <p className="text-sm text-muted-foreground">Custom seat counts, SSO, dedicated support, procurement paperwork, and volume pricing.</p>
            </div>
            <Link to="/contact"><Button variant="outline">Contact sales</Button></Link>
          </CardContent>
        </Card>

        <div className="mt-10 text-center text-xs text-muted-foreground">
          Prices in USD. Taxes may apply. Estimates and calculations inside Boliviq are not financial advice.
        </div>
      </section>
    </MarketingLayout>
  );
}
