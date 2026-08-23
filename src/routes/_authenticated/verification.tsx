import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VerificationBadge } from "@/components/verification-badge";
import { VERIFICATION_DISCLAIMER, VERIFICATION_TIERS } from "@/lib/canons";
import { useWorkspace } from "@/hooks/use-workspace";
import { useStartVerification, useVerifications } from "@/hooks/use-workspace-data";

export const Route = createFileRoute("/_authenticated/verification")({
  component: VerificationPage,
});

const STEPS: Record<string, string[]> = {
  identity: [
    "Upload a government ID",
    "Confirm email and mobile number",
    "Match name to your Boliviq profile",
  ],
  license: [
    "Enter license number and jurisdiction",
    "Upload a current license image",
    "Admin review in the Intelligence Center",
  ],
  insurance: [
    "Upload certificate of insurance",
    "Record expiration date",
    "Admin confirms coverage is current",
  ],
  boliviq_certified: [
    "Complete Boliviq projects with reviews",
    "Maintain identity, license, and insurance",
    "Pass complaint-status review",
  ],
  unverified: [
    "Start with identity verification",
    "Professionals should add license and insurance",
    "Badges appear on your directory profile",
  ],
};

function VerificationPage() {
  const { userId } = useWorkspace();
  const { data: startedTiers = [] } = useVerifications();
  const startVerification = useStartVerification();
  const started = new Set(startedTiers);

  return (
    <>
      <PageHeader
        title="Trust & verification"
        description="Identity, license, insurance, and Boliviq certified are distinct tiers. Unverified profiles remain visible but unlabeled."
      />
      <div className="space-y-4 p-4 sm:p-8">
        <Alert>
          <AlertDescription>{VERIFICATION_DISCLAIMER}</AlertDescription>
        </Alert>

        <div className="grid gap-4 md:grid-cols-2">
          {VERIFICATION_TIERS.map((tier) => {
            const inReview = started.has(tier.id);
            return (
              <Card key={tier.id}>
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <CardTitle className="text-base">{tier.label}</CardTitle>
                  <VerificationBadge tier={tier.id} />
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p className="text-muted-foreground">{tier.description}</p>
                  <ul className="space-y-2">
                    {(STEPS[tier.id] ?? []).map((s) => (
                      <li key={s} className="flex items-start gap-2">
                        <CheckCircle2
                          className={`mt-0.5 h-4 w-4 shrink-0 ${inReview ? "text-[#70bf2b]" : "text-muted-foreground"}`}
                        />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                  {tier.id !== "unverified" && (
                    <Button
                      size="sm"
                      variant={inReview ? "secondary" : "outline"}
                      disabled={tier.id === "boliviq_certified" || inReview}
                      onClick={() => {
                        if (!userId) {
                          toast.error("Sign in to start verification");
                          return;
                        }
                        startVerification.mutate(tier.id, {
                          onSuccess: () =>
                            toast.success(`${tier.label} submitted for review`, {
                              description:
                                "Administrators record every decision in the audit log. Badges never imply Boliviq guarantees services.",
                            }),
                          onError: (e) =>
                            toast.error(
                              e instanceof Error ? e.message : "Could not start verification",
                            ),
                        });
                      }}
                    >
                      {tier.id === "boliviq_certified"
                        ? "Earned through completed work"
                        : inReview
                          ? "In review"
                          : "Start this verification"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5 text-sm">
            <div>
              Administrators review licenses and insurance in the Intelligence Center. Every
              decision is written to the audit log.
            </div>
            <div className="flex gap-2">
              <Link to="/professionals">
                <Button size="sm" variant="outline">
                  Directory
                </Button>
              </Link>
              <Link to="/admin">
                <Button size="sm">Admin review</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
