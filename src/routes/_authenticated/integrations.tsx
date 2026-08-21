import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Phone, Sparkles, Mail, Calendar, Workflow, Cable,
  CheckCircle2, ExternalLink, KeyRound, ShieldCheck,
} from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { listIntegrations, saveIntegration, disconnectIntegration } from "@/lib/integrations.functions";
import { useCurrentUser } from "@/hooks/use-current-user";

export const Route = createFileRoute("/_authenticated/integrations")({
  head: () => ({ meta: [
    { title: "Integrations — Boliviq" },
    { name: "description", content: "Connect calling, calendar, email, and automation tools." },
  ]}),
  component: IntegrationsPage,
});

type Provider = {
  id: "openai" | "twilio" | "vapi" | "retell" | "zapier" | "make" | "n8n";
  name: string;
  category: string;
  desc: string;
  needsKey?: boolean;
  helpUrl?: string;
  setupSteps?: string[];
  keyHint?: string;
  icon: React.ComponentType<{ className?: string }>;
};

const PROVIDERS: Provider[] = [
  { id: "openai", name: "OpenAI", category: "AI Models", desc: "Call summaries, scripts, and deal memos.", needsKey: true,
    helpUrl: "https://platform.openai.com/api-keys",
    setupSteps: ["Sign in at platform.openai.com", "Create an API key with model access"],
    keyHint: "sk-...", icon: Sparkles },
  { id: "twilio", name: "Twilio", category: "Telephony", desc: "SMS and voice API credentials (stored for outbound tools).", needsKey: true,
    helpUrl: "https://www.twilio.com/console",
    setupSteps: ["Copy Account SID and Auth Token", "Paste as AccountSID:AuthToken"],
    keyHint: "ACxxx:auth_token", icon: Phone },
  { id: "vapi", name: "Vapi", category: "AI Voice", desc: "AI voice agents. Key is verified against the Vapi API.", needsKey: true,
    helpUrl: "https://vapi.ai", setupSteps: ["Create an assistant", "Generate an API key"], icon: Sparkles },
  { id: "retell", name: "Retell AI", category: "AI Voice", desc: "Realtime voice agents. Key is verified against Retell.", needsKey: true,
    helpUrl: "https://retellai.com", setupSteps: ["Create an agent", "Copy your API key"], icon: Sparkles },
  { id: "zapier", name: "Zapier", category: "Automation", desc: "Sends a test POST to your Catch Hook URL.", needsKey: true,
    helpUrl: "https://zapier.com/apps", setupSteps: ["Create a Zap starting with a webhook", "Paste the webhook URL"],
    keyHint: "https://hooks.zapier.com/...", icon: Workflow },
  { id: "make", name: "Make", category: "Automation", desc: "Sends a test POST to your scenario webhook.", needsKey: true,
    helpUrl: "https://www.make.com", setupSteps: ["Create a webhook scenario", "Paste the webhook URL"],
    keyHint: "https://hook.eu1.make.com/...", icon: Workflow },
  { id: "n8n", name: "n8n", category: "Automation", desc: "Sends a test POST to your webhook node.", needsKey: true,
    helpUrl: "https://n8n.io", setupSteps: ["Add a webhook node", "Paste the production URL"],
    keyHint: "https://n8n.example.com/webhook/...", icon: Cable },
];

const OAUTH_SOON = [
  { id: "gcal", name: "Google Calendar", category: "Calendar", desc: "Requires a Google Cloud OAuth client with Calendar scope on the server.", icon: Calendar },
  { id: "gmail", name: "Gmail", category: "Email", desc: "Requires a Google Cloud OAuth client with Gmail send scope on the server.", icon: Mail },
];

