import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";

export const Route = createFileRoute("/cookies")({
  head: () => ({
    meta: [
      { title: "Cookie Notice — Boliviq" },
      { name: "description", content: "How Boliviq uses cookies." },
    ],
  }),
  component: () => (
    <LegalPage title="Cookie Notice" updated="July 2026">
      <h2>Essential cookies</h2>
      <p>Used for authentication and session security. Required for the service to work.</p>
      <h2>Analytics cookies</h2>
      <p>
        Used to understand feature usage and improve the product. You can opt out via your browser
        settings.
      </p>
      <h2>No advertising cookies</h2>
      <p>We do not use third-party advertising cookies.</p>
    </LegalPage>
  ),
});
