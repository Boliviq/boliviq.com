import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingLayout } from "@/components/marketing-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Calculator, Users, Phone, Target, FileText, Zap, BarChart3, Sparkles, UserRound } from "lucide-react";

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title: "Features — Boliviq" },
      { name: "description", content: "Property leads, deal analysis, scoring, rehab estimating, calls, CRM, offers, reports, and automations." },
      { property: "og:title", content: "Features — Boliviq" },
      { property: "og:description", content: "Everything you need to run a real estate acquisitions pipeline." },
    ],
  }),
  component: Features,
});

const features = [
  { icon: Building2, t: "Property lead management", d: "Import via manual entry, CSV, or URL. Full search, filters, and saved views." },
  { icon: Sparkles, t: "AI-assisted deal analysis", d: "Purchase info, financing, ARV, rehab, exit strategy — all evaluated together." },
  { icon: Target, t: "Deal scoring", d: "1–100 scores with sub-scores for profit, rental performance, and risk." },
  { icon: Calculator, t: "Rehab estimating", d: "Itemized budgets with kitchen, bath, roof, HVAC, and cosmetic presets." },
  { icon: Phone, t: "Call preparation", d: "Auto-generated scripts, prep notes, and transcript summaries." },
  { icon: UserRound, t: "CRM", d: "Contacts, notes, activities, and full history per lead." },
  { icon: Calculator, t: "Offer calculations", d: "MAO, 70% rule, DSCR, cash-on-cash, cap rate, BRRRR refi model." },
  { icon: Users, t: "Team collaboration", d: "Shared pipeline, assignments, and role-based permissions." },
  { icon: FileText, t: "Reports", d: "Print-ready deal packages for partners, lenders, and buyers." },
  { icon: Zap, t: "Automations", d: "Trigger tasks, alerts, and follow-ups based on rules you define." },
  { icon: BarChart3, t: "Portfolio analytics", d: "See projected profit and monthly cash flow across every deal." },
];

function Features() {
  return (
    <MarketingLayout>
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold sm:text-5xl">Features</h1>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Boliviq combines a CRM, deal analyzer, rehab estimator, call assistant, and automation engine — built for acquisitions teams.
          </p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Card key={f.t}>
              <CardContent className="p-6">
                <f.icon className="h-6 w-6 text-success" />
                <div className="mt-3 font-semibold">{f.t}</div>
                <p className="mt-1 text-sm text-muted-foreground">{f.d}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="mt-12 text-center">
          <Link to="/auth"><Button size="lg">Start free</Button></Link>
        </div>
      </section>
    </MarketingLayout>
  );
}