function IntegrationsPage() {
  const { userId } = useCurrentUser();
  const qc = useQueryClient();
  const listFn = useServerFn(listIntegrations);
  const saveFn = useServerFn(saveIntegration);
  const disconnectFn = useServerFn(disconnectIntegration);
  const [dialog, setDialog] = useState<Provider | null>(null);
  const [keyValue, setKeyValue] = useState("");

  const { data: rows = [] } = useQuery({
    queryKey: ["integrations", userId],
    enabled: !!userId,
    queryFn: () => listFn({ data: {} }),
  });
  const connected = new Set((rows as any[]).filter((r) => r.status === "connected").map((r) => r.provider));

  const save = useMutation({
    mutationFn: async () => {
      if (!dialog) throw new Error("No provider");
      return saveFn({ data: { provider: dialog.id, apiKey: keyValue } });
    },
    onSuccess: (res) => {
      toast.success(`${dialog?.name} connected`, { description: res.detail });
      setDialog(null);
      setKeyValue("");
      qc.invalidateQueries({ queryKey: ["integrations"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not connect"),
  });

  const disconnect = useMutation({
    mutationFn: (provider: Provider["id"]) => disconnectFn({ data: { provider } }),
    onSuccess: () => {
      toast.success("Disconnected");
      qc.invalidateQueries({ queryKey: ["integrations"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not disconnect"),
  });

  const grouped = PROVIDERS.reduce<Record<string, Provider[]>>((acc, p) => {
    (acc[p.category] ||= []).push(p);
    return acc;
  }, {});

  return (
    <div className="flex flex-col">
      <PageHeader title="Integrations" description="API keys are stored on the server and never sent back to the browser." />
      <div className="space-y-8 p-4 sm:p-8">
        <Alert>
          <ShieldCheck className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Connect OpenAI to power call summaries, scripts, and deal memos. You can also set a platform-wide
            <code className="mx-1">OPENAI_API_KEY</code> environment variable. Keys are tested against the provider before saving.
          </AlertDescription>
        </Alert>

        {Object.entries(grouped).map(([cat, list]) => (
          <div key={cat}>
            <h2 className="mb-3 font-display text-lg font-bold">{cat}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((p) => (
                <Card key={p.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary"><p.icon className="h-5 w-5" /></div>
                        <div>
                          <CardTitle className="text-base">{p.name}</CardTitle>
                          <CardDescription className="text-xs">{p.category}</CardDescription>
                        </div>
                      </div>
                      {connected.has(p.id) ? (
                        <Badge className="gap-1"><CheckCircle2 className="h-3 w-3" />Connected</Badge>
                      ) : (
                        <Badge variant="secondary">Not connected</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="mb-3 text-sm text-muted-foreground">{p.desc}</p>
                    {connected.has(p.id) ? (
                      <div className="flex gap-2">
                        <Button variant="outline" className="flex-1" onClick={() => disconnect.mutate(p.id)}>Disconnect</Button>
                        {p.helpUrl && <Button variant="outline" size="icon" asChild><a href={p.helpUrl} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a></Button>}
                      </div>
                    ) : (
                      <Button className="w-full" onClick={() => setDialog(p)}><KeyRound className="mr-2 h-4 w-4" />Connect</Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}

        <div>
          <h2 className="mb-3 font-display text-lg font-bold">Google (platform OAuth)</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {OAUTH_SOON.map((p) => (
              <Card key={p.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-lg bg-muted text-muted-foreground"><p.icon className="h-5 w-5" /></div>
                    <div>
                      <CardTitle className="text-base">{p.name}</CardTitle>
                      <Badge variant="outline">Needs OAuth client</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{p.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect {dialog?.name}</DialogTitle>
            <DialogDescription>{dialog?.desc}</DialogDescription>
          </DialogHeader>
          {dialog?.setupSteps && (
            <ol className="ml-5 list-decimal space-y-1 text-sm">{dialog.setupSteps.map((s) => <li key={s}>{s}</li>)}</ol>
          )}
          <div className="space-y-2">
            <Label className="text-xs">API key or webhook URL</Label>
            <Input type="password" value={keyValue} onChange={(e) => setKeyValue(e.target.value)} placeholder={dialog?.keyHint ?? "Paste your key…"} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending || keyValue.trim().length < 8}>
              {save.isPending ? "Testing…" : "Test & save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
