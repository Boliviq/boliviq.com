import { createFileRoute } from "@tanstack/react-router";
import { MarketingLayout } from "@/components/marketing-layout";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Boliviq" },
      { name: "description", content: "Boliviq is an AI-powered platform built to help real estate investors make more informed decisions." },
      { property: "og:title", content: "About — Boliviq" },
      { property: "og:description", content: "AI That Builds Better Investors." },
    ],
  }),
  component: About,
});

function About() {
  return (
    <MarketingLayout>
      <section className="mx-auto max-w-3xl px-4 py-20">
        <h1 className="text-4xl font-bold sm:text-5xl">AI That Builds Better Investors.</h1>
        <p className="mt-6 text-lg text-muted-foreground">
          Boliviq is an AI-powered platform built to help real estate investors make more
          informed decisions by organizing leads, analyzing opportunities, preparing offers,
          and streamlining acquisition workflows.
        </p>
        <h2 className="mt-12 text-2xl font-semibold">Our mission</h2>
        <p className="mt-3 text-muted-foreground">
          Our mission is simple: <strong>AI That Builds Better Investors.</strong>
        </p>
        <p className="mt-4 text-muted-foreground">
          We believe technology should help investors spend less time managing information
          and more time evaluating opportunities and making informed decisions.
        </p>
        <p className="mt-10 text-xs text-muted-foreground">Powered by Boliviq AI</p>
      </section>
    </MarketingLayout>
  );
}
