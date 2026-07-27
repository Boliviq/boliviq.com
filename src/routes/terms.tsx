import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";

export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [{ title: "Terms of Service — Boliviq" }, { name: "description", content: "Terms governing use of Boliviq." }] }),
  component: () => (
    <LegalPage title="Terms of Service" updated="July 2026">
      <h2>1. Acceptance</h2>
      <p>By using Boliviq you agree to these Terms. If you don't agree, don't use the service.</p>
      <h2>2. Service description</h2>
      <p>Boliviq is a software platform for organizing real estate leads and producing analytical estimates. It is not a broker, lender, appraiser, or financial advisor.</p>
      <h2>3. No guaranteed results</h2>
      <p>Boliviq does not guarantee investment profits. All estimates must be independently verified.</p>
      <h2>4. Your responsibilities</h2>
      <ul>
        <li>You are responsible for the accuracy of data you enter.</li>
        <li>You are responsible for lawful communications with any leads or contacts (TCPA, DNC, GDPR, CAN-SPAM, and local regulations).</li>
        <li>You are responsible for your integrations and authorized use of third-party data.</li>
      </ul>
      <h2>5. Subscriptions and billing</h2>
      <p>Paid plans are billed monthly or annually. Cancel anytime; access continues through the paid period.</p>
      <h2>6. Termination</h2>
      <p>We may suspend or terminate accounts that violate these Terms or the Acceptable Use Policy.</p>
      <h2>7. Limitation of liability</h2>
      <p>To the maximum extent permitted by law, Boliviq is provided "as is" without warranties. Our liability is limited to fees paid in the prior 12 months.</p>
      <h2>8. Contact</h2>
      <p>Questions? Use the Contact page.</p>
    </LegalPage>
  ),
});
