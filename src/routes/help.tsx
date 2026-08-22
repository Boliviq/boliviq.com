import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingLayout } from "@/components/marketing-layout";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, LifeBuoy, Bug, Lightbulb, PlayCircle } from "lucide-react";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Help Center — Boliviq" },
      { name: "description", content: "Guides, support, bug reports, and feature requests." },
      { property: "og:title", content: "Help Center — Boliviq" },
      { property: "og:description", content: "Get help using Boliviq." },
    ],
  }),
  component: Help,
});

const cards = [
  {
    icon: PlayCircle,
    t: "Getting started",
    d: "Set up your workspace, add your first property, and run your first analysis.",
    link: "/auth",
  },
  {
    icon: BookOpen,
    t: "How-to guides",
    d: "Deal analyzer, pipeline, calls, automations, and reports — step by step.",
    link: "/features",
  },
  {
    icon: LifeBuoy,
    t: "Contact support",
    d: "Talk to a human when you're stuck.",
    link: "/contact",
  },
  {
    icon: Bug,
    t: "Report a bug",
    d: "Tell us what broke and we'll investigate.",
    link: "/contact",
  },
  { icon: Lightbulb, t: "Request a feature", d: "Shape the roadmap.", link: "/contact" },
];

function Help() {
  return (
    <MarketingLayout>
      <section className="mx-auto max-w-4xl px-4 py-16">
        <h1 className="text-4xl font-bold">Help center</h1>
        <p className="mt-3 text-muted-foreground">
          Guides, support, and everything you need to get the most out of Boliviq.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {cards.map((c) => (
            <Link key={c.t} to={c.link}>
              <Card className="h-full transition hover:border-primary">
                <CardContent className="p-6">
                  <c.icon className="h-6 w-6 text-success" />
                  <div className="mt-3 font-semibold">{c.t}</div>
                  <p className="mt-1 text-sm text-muted-foreground">{c.d}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <Card className="mt-10">
          <CardContent className="p-6">
            <div className="font-semibold">Onboarding checklist</div>
            <ol className="mt-3 space-y-2 text-sm text-muted-foreground list-decimal pl-5">
              <li>Create your account.</li>
              <li>Complete the onboarding wizard (buy box, markets, strategies).</li>
              <li>Add or import your first properties.</li>
              <li>Run your first deal analysis and view the deal score.</li>
              <li>Create a lead and move it through the pipeline.</li>
              <li>Prepare a call script and log a call summary.</li>
              <li>Generate a deal report.</li>
              <li>Set up an automation for follow-ups.</li>
            </ol>
          </CardContent>
        </Card>
      </section>
    </MarketingLayout>
  );
}
