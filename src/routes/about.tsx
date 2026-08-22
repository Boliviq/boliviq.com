import { createFileRoute } from "@tanstack/react-router";
import { MarketingLayout } from "@/components/marketing-layout";
import { LIFECYCLE, PROFILE_ROLES } from "@/lib/canons";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Boliviq" },
      {
        name: "description",
        content:
          "Boliviq is an AI-powered real estate, construction, investing, and professional-services ecosystem.",
      },
      { property: "og:title", content: "About — Boliviq" },
      {
        property: "og:description",
        content: "One operating system for the entire lifecycle of real estate.",
      },
    ],
  }),
  component: About,
});

function About() {
  return (
    <MarketingLayout>
      <section className="mx-auto max-w-3xl px-4 py-20">
        <h1 className="text-4xl font-bold sm:text-5xl">
          One operating system for real estate and construction.
        </h1>
        <p className="mt-6 text-lg text-muted-foreground">
          Boliviq brings homeowners, contractors, realtors, investors, wholesalers, lenders,
          property managers, inspectors, appraisers, title companies, insurance providers,
          attorneys, suppliers, and other industry professionals into one connected platform.
        </p>
        <h2 className="mt-12 text-2xl font-semibold">The lifecycle</h2>
        <ol className="mt-4 space-y-3 text-muted-foreground">
          {LIFECYCLE.map((s) => (
            <li key={s.id}>
              <strong className="text-foreground">{s.label}.</strong> {s.detail}
            </li>
          ))}
        </ol>
        <h2 className="mt-12 text-2xl font-semibold">Who it is for</h2>
        <p className="mt-3 text-muted-foreground">
          {PROFILE_ROLES.filter((r) => r.id !== "administrator")
            .map((r) => r.label)
            .join(", ")}
          .
        </p>
        <p className="mt-4 text-muted-foreground">
          A homeowner&apos;s repair post can become a contractor lead. A contractor&apos;s estimate
          can become a project. An investor&apos;s analysis can become an offer. An accepted offer
          can become a transaction. A completed renovation can become a new listing or rental record
          — without exposing information to anyone who does not have permission to see it.
        </p>
        <p className="mt-10 text-xs text-muted-foreground">
          Powered by Boliviq AI. Estimates are not licensed appraisals. Boliviq AI is not an
          attorney and does not make lending decisions.
        </p>
      </section>
    </MarketingLayout>
  );
}
