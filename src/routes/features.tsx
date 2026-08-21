import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingLayout } from "@/components/marketing-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Calculator, Users, Phone, FileText, Zap, Sparkles, UserRound, Store, ShieldCheck, MessageSquare, HardHat } from "lucide-react";

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title: "Features — Boliviq" },
      { name: "description", content: "Marketplace, CRM, verification, AI agents, projects, and role-based workspaces for real estate and construction." },
      { property: "og:title", content: "Features — Boliviq" },
      { property: "og:description", content: "One connected platform for every real estate and construction role." },
    ],
  }),
  component: Features,
});

const features = [
  { icon: Store, t: "Marketplace", d: "Homes, off-market, repairs, trades, lending, materials, jobs, and education — search, save, message, and convert into a lead or project." },
  { icon: Users, t: "17 profile types", d: "Homeowner through contractor, realtor, investor, lender, inspector, title, attorney, designer, and supplier — each with a matching dashboard." },
  { icon: ShieldCheck, t: "Trust & verification", d: "Identity, license, insurance, and Boliviq certified are separate badges. None of them guarantee a person's services." },
  { icon: MessageSquare, t: "Communication Center", d: "Property- and project-specific threads, drafts, and consented SMS/email with quiet hours and opt-out." },
  { icon: UserRound, t: "CRM & pipeline", d: "Twelve canon stages from new lead through close, loss, or long-term follow-up — shared across teams." },
  { icon: HardHat, t: "Projects", d: "Repair requests become bids. Estimates become jobs with budgets, photos, and approvals." },
  { icon: Sparkles, t: "Boliviq AI", d: "A role-aware assistant plus ten specialized agents. They cannot send, sign, lend, or publish without you." },
  { icon: Calculator, t: "Deal and construction math", d: "Flip, rental, BRRRR, wholesale, and rehab estimating. Valuations are labeled as estimates, not appraisals." },
  { icon: Phone, t: "Calls with consent", d: "Scripts, summaries, and TCPA-aware calling hours. Boliviq does not dial without your action." },
  { icon: FileText, t: "Documents", d: "Private files, signed downloads, and restricted closing rooms with wire-fraud warnings." },
  { icon: Zap, t: "Integrations", d: "Stripe, email, SMS, maps, calendar, e-sign, MLS/IDX, and more — each modular so the rest of Boliviq still works if a provider is down." },
  { icon: Building2, t: "Admin Intelligence Center", d: "Users, workspaces, verification, marketplace moderation, credits, audit logs, and launch checks." },
];

function Features() {
  return (
    <MarketingLayout>
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold sm:text-5xl">Features</h1>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Boliviq is one operating system for finding, connecting, analyzing, financing, building, and managing property — with or without AI.
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
          <Link to="/auth"><Button size="lg">Create your workspace</Button></Link>
        </div>
      </section>
    </MarketingLayout>
  );
}
