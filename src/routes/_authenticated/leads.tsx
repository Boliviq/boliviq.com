import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Users, Phone, Mail } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { LEAD_STATUSES, type LeadStatus } from "@/lib/demo-data";
import { currency, dateShort } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/leads")({
  component: LeadsPage,
});

type Lead = Record<string, any> & { id: string };
type Property = { id: string; address: string; city?: string; state?: string };
type Contact = { id: string; name: string; phone?: string; email?: string };

function statusTone(s: string) {
  const item = LEAD_STATUSES.find((x) => x.value === s);
  const tone = item?.tone ?? "default";
  if (tone === "success") return "bg-success/15 text-success border-success/30";
  if (tone === "warning") return "bg-warning/15 text-warning-foreground border-warning/30";
  if (tone === "destructive") return "bg-destructive/15 text-destructive border-destructive/30";
  return "bg-muted text-muted-foreground border-border";
}

function LeadsPage() {
  const { userId } = useCurrentUser();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [openNew, setOpenNew] = useState(false);

  const leadsQuery = useQuery({
    queryKey: ["leads-full", userId], enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Lead[];
    },
  });
  const propsQuery = useQuery({
    queryKey: ["properties-min", userId], enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("properties").select("id, address, city, state");
      if (error) throw error;
      return (data ?? []) as Property[];
    },
  });
  const contactsQuery = useQuery({
    queryKey: ["contacts-min", userId], enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("contacts").select("id, name, phone, email");
      if (error) throw error;
      return (data ?? []) as Contact[];
    },
  });

  const propMap = useMemo(() => Object.fromEntries((propsQuery.data ?? []).map((p) => [p.id, p])), [propsQuery.data]);
  const contactMap = useMemo(() => Object.fromEntries((contactsQuery.data ?? []).map((c) => [c.id, c])), [contactsQuery.data]);

  const updateLead = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: any }) => {
      const { error } = await (supabase.from("leads") as any).update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads-full"] }),
  });

  const filtered = useMemo(() => {
    let list = leadsQuery.data ?? [];
    if (statusFilter) list = list.filter((l) => l.status === statusFilter);
    if (priorityFilter) list = list.filter((l) => l.priority === priorityFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((l) => {
        const c = l.contact_id ? contactMap[l.contact_id] : null;
        const p = l.property_id ? propMap[l.property_id] : null;
        return [c?.name, c?.email, c?.phone, p?.address, l.source, l.assigned_to]
          .filter(Boolean).some((v: string) => v.toLowerCase().includes(q));
      });
    }
    return list;
  }, [leadsQuery.data, statusFilter, priorityFilter, search, contactMap, propMap]);

  return (
    <>
      <PageHeader
        title="Leads"
        description="Every seller, agent, and property lead in one CRM view."
        action={<Button onClick={() => setOpenNew(true)}><Plus className="h-4 w-4" /> New lead</Button>}
      />

      <div className="space-y-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search leads…" className="w-56 pl-8" />
          </div>
          <Select value={statusFilter || "__all"} onValueChange={(v) => setStatusFilter(v === "__all" ? "" : v)}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">All statuses</SelectItem>
              {LEAD_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={priorityFilter || "__all"} onValueChange={(v) => setPriorityFilter(v === "__all" ? "" : v)}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Priority" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">All priorities</SelectItem>
              {["low", "medium", "high"].map((p) =>
                <SelectItem key={p} value={p}>{p}</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        {leadsQuery.isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed bg-card p-10 text-center">
            <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <h3 className="font-display text-lg font-semibold">No leads yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Create a lead from scratch, or add a property first and convert it to a lead.
            </p>
            <Button className="mt-4" onClick={() => setOpenNew(true)}>
              <Plus className="h-4 w-4" /> New lead
            </Button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contact</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead>Last contact</TableHead>
                  <TableHead>Next follow-up</TableHead>
                  <TableHead className="text-right">Est. value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((l) => {
                  const c = l.contact_id ? contactMap[l.contact_id] : null;
                  const p = l.property_id ? propMap[l.property_id] : null;
                  return (
                    <TableRow key={l.id}>
                      <TableCell>
                        <div className="font-medium">{c?.name ?? "—"}</div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {c?.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</span>}
                          {c?.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        {p ? (
                          <div>
                            <div className="text-sm font-medium">{p.address}</div>
                            <div className="text-xs text-muted-foreground">{[p.city, p.state].filter(Boolean).join(", ")}</div>
                          </div>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-sm">{l.source ?? "—"}</TableCell>
                      <TableCell>
                        <Select value={l.status ?? "new"}
                          onValueChange={(v) => updateLead.mutate({ id: l.id, patch: { status: v as LeadStatus } })}>
                          <SelectTrigger className="h-8 w-40">
                            <Badge variant="outline" className={statusTone(l.status)}>
                              {LEAD_STATUSES.find((s) => s.value === l.status)?.label ?? l.status}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent>
                            {LEAD_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select value={l.priority ?? "medium"}
                          onValueChange={(v) => updateLead.mutate({ id: l.id, patch: { priority: v } })}>
                          <SelectTrigger className="h-8 w-24"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {["low", "medium", "high"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-sm">{l.assigned_to ?? "—"}</TableCell>
                      <TableCell className="text-sm">{dateShort(l.last_contact_at)}</TableCell>
                      <TableCell className="text-sm">{dateShort(l.next_follow_up_at)}</TableCell>
                      <TableCell className="text-right">{currency(l.opportunity_value)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <NewLeadDialog open={openNew} onOpenChange={setOpenNew} userId={userId}
        properties={propsQuery.data ?? []} contacts={contactsQuery.data ?? []}
        onCreated={() => qc.invalidateQueries({ queryKey: ["leads-full"] })} />
    </>
  );
}

function NewLeadDialog({ open, onOpenChange, userId, properties, contacts, onCreated }: {
  open: boolean; onOpenChange: (o: boolean) => void; userId: string | null;
  properties: Property[]; contacts: Contact[]; onCreated: () => void;
}) {
  const [f, setF] = useState<Record<string, any>>({ status: "new", priority: "medium" });
  const set = (k: string, v: any) => setF((p) => ({ ...p, [k]: v }));
  const save = async () => {
    if (!userId) return;
    const payload: any = {
      user_id: userId,
      status: f.status, priority: f.priority,
      source: f.source || null, assigned_to: f.assigned_to || null,
      property_id: f.property_id || null, contact_id: f.contact_id || null,
      opportunity_value: f.opportunity_value ? Number(f.opportunity_value) : null,
      last_contact_at: f.last_contact_at || null,
      next_follow_up_at: f.next_follow_up_at || null,
    };
    const { error } = await (supabase.from("leads") as any).insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Lead created");
    setF({ status: "new", priority: "medium" });
    onOpenChange(false); onCreated();
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>New lead</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1.5">
            <Label className="text-xs">Contact</Label>
            <Select value={f.contact_id ?? ""} onValueChange={(v) => set("contact_id", v)}>
              <SelectTrigger><SelectValue placeholder="Select contact (optional)" /></SelectTrigger>
              <SelectContent>{contacts.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label className="text-xs">Property</Label>
            <Select value={f.property_id ?? ""} onValueChange={(v) => set("property_id", v)}>
              <SelectTrigger><SelectValue placeholder="Select property (optional)" /></SelectTrigger>
              <SelectContent>{properties.map((p) => <SelectItem key={p.id} value={p.id}>{p.address}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Status</Label>
            <Select value={f.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{LEAD_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Priority</Label>
            <Select value={f.priority} onValueChange={(v) => set("priority", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["low", "medium", "high"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label className="text-xs">Source</Label>
            <Input value={f.source ?? ""} onChange={(e) => set("source", e.target.value)} placeholder="MLS, Zillow, referral…" />
          </div>
          <div className="space-y-1.5"><Label className="text-xs">Assigned to</Label>
            <Input value={f.assigned_to ?? ""} onChange={(e) => set("assigned_to", e.target.value)} placeholder="Team member" />
          </div>
          <div className="space-y-1.5"><Label className="text-xs">Opportunity value</Label>
            <Input type="number" value={f.opportunity_value ?? ""} onChange={(e) => set("opportunity_value", e.target.value)} />
          </div>
          <div className="space-y-1.5"><Label className="text-xs">Next follow-up</Label>
            <Input type="date" value={f.next_follow_up_at ?? ""} onChange={(e) => set("next_follow_up_at", e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save}>Create lead</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
