import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, CheckSquare, Search, Bell } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { TASK_TYPES } from "@/lib/demo-data";
import { dateShort } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/tasks")({
  component: TasksPage,
});

type Task = Record<string, any> & { id: string };
type Property = { id: string; address: string };
type Contact = { id: string; name: string };

const priorityTone = (p?: string) =>
  p === "high"
    ? "bg-destructive/15 text-destructive border-destructive/30"
    : p === "medium"
      ? "bg-warning/15 text-warning-foreground border-warning/30"
      : "bg-muted text-muted-foreground";

function TasksPage() {
  const { userId } = useCurrentUser();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"open" | "done" | "all">("open");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const q = useQuery({
    queryKey: ["tasks", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("due_at", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as Task[];
    },
  });
  const propsQuery = useQuery({
    queryKey: ["properties-min", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("properties").select("id, address");
      if (error) throw error;
      return (data ?? []) as Property[];
    },
  });
  const contactsQuery = useQuery({
    queryKey: ["contacts-min", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("contacts").select("id, name");
      if (error) throw error;
      return (data ?? []) as Contact[];
    },
  });

  const propMap = useMemo(
    () => Object.fromEntries((propsQuery.data ?? []).map((p) => [p.id, p])),
    [propsQuery.data],
  );
  const contactMap = useMemo(
    () => Object.fromEntries((contactsQuery.data ?? []).map((c) => [c.id, c])),
    [contactsQuery.data],
  );

  const toggleDone = useMutation({
    mutationFn: async (t: Task) => {
      const status = t.status === "done" ? "pending" : "done";
      const { error } = await (supabase.from("tasks") as any).update({ status }).eq("id", t.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const filtered = useMemo(() => {
    let list = q.data ?? [];
    if (filter === "open")
      list = list.filter((t) => t.status !== "done" && t.status !== "cancelled");
    if (filter === "done") list = list.filter((t) => t.status === "done");
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter((t) =>
        [t.title, t.description, t.task_type, t.assigned_to]
          .filter(Boolean)
          .some((v: string) => v.toLowerCase().includes(s)),
      );
    }
    return list;
  }, [q.data, filter, search]);

  return (
    <>
      <PageHeader
        title="Tasks"
        description="Follow-ups, inspections, closings — never miss a beat."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> New task
          </Button>
        }
      />
      <div className="space-y-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
            <TabsList>
              <TabsTrigger value="open">Open</TabsTrigger>
              <TabsTrigger value="done">Completed</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks…"
              className="w-56 pl-8"
            />
          </div>
        </div>

        {q.isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed bg-card p-10 text-center">
            <CheckSquare className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <h3 className="font-display text-lg font-semibold">No tasks</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Add a task to plan your next actions.
            </p>
            <Button className="mt-4" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> New task
            </Button>
          </div>
        ) : (
          <div className="grid gap-2">
            {filtered.map((t) => {
              const done = t.status === "done";
              const overdue = t.due_at && !done && new Date(t.due_at) < new Date();
              return (
                <Card key={t.id} className={overdue ? "border-destructive/40" : ""}>
                  <CardContent className="flex items-start gap-3 p-3">
                    <Checkbox
                      checked={done}
                      onCheckedChange={() => toggleDone.mutate(t)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`font-medium ${done ? "line-through text-muted-foreground" : ""}`}
                        >
                          {t.title}
                        </span>
                        {t.task_type && <Badge variant="secondary">{t.task_type}</Badge>}
                        {t.priority && (
                          <Badge variant="outline" className={priorityTone(t.priority)}>
                            {t.priority}
                          </Badge>
                        )}
                        {overdue && (
                          <Badge
                            variant="outline"
                            className="bg-destructive/15 text-destructive border-destructive/30"
                          >
                            Overdue
                          </Badge>
                        )}
                      </div>
                      {t.description && (
                        <p className="text-sm text-muted-foreground">{t.description}</p>
                      )}
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        {t.due_at && <span>Due {dateShort(t.due_at)}</span>}
                        {t.assigned_to && <span>Assigned: {t.assigned_to}</span>}
                        {t.property_id && propMap[t.property_id] && (
                          <span>Property: {propMap[t.property_id].address}</span>
                        )}
                        {t.contact_id && contactMap[t.contact_id] && (
                          <span>Contact: {contactMap[t.contact_id].name}</span>
                        )}
                        {t.reminder_at && (
                          <span className="inline-flex items-center gap-1">
                            <Bell className="h-3 w-3" />
                            {dateShort(t.reminder_at)}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
      <NewTaskDialog
        open={open}
        onOpenChange={setOpen}
        userId={userId}
        properties={propsQuery.data ?? []}
        contacts={contactsQuery.data ?? []}
        onCreated={() => qc.invalidateQueries({ queryKey: ["tasks"] })}
      />
    </>
  );
}

function NewTaskDialog({
  open,
  onOpenChange,
  userId,
  properties,
  contacts,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  userId: string | null;
  properties: Property[];
  contacts: Contact[];
  onCreated: () => void;
}) {
  const [f, setF] = useState<Record<string, any>>({ priority: "medium", status: "pending" });
  const set = (k: string, v: any) => setF((p) => ({ ...p, [k]: v }));
  const save = async () => {
    if (!userId) return;
    if (!f.title) {
      toast.error("Title is required");
      return;
    }
    const payload: any = {
      user_id: userId,
      title: f.title,
      description: f.description || null,
      priority: f.priority,
      status: f.status,
      task_type: f.task_type || null,
      assigned_to: f.assigned_to || null,
      due_at: f.due_at || null,
      reminder_at: f.reminder_at || null,
      property_id: f.property_id || null,
      contact_id: f.contact_id || null,
    };
    const { error } = await (supabase.from("tasks") as any).insert(payload);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Task created");
    setF({ priority: "medium", status: "pending" });
    onOpenChange(false);
    onCreated();
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2 space-y-1.5">
            <Label className="text-xs">Title *</Label>
            <Input value={f.title ?? ""} onChange={(e) => set("title", e.target.value)} />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Textarea
              value={f.description ?? ""}
              onChange={(e) => set("description", e.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Task type</Label>
            <Select value={f.task_type ?? ""} onValueChange={(v) => set("task_type", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {TASK_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Priority</Label>
            <Select value={f.priority} onValueChange={(v) => set("priority", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["low", "medium", "high"].map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Due date</Label>
            <Input
              type="date"
              value={f.due_at ?? ""}
              onChange={(e) => set("due_at", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Reminder</Label>
            <Input
              type="datetime-local"
              value={f.reminder_at ?? ""}
              onChange={(e) => set("reminder_at", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Assigned to</Label>
            <Input
              value={f.assigned_to ?? ""}
              onChange={(e) => set("assigned_to", e.target.value)}
              placeholder="Team member"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Related property</Label>
            <Select value={f.property_id ?? ""} onValueChange={(v) => set("property_id", v)}>
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                {properties.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.address}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs">Related contact</Label>
            <Select value={f.contact_id ?? ""} onValueChange={(v) => set("contact_id", v)}>
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                {contacts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save}>Create task</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
