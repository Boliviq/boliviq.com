import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAccessState, useSubmitAppeal } from "@/hooks/use-identity";

export const Route = createFileRoute("/_authenticated/suspended")({
  component: SuspendedPage,
});

function SuspendedPage() {
  const access = useAccessState();
  const appeal = useSubmitAppeal();
  const [note, setNote] = useState("");

  return (
    <>
      <PageHeader
        title="Account suspended"
        description="This workspace is restricted until an administrator reviews the case."
      />
      <div className="mx-auto max-w-xl space-y-4 p-4 sm:p-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Why this happened</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>{access.data?.suspensionReason || "No public reason was recorded."}</p>
            {access.data?.appealStatus && (
              <p className="text-muted-foreground">Appeal status: {access.data.appealStatus}</p>
            )}
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Explain why this account should be restored…"
              rows={5}
            />
            <Button
              disabled={note.trim().length < 8 || appeal.isPending}
              onClick={() =>
                appeal.mutate(note.trim(), {
                  onSuccess: () => {
                    setNote("");
                    toast.success("Appeal submitted");
                  },
                  onError: (e) => toast.error(e instanceof Error ? e.message : "Could not submit"),
                })
              }
            >
              Submit appeal
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
