import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: "Privacy Policy — Boliviq" }, { name: "description", content: "How Boliviq collects, uses, and protects your data." }] }),
  component: () => (
    <LegalPage title="Privacy Policy" updated="July 2026">
      <h2>Data we collect</h2>
      <ul>
        <li>Account data: name, email, hashed password.</li>
        <li>Workspace data: properties, leads, contacts, notes, calls, and tasks you create.</li>
        <li>Usage data: page views, feature interactions, and error diagnostics.</li>
      </ul>
      <h2>How we use it</h2>
      <p>To operate the service, improve features, provide support, and communicate about your account.</p>
      <h2>Sharing</h2>
      <p>We do not sell your data. We share data only with vetted subprocessors necessary to run the service (hosting, email, analytics).</p>
      <h2>Your rights</h2>
      <p>You can access, export, or delete your data at any time from Settings, or by contacting us.</p>
      <h2>Security</h2>
      <p>Data is encrypted in transit and at rest. Access is restricted to authorized personnel.</p>
      <h2>Retention</h2>
      <p>Workspace data is kept while your account is active and deleted on request or 30 days after account closure.</p>
      <h2>Contact</h2>
      <p>Privacy questions: use the Contact page.</p>
    </LegalPage>
  ),
});
