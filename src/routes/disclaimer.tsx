import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";

export const Route = createFileRoute("/disclaimer")({
  head: () => ({
    meta: [
      { title: "AI & Investment Disclaimer — Boliviq" },
      {
        name: "description",
        content: "Important disclaimers about AI outputs and investment estimates.",
      },
    ],
  }),
  component: () => (
    <LegalPage title="AI & Investment Disclaimer" updated="July 2026">
      <h2>Not financial advice</h2>
      <p>
        Boliviq is a software tool. It is not a broker, lender, appraiser, attorney, accountant, or
        financial advisor. Outputs are estimates only.
      </p>
      <h2>AI outputs may be wrong</h2>
      <p>
        AI-generated scripts, summaries, deal scores, and recommendations may contain errors. Always
        review before acting.
      </p>
      <h2>Independent verification</h2>
      <p>
        Every estimate — ARV, rehab, cash flow, MAO — must be independently verified with licensed
        professionals and current market data.
      </p>
      <h2>No guaranteed results</h2>
      <p>
        Real estate investment carries risk of loss. Boliviq does not guarantee any investment
        outcome, profit, or return.
      </p>
      <h2>External data</h2>
      <p>
        Access to MLS, county records, and third-party data requires authorized integrations and
        licensing you supply.
      </p>
      <h2>Communications compliance</h2>
      <p>
        You are responsible for TCPA, DNC, CAN-SPAM, GDPR, and all applicable communications laws in
        your jurisdiction.
      </p>
    </LegalPage>
  ),
});
