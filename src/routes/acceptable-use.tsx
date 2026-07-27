import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";

export const Route = createFileRoute("/acceptable-use")({
  head: () => ({ meta: [{ title: "Acceptable Use Policy — Boliviq" }, { name: "description", content: "Rules for using Boliviq." }] }),
  component: () => (
    <LegalPage title="Acceptable Use Policy" updated="July 2026">
      <p>You agree not to use Boliviq to:</p>
      <ul>
        <li>Violate applicable laws, including TCPA, DNC, GDPR, CAN-SPAM, fair housing, or consumer protection laws.</li>
        <li>Send unsolicited communications to individuals who have not consented.</li>
        <li>Scrape or ingest MLS or other licensed datasets without authorization.</li>
        <li>Discriminate against protected classes in property acquisition or marketing.</li>
        <li>Attempt to reverse-engineer, disrupt, or overload the service.</li>
        <li>Resell or sublicense the service without a written agreement.</li>
      </ul>
      <p>Violations may result in suspension or termination.</p>
    </LegalPage>
  ),
});
