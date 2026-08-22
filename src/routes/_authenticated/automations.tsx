import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Zap, Plus, Trash2, Play, Sparkles, Workflow } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";

export const Route = createFileRoute("/_authenticated/automations")({
  head: () => ({
    meta: [
      { title: "Automations — Boliviq" },
      {
        name: "description",
        content: "Trigger tasks, alerts, and follow-ups automatically as your pipeline moves.",
      },
    ],
  }),
  component: AutomationsPage,
});

const TRIGGERS = [
  { value: "lead_created", label: "New lead added" },
  { value: "score_over", label: "Deal score exceeds threshold" },
  { value: "call_completed", label: "Call completed" },
  { value: "offer_submitted", label: "Offer submitted" },
  { value: "no_activity", label: "No activity for N days" },
  { value: "price_changed", label: "Property price changes" },
];

const ACTIONS = [
  { value: "create_task", label: "Create a task" },
  { value: "mark_hot", label: "Mark property as hot" },
  { value: "notify_user", label: "Notify assigned user" },
  { value: "send_reminder", label: "Schedule a reminder" },
  { value: "add_tag", label: "Add tag" },
];

const RECIPES = [
  {
    name: "Research new leads",
    trigger: "lead_created",
    action: "create_task",
    action_config: { title: "Research property and pull comps" },
  },
  {
    name: "Flag hot deals",
    trigger: "score_over",
    condition: { threshold: 80 },
    action: "mark_hot",
    action_config: {},
  },
  {
    name: "Auto follow-up after calls",
    trigger: "call_completed",
    action: "create_task",
    action_config: { title: "Send follow-up recap email" },
  },
  {
    name: "Offer reminder",
    trigger: "offer_submitted",
    action: "send_reminder",
    action_config: { days: 3, message: "Check on offer status" },
  },
  {
    name: "Stale-lead nudge",
    trigger: "no_activity",
    condition: { days: 7 },
    action: "notify_user",
    action_config: {},
  },
  {
    name: "Price change alert",
    trigger: "price_changed",
    action: "notify_user",
    action_config: {},
  },
];

