import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { BookOpen, Bug, Lightbulb, LifeBuoy, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/support")({
  component: HelpCenter,
});

const checklist = [
  "Complete onboarding (buy box, markets, strategies)",
  "Add or import your first property",
  "Run your first deal analysis",
  "Create a lead",
  "Move a lead through the pipeline",
  "Prepare a call script",
  "Log a call summary",
  "Generate a deal report",
  "Set up an automation",
];

function HelpCenter() {
  const [done, setDone] = useState<Record<string, boolean>>({});
  const progress = Object.values(done).filter(Boolean).length;

  return (
    <>
      <PageHeader
        title="Help & support"
        description="Guides, support, and how to get the most out of Boliviq."
      />
      <div className="p-4 sm:p-8">
        <Tabs defaultValue="checklist">
          <TabsList className="flex flex-wrap">
            <TabsTrigger value="checklist">
              <CheckCircle2 className="mr-1 h-4 w-4" />
              Onboarding
            </TabsTrigger>
            <TabsTrigger value="guides">
              <BookOpen className="mr-1 h-4 w-4" />
              Guides
            </TabsTrigger>
            <TabsTrigger value="support">
              <LifeBuoy className="mr-1 h-4 w-4" />
              Contact support
            </TabsTrigger>
            <TabsTrigger value="bug">
              <Bug className="mr-1 h-4 w-4" />
              Report a bug
            </TabsTrigger>
            <TabsTrigger value="feature">
              <Lightbulb className="mr-1 h-4 w-4" />
              Feature request
            </TabsTrigger>
          </TabsList>

          <TabsContent value="checklist" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Onboarding checklist</CardTitle>
                <div className="text-sm text-muted-foreground">
                  {progress} of {checklist.length} complete
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {checklist.map((item) => (
                  <label
                    key={item}
                    className="flex items-start gap-3 rounded-md border p-3 hover:bg-muted/40 cursor-pointer"
                  >
                    <Checkbox
                      checked={!!done[item]}
                      onCheckedChange={(c) => setDone((d) => ({ ...d, [item]: !!c }))}
                      className="mt-0.5"
                    />
                    <span className={done[item] ? "line-through text-muted-foreground" : ""}>
                      {item}
                    </span>
                  </label>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="guides" className="mt-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Guide
                title="Getting started"
                desc="Set up your workspace, add your first property, and run your first analysis."
              />
              <Guide
                title="Deal Analyzer walkthrough"
                desc="Every input, every formula, every score."
              />
              <Guide
                title="Building your pipeline"
                desc="Stages, assignments, and how leads flow."
              />
              <Guide title="Call Assistant" desc="Scripts, prep notes, and post-call summaries." />
              <Guide title="Automations" desc="Rules for tasks, alerts, and follow-ups." />
              <Guide title="Reports" desc="Print-ready deal packages for partners and lenders." />
            </div>
          </TabsContent>

          <TabsContent value="support" className="mt-4">
            <SupportForm kind="Support request" />
          </TabsContent>
          <TabsContent value="bug" className="mt-4">
            <SupportForm kind="Bug report" />
          </TabsContent>
          <TabsContent value="feature" className="mt-4">
            <SupportForm kind="Feature request" />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

function Guide({ title, desc }: { title: string; desc: string }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="font-semibold">{title}</div>
        <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
        <Button
          variant="ghost"
          size="sm"
          className="mt-3 px-0"
          onClick={() => toast.info("Full guide coming soon.")}
        >
          Read guide →
        </Button>
      </CardContent>
    </Card>
  );
}

function SupportForm({ kind }: { kind: string }) {
  const [sent, setSent] = useState(false);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{kind}</CardTitle>
      </CardHeader>
      <CardContent>
        {sent ? (
          <div className="py-6 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-success" />
            <div className="mt-2 font-semibold">Thanks — we got it.</div>
            <p className="mt-1 text-sm text-muted-foreground">We'll follow up by email shortly.</p>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSent(true);
              toast.success(`${kind} submitted`);
            }}
            className="space-y-3"
          >
            <div>
              <Label>Subject</Label>
              <Input required maxLength={140} />
            </div>
            <div>
              <Label>Details</Label>
              <Textarea required rows={6} maxLength={4000} />
            </div>
            <Button type="submit">Send</Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
