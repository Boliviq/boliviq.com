import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, Wallet } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  AI_AGENTS,
  AI_FORBIDDEN_ACTIONS,
  APPRAISAL_ESTIMATE_NOTICE,
  LEGAL_ADVICE_NOTICE,
  LENDING_DECISION_NOTICE,
  getProfileRole,
} from "@/lib/canons";
import { CREDIT_WALLET_SEED } from "@/lib/platform-seed";
import { useCurrentUser } from "@/hooks/use-current-user";
import { supabase } from "@/integrations/supabase/client";
import { isMissingRelation } from "@/lib/supabase-safe";

export const Route = createFileRoute("/_authenticated/assistant")({
  component: AssistantPage,
});

function AssistantPage() {
  const { primaryRole, userId } = useCurrentUser();
  const role = getProfileRole(primaryRole);
  const [prompt, setPrompt] = useState("");
  const [log, setLog] = useState<{ role: "user" | "assistant"; text: string }[]>([
    {
      role: "assistant",
      text: `I understand you as a ${role.label}. I can search Boliviq, draft listings and messages, summarize conversations, create tasks, analyze properties, estimate repairs, and organize documents — only with data you are authorized to see.`,
    },
  ]);

  const wallet = useQuery({
    queryKey: ["credit-wallet", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await (supabase.from("credit_wallets") as any).select("*").limit(1).maybeSingle();
      if (error) {
        if (isMissingRelation(error)) return CREDIT_WALLET_SEED;
        throw error;
      }
      if (!data) return CREDIT_WALLET_SEED;
      return { ...CREDIT_WALLET_SEED, balance: Number(data.balance ?? CREDIT_WALLET_SEED.balance) };
    },
  });

  const suggestions = useMemo(() => {
    switch (role.id) {
      case "homeowner":
        return ["Turn my kitchen photos into a repair request", "Compare the three contractor estimates on Oak Street", "Draft a message to Ford Build approving the scope"];
      case "contractor":
      case "trade":
        return ["Draft a scope of work from the Oak Street photos", "Estimate labor and materials for a 200A panel upgrade", "Summarize unread project messages"];
      case "realtor":
        return ["Prepare a CMA workspace for 412 Oak Street", "Draft a listing appointment checklist", "Find off-market opportunities in Austin — do not label them MLS"];
      case "wholesaler":
        return ["Build a deal package for 88 Riverside", "Match this property to buyer criteria", "Show the wholesale compliance notice for Texas"];
      case "lender":
        return ["List missing conditions on Riverside", "Summarize the borrower document checklist", "Remind me Boliviq does not make lending decisions"];
      default:
        return ["Analyze 88 Riverside as a flip — label the result as an estimate", "What is missing on the Maple due-diligence file?", "Recommend the next pipeline step for Oak Street"];
    }
  }, [role.id]);

  const ask = (text: string) => {
    const q = text.trim();
    if (!q) return;
    const reply = [
      `Draft for a ${role.label}: ${q}`,
      "",
      "I will not send this message, publish a listing, sign anything, move money, or delete records unless you confirm or an approved automation is in place.",
      APPRAISAL_ESTIMATE_NOTICE,
      role.id === "lender" ? LENDING_DECISION_NOTICE : LEGAL_ADVICE_NOTICE,
      "Credits: this preview does not charge the workspace wallet.",
    ].join("\n");
    setLog((prev) => [...prev, { role: "user", text: q }, { role: "assistant", text: reply }]);
    setPrompt("");
    toast.message("Assistant reply generated", { description: "No autonomous side effects." });
  };

  const credits = wallet.data ?? CREDIT_WALLET_SEED;

  return (
    <>
      <PageHeader
        title="Boliviq AI assistant"
        description="Role-aware help across listings, messages, properties, projects, and documents. Specialized agents share the workspace credit wallet."
      />
      <div className="grid gap-4 p-4 sm:p-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-4 p-5">
              <div className="space-y-3">
                {log.map((m, i) => (
                  <div key={i} className={`rounded-xl border p-3 text-sm ${m.role === "assistant" ? "bg-[#70bf2b]/5 border-[#70bf2b]/30" : "bg-white"}`}>
                    <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">{m.role === "assistant" ? "Assistant" : "You"}</div>
                    <div className="whitespace-pre-wrap">{m.text}</div>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <Button key={s} size="sm" variant="outline" onClick={() => ask(s)}>{s}</Button>
                ))}
              </div>
              <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} placeholder="Ask within your permissions…" />
              <Button onClick={() => ask(prompt)} className="gap-2 bg-[#70bf2b] hover:bg-[#80ce38]">
                <Sparkles className="h-4 w-4" /> Generate
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Specialized agents</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {AI_AGENTS.map((a) => (
                <div key={a.id} className="rounded-lg border p-3">
                  <div className="font-medium">{a.name}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{a.summary}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <Wallet className="h-4 w-4" />
              <CardTitle className="text-base">Credit wallet</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="font-display text-3xl font-bold">{credits.balance}</div>
              <div className="text-xs text-muted-foreground">Reserved {CREDIT_WALLET_SEED.reserved} · Monthly grant {CREDIT_WALLET_SEED.monthlyGrant}</div>
              <div className="space-y-1 pt-2">
                {CREDIT_WALLET_SEED.ledger.map((row) => (
                  <div key={row.id} className="flex justify-between text-xs">
                    <span className="truncate pr-2">{row.description}</span>
                    <span className={row.amount < 0 ? "text-destructive" : "text-success"}>{row.amount > 0 ? "+" : ""}{row.amount}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Alert>
            <AlertDescription className="text-xs space-y-2">
              <div className="font-semibold">Agents must not autonomously:</div>
              <ul className="list-disc space-y-1 pl-4">
                {AI_FORBIDDEN_ACTIONS.map((a) => <li key={a}>{a}</li>)}
              </ul>
            </AlertDescription>
          </Alert>
          <Badge variant="outline">{role.label} context</Badge>
        </div>
      </div>
    </>
  );
}
