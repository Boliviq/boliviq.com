import { createFileRoute } from "@tanstack/react-router";
import { MarketingLayout } from "@/components/marketing-layout";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — Boliviq" },
      {
        name: "description",
        content:
          "Answers to common questions about integrations, MLS, AI calls, ARV, teams, and pricing.",
      },
      { property: "og:title", content: "FAQ — Boliviq" },
      { property: "og:description", content: "Common questions about Boliviq." },
    ],
  }),
  component: Faq,
});

const faqs: [string, string][] = [
  [
    "Is this connected to DealMachine?",
    "Not by default. DealMachine integration would require an authorized API partnership. We show 'Connect' or 'Coming Soon' for any integration that isn't live in your account.",
  ],
  [
    "Is this connected to InvestorLift?",
    "Not by default. We can build a connector if InvestorLift provides API access for your account. Until connected, it appears as 'Coming Soon'.",
  ],
  [
    "Can it access MLS data?",
    "Only through authorized MLS integrations or a licensed IDX/RETS feed you provide. MLS access is restricted by each local board — Boliviq never scrapes MLS.",
  ],
  [
    "Can it place AI phone calls?",
    "The Call Assistant prepares scripts, notes, and summaries. Placing outbound AI calls requires an approved telephony provider and full compliance with TCPA, state consent laws, and DNC rules — we do not auto-dial until that is configured and reviewed.",
  ],
  [
    "Does it estimate ARV?",
    "Yes. The Deal Analyzer estimates ARV based on the comparables and assumptions you provide. All numbers are estimates and must be independently verified before making an offer.",
  ],
  [
    "Can teams use it?",
    "Yes — the Team plan supports shared pipelines, assignments, and role-based permissions.",
  ],
  [
    "Is there a free plan?",
    "Yes. The Free plan supports up to 10 properties, basic calculators, and manual lead entry.",
  ],
  [
    "Is financial or investment performance guaranteed?",
    "No. Boliviq produces estimates and recommendations only. Real estate investing carries risk and Boliviq does not guarantee profits or outcomes.",
  ],
];

function Faq() {
  return (
    <MarketingLayout>
      <section className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-4xl font-bold">Frequently asked questions</h1>
        <p className="mt-3 text-muted-foreground">
          External platforms and data sources (like MLS, DealMachine, InvestorLift) require
          authorized integrations or APIs. Anything not yet connected in your account will show as
          "Connect" or "Coming Soon."
        </p>
        <Accordion type="single" collapsible className="mt-8">
          {faqs.map(([q, a], i) => (
            <AccordionItem key={i} value={`item-${i}`}>
              <AccordionTrigger className="text-left">{q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </MarketingLayout>
  );
}
