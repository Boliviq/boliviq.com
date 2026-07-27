import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingLayout } from "@/components/marketing-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: [
      { title: "Demo — Boliviq" },
      { name: "description", content: "See Boliviq in action. Sign up free and load sample properties." },
      { property: "og:title", content: "Demo — Boliviq" },
      { property: "og:description", content: "Explore the workspace with sample properties, leads, and pipeline." },
    ],
  }),
  component: Demo,
});

const highlights = [
  "Sample properties across single-family, multi-family, and BRRRR opportunities",
  "Pre-scored deals so you can see how ranking works",
  "Populated leads, pipeline stages, and call summaries",
  "One-click removal of demo data when you're done exploring",
];

function Demo() {
  return (
    <MarketingLayout>
      <section className="mx-auto max-w-4xl px-4 py-16">
        <h1 className="text-4xl font-bold sm:text-5xl">See Boliviq in action</h1>
        <p className="mt-4 text-muted-foreground">
          Create a free account and click "Load sample data" on any page to explore a fully-populated workspace. Remove the demo data anytime from Settings.
        </p>
        <Card className="mt-8">
          <CardContent className="p-6">
            <ul className="space-y-3">
              {highlights.map((h) => (
                <li key={h} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" /> {h}
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/auth"><Button size="lg">Start free</Button></Link>
              <Link to="/contact"><Button size="lg" variant="outline">Request a live walkthrough</Button></Link>
            </div>
          </CardContent>
        </Card>
        <p className="mt-6 text-xs text-muted-foreground">
          Live scheduled walkthroughs are handled by our team after your request comes in.
        </p>
      </section>
    </MarketingLayout>
  );
}