function AutomationsPage() {
  const { userId } = useCurrentUser();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const { data: automations = [] } = useQuery({
    queryKey: ["automations", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("automations")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async (a: any) => {
      if (!userId) throw new Error("No user");
      const payload = { ...a, user_id: userId };
      if (a.id) {
        const { error } = await supabase.from("automations").update(payload).eq("id", a.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("automations").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["automations"] });
      toast.success("Automation saved");
      setOpen(false);
      setEditing(null);
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("automations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["automations"] });
      toast.success("Deleted");
    },
  });

  const toggle = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase.from("automations").update({ enabled }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automations"] }),
  });

  const applyRecipe = (r: (typeof RECIPES)[number]) => {
    setEditing({
      name: r.name,
      trigger_type: r.trigger,
      action_type: r.action,
      condition: r.condition ?? {},
      action_config: r.action_config,
      enabled: true,
    });
    setOpen(true);
  };

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Automations"
        description="Fire tasks, alerts, and follow-ups automatically as your pipeline moves."
        action={
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            New automation
          </Button>
        }
      />
      <div className="space-y-6 p-4 sm:p-8">
        <Alert>
          <Workflow className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Rules are saved and evaluated in-app. External triggers (Zapier, Make, n8n) can be
            enabled via Integrations to extend automations to your other tools.
          </AlertDescription>
        </Alert>

        {/* Recipes */}
        <div>
          <h2 className="mb-3 font-display text-lg font-bold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Recipes
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {RECIPES.map((r) => (
              <Card key={r.name}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{r.name}</CardTitle>
                  <CardDescription className="text-xs">
                    <strong>When</strong> {TRIGGERS.find((t) => t.value === r.trigger)?.label} →{" "}
                    <strong>then</strong> {ACTIONS.find((a) => a.value === r.action)?.label}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => applyRecipe(r)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Use recipe
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Rules */}
        <div>
          <h2 className="mb-3 font-display text-lg font-bold">Your automations</h2>
          {automations.length === 0 ? (
            <Card>
              <CardContent className="grid place-items-center gap-3 p-12 text-center">
                <Zap className="h-8 w-8 text-muted-foreground" />
                <div>
                  <div className="font-medium">No automations yet</div>
                  <div className="text-sm text-muted-foreground">
                    Start from a recipe above or build one from scratch.
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {automations.map((a: any) => (
                <Card key={a.id}>
                  <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-primary" />
                        <span className="font-semibold">{a.name}</span>
                        {a.enabled ? (
                          <Badge>Active</Badge>
                        ) : (
                          <Badge variant="outline">Paused</Badge>
                        )}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        When{" "}
                        <strong className="text-foreground">
                          {TRIGGERS.find((t) => t.value === a.trigger_type)?.label ??
                            a.trigger_type}
                        </strong>
                        {" → "}
                        <strong className="text-foreground">
                          {ACTIONS.find((x) => x.value === a.action_type)?.label ?? a.action_type}
                        </strong>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Ran {a.run_count ?? 0} time{a.run_count === 1 ? "" : "s"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={a.enabled}
                        onCheckedChange={(v) => toggle.mutate({ id: a.id, enabled: v })}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditing(a);
                          setOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() =>
                          toast("Test run queued", {
                            description: "Test execution is coming soon.",
                          })
                        }
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => del.mutate(a.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <AutomationDialog
        open={open}
        onOpenChange={setOpen}
        initial={editing}
        onSave={(a) => save.mutate(a)}
        saving={save.isPending}
      />
    </div>
  );
}

function AutomationDialog({
  open,
  onOpenChange,
  initial,
  onSave,
  saving,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial: any;
  onSave: (a: any) => void;
  saving: boolean;
}) {
  const emptyForm = {
    name: "",
    trigger_type: "lead_created",
    action_type: "create_task",
    condition: {},
    action_config: {},
    enabled: true,
  };
  const [form, setForm] = useState<any>(initial ?? emptyForm);

  // Reset form when dialog opens with a different initial
  const [lastInitialId, setLastInitialId] = useState<string | null>(initial?.id ?? null);
  if ((initial?.id ?? null) !== lastInitialId) {
    setLastInitialId(initial?.id ?? null);
    setForm(initial ?? emptyForm);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o)
          setForm({
            name: "",
            trigger_type: "lead_created",
            action_type: "create_task",
            condition: {},
            action_config: {},
            enabled: true,
          });
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial?.id ? "Edit automation" : "New automation"}</DialogTitle>
          <DialogDescription>Choose a trigger and what should happen.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Nudge stale leads"
            />
          </div>
          <div>
            <Label className="text-xs">When</Label>
            <Select
              value={form.trigger_type}
              onValueChange={(v) => setForm({ ...form, trigger_type: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRIGGERS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {form.trigger_type === "score_over" && (
            <div>
              <Label className="text-xs">Score threshold</Label>
              <Input
                type="number"
                value={form.condition?.threshold ?? 80}
                onChange={(e) =>
                  setForm({
                    ...form,
                    condition: { ...form.condition, threshold: Number(e.target.value) },
                  })
                }
              />
            </div>
          )}
          {form.trigger_type === "no_activity" && (
            <div>
              <Label className="text-xs">Days of inactivity</Label>
              <Input
                type="number"
                value={form.condition?.days ?? 7}
                onChange={(e) =>
                  setForm({
                    ...form,
                    condition: { ...form.condition, days: Number(e.target.value) },
                  })
                }
              />
            </div>
          )}
          <div>
            <Label className="text-xs">Then</Label>
            <Select
              value={form.action_type}
              onValueChange={(v) => setForm({ ...form, action_type: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTIONS.map((a) => (
                  <SelectItem key={a.value} value={a.value}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {form.action_type === "create_task" && (
            <div>
              <Label className="text-xs">Task title</Label>
              <Input
                value={form.action_config?.title ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    action_config: { ...form.action_config, title: e.target.value },
                  })
                }
                placeholder="e.g. Research the property"
              />
            </div>
          )}
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <div className="text-sm font-medium">Enabled</div>
              <div className="text-xs text-muted-foreground">
                Turn off to pause without deleting.
              </div>
            </div>
            <Switch
              checked={form.enabled}
              onCheckedChange={(v) => setForm({ ...form, enabled: v })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => onSave(form)} disabled={saving || !form.name}>
            {saving ? "Saving…" : "Save automation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
