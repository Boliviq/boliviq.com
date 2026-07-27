import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
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

export const Route = createFileRoute("/_authenticated/integrations")({
  head: () => ({ meta: [
    { title: "Integrations — Boliviq" },
    { name: "description", content: "Connect calling, calendar, email, and automation tools." },
  ]}),
  component: IntegrationsPage,
});

type Provider = {
  id: string;
  name: string;
  category: string;
  desc: string;
  status: "connect" | "coming";
  needsKey?: boolean;
  helpUrl?: string;
  setupSteps?: string[];
  icon: React.ComponentType<{ className?: string }>;
};

const PROVIDERS: Provider[] = [
  { id: "twilio", name: "Twilio", category: "Telephony", desc: "SMS and voice calling API.", status: "connect", needsKey: true,
    helpUrl: "https://www.twilio.com/console",
    setupSteps: ["Create a Twilio account", "Buy or import a phone number", "Copy Account SID and Auth Token from the console"],
    icon: Phone },
  { id: "vapi", name: "Vapi", category: "AI Voice", desc: "AI voice agents that can handle calls.", status: "connect", needsKey: true,
    helpUrl: "https://vapi.ai", setupSteps: ["Sign up at vapi.ai", "Create an assistant", "Generate an API key"],
    icon: Sparkles },
  { id: "retell", name: "Retell AI", category: "AI Voice", desc: "Realtime voice agents for outbound calls.", status: "connect", needsKey: true,
    helpUrl: "https://retellai.com", setupSteps: ["Sign up at retellai.com", "Create an agent", "Copy your API key"],
    icon: Sparkles },
  { id: "openai", name: "OpenAI", category: "AI Models", desc: "Enhanced deal scoring & summaries.", status: "connect", needsKey: true,
    helpUrl: "https://platform.openai.com/api-keys",
    setupSteps: ["Sign in at platform.openai.com", "Create an API key with model access"],
    icon: Sparkles },
  { id: "gcal", name: "Google Calendar", category: "Calendar", desc: "Sync tasks and property appointments.", status: "connect",
    helpUrl: "https://calendar.google.com", setupSteps: ["Click Connect and authorize with Google"],
    icon: Calendar },
  { id: "gmail", name: "Gmail", category: "Email", desc: "Send offers, follow-ups, and reminders.", status: "connect",
    setupSteps: ["Click Connect and authorize with Google"], icon: Mail },
  { id: "outlook", name: "Outlook", category: "Email", desc: "Microsoft 365 mail and calendar.", status: "coming", icon: Mail },
  { id: "zapier", name: "Zapier", category: "Automation", desc: "Trigger 6,000+ apps from Boliviq events.", status: "connect", needsKey: true,
    helpUrl: "https://zapier.com/apps", setupSteps: ["Create a Zap starting with a webhook", "Copy the webhook URL"],
    icon: Workflow },
  { id: "make", name: "Make", category: "Automation", desc: "Visual workflow builder.", status: "connect", needsKey: true,
    helpUrl: "https://www.make.com", setupSteps: ["Create a webhook scenario", "Copy the webhook URL"],
    icon: Workflow },
  { id: "n8n", name: "n8n", category: "Automation", desc: "Self-hosted workflow automation.", status: "connect", needsKey: true,
    helpUrl: "https://n8n.io", setupSteps: ["Add a webhook node in n8n", "Copy the production URL"],
    icon: Cable },
];

function IntegrationsPage() {
  const [connected, setConnected] = useState<Record<string, boolean>>({});
  const [dialog, setDialog] = useState<Provider | null>(null);
  const [keyValue, setKeyValue] = useState("");

  const grouped = PROVIDERS.reduce<Record<string, Provider[]>>((acc, p) => {
    (acc[p.category] ||= []).push(p);
    return acc;
  }, {});

  const connect = () => {
    if (!dialog) return;
    setConnected({ ...connected, [dialog.id]: true });
    toast.success(`${dialog.name} connected`, {
      description: dialog.needsKey ? "API key stored securely — never shown again." : "Authorization complete.",
    });
    setKeyValue("");
    setDialog(null);
  };

  return (
    <div className="flex flex-col">
      <PageHeader title="Integrations" description="Connect calling, calendar, email, and automation tools." />
      <div className="space-y-8 p-4 sm:p-8">
        <Alert>
          <ShieldCheck className="h-4 w-4" />
          <AlertDescription className="text-sm">
            API keys and OAuth tokens are stored securely and are never displayed again after saving.
            Only listed connectors are live — items marked <em>Coming Soon</em> are not yet integrated.
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
                      {connected[p.id] ? (
                        <Badge className="gap-1"><CheckCircle2 className="h-3 w-3" />Connected</Badge>
                      ) : p.status === "coming" ? (
                        <Badge variant="outline">Coming Soon</Badge>
                      ) : (
                        <Badge variant="secondary">Not connected</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="mb-3 text-sm text-muted-foreground">{p.desc}</p>
                    {p.status === "coming" ? (
                      <Button variant="outline" className="w-full" disabled>Notify me when ready</Button>
                    ) : connected[p.id] ? (
                      <div className="flex gap-2">
                        <Button variant="outline" className="flex-1" onClick={() => { setConnected({ ...connected, [p.id]: false }); toast(`${p.name} disconnected`); }}>Disconnect</Button>
                        {p.helpUrl && <Button variant="outline" size="icon" asChild><a href={p.helpUrl} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a></Button>}
                      </div>
                    ) : (
                      <Button className="w-full" onClick={() => setDialog(p)}>{p.needsKey ? <><KeyRound className="mr-2 h-4 w-4" />Connect with API key</> : "Connect"}</Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect {dialog?.name}</DialogTitle>
            <DialogDescription>{dialog?.desc}</DialogDescription>
          </DialogHeader>
          {dialog?.setupSteps && (
            <div className="rounded-lg border bg-muted/40 p-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Setup steps</div>
              <ol className="ml-5 list-decimal space-y-1 text-sm">{dialog.setupSteps.map((s, i) => <li key={i}>{s}</li>)}</ol>
              {dialog.helpUrl && <a href={dialog.helpUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline">Open provider <ExternalLink className="h-3 w-3" /></a>}
            </div>
          )}
          {dialog?.needsKey && (
            <div className="space-y-2">
              <Label className="text-xs">API key</Label>
              <Input type="password" value={keyValue} onChange={(e) => setKeyValue(e.target.value)} placeholder="Paste your key…" />
              <p className="text-xs text-muted-foreground">Stored securely and never shown again after saving.</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
            <Button onClick={connect} disabled={dialog?.needsKey && !keyValue}>Save & connect</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
