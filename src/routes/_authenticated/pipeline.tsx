import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DndContext, PointerSensor, useSensor, useSensors, useDroppable, useDraggable,
  DragOverlay, type DragEndEvent,
} from "@dnd-kit/core";
import { GripVertical, Kanban, DollarSign, Flag } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { PIPELINE_STAGES } from "@/lib/demo-data";
import { mapLeadStatusToPipelineStage } from "@/lib/canons";
import { currency, dateShort } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/pipeline")({
  component: PipelinePage,
});

type Lead = Record<string, any> & { id: string };
type Property = { id: string; address: string; estimated_profit?: number; list_price?: number };
type Contact = { id: string; name: string };

function PipelinePage() {
  const { userId } = useCurrentUser();
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const leadsQuery = useQuery({
    queryKey: ["leads-pipeline", userId], enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("leads").select("*").order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Lead[];
    },
  });
  const propsQuery = useQuery({
    queryKey: ["properties-min", userId], enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("properties").select("id, address, estimated_profit, list_price");
      if (error) throw error;
      return (data ?? []) as Property[];
    },
  });
  const contactsQuery = useQuery({
    queryKey: ["contacts-min", userId], enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("contacts").select("id, name");
      if (error) throw error;
      return (data ?? []) as Contact[];
    },
  });

  const propMap = useMemo(() => Object.fromEntries((propsQuery.data ?? []).map((p) => [p.id, p])), [propsQuery.data]);
  const contactMap = useMemo(() => Object.fromEntries((contactsQuery.data ?? []).map((c) => [c.id, c])), [contactsQuery.data]);

  const move = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await (supabase.from("leads") as any).update({ status }).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ["leads-pipeline"] });
      const prev = qc.getQueryData<Lead[]>(["leads-pipeline", userId]);
      qc.setQueryData<Lead[]>(["leads-pipeline", userId], (old) =>
        (old ?? []).map((l) => (l.id === id ? { ...l, status } : l)));
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["leads-pipeline", userId], ctx.prev);
      toast.error("Failed to move lead");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["leads-pipeline"] }),
  });

  const grouped = useMemo(() => {
    const map: Record<string, Lead[]> = {};
    PIPELINE_STAGES.forEach((s) => (map[s.key] = []));
    (leadsQuery.data ?? []).forEach((l) => {
      const key = mapLeadStatusToPipelineStage(l.status);
      if (map[key]) map[key].push(l);
    });
    return map;
  }, [leadsQuery.data]);

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    if (!e.over) return;
    const overId = String(e.over.id);
    const leadId = String(e.active.id);
    const lead = (leadsQuery.data ?? []).find((l) => l.id === leadId);
    if (!lead || lead.status === overId) return;
    move.mutate({ id: leadId, status: overId });
  };

  const activeLead = activeId ? (leadsQuery.data ?? []).find((l) => l.id === activeId) : null;

  return (
    <>
      <PageHeader title="Pipeline" description="Canon stages from new lead through close, including estimates, in-progress work, and long-term follow-up. Legacy statuses map into these columns." />
      <div className="p-4 sm:p-6">
        {leadsQuery.isLoading ? (
          <div className="flex gap-3 overflow-x-auto">
            {PIPELINE_STAGES.map((s) => <Skeleton key={s.key} className="h-64 w-64 shrink-0" />)}
          </div>
        ) : (leadsQuery.data ?? []).length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed bg-card p-10 text-center">
            <Kanban className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <h3 className="font-display text-lg font-semibold">Pipeline is empty</h3>
            <p className="mt-2 text-sm text-muted-foreground">Create leads from the Leads page to start moving them through your pipeline.</p>
          </div>
        ) : (
          <DndContext sensors={sensors} onDragEnd={onDragEnd}
            onDragStart={(e) => setActiveId(String(e.active.id))} onDragCancel={() => setActiveId(null)}>
            <div className="flex gap-3 overflow-x-auto pb-4">
              {PIPELINE_STAGES.map((stage) => {
                const leads = grouped[stage.key] ?? [];
                const totalProfit = leads.reduce((sum, l) => {
                  const p = l.property_id ? propMap[l.property_id] : null;
                  return sum + Number(p?.estimated_profit ?? 0);
                }, 0);
                return (
                  <StageColumn key={stage.key} stageKey={stage.key} label={stage.label}
                    color={stage.color} count={leads.length} totalProfit={totalProfit}>
                    {leads.map((l) => (
                      <LeadCard key={l.id} lead={l}
                        property={l.property_id ? propMap[l.property_id] : null}
                        contact={l.contact_id ? contactMap[l.contact_id] : null} />
                    ))}
                  </StageColumn>
                );
              })}
            </div>
            <DragOverlay>
              {activeLead && (
                <LeadCard lead={activeLead}
                  property={activeLead.property_id ? propMap[activeLead.property_id] : null}
                  contact={activeLead.contact_id ? contactMap[activeLead.contact_id] : null} dragging />
              )}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </>
  );
}

function StageColumn({ stageKey, label, color, count, totalProfit, children }: {
  stageKey: string; label: string; color: string; count: number; totalProfit: number; children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stageKey });
  return (
    <div ref={setNodeRef}
      className={`flex w-72 shrink-0 flex-col rounded-lg border bg-muted/30 transition
        ${isOver ? "ring-2 ring-primary" : ""}`}>
      <div className="flex items-center justify-between border-b bg-card px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: color }} />
          <span className="font-display text-sm font-semibold">{label}</span>
          <Badge variant="secondary">{count}</Badge>
        </div>
        {totalProfit > 0 && (
          <span className="text-xs text-success">{currency(totalProfit, { compact: true })}</span>
        )}
      </div>
      <div className="flex-1 space-y-2 p-2 min-h-40">{children}</div>
    </div>
  );
}

function LeadCard({ lead, property, contact, dragging }: {
  lead: Lead; property?: Property | null; contact?: Contact | null; dragging?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: lead.id });
  return (
    <Card ref={setNodeRef} {...attributes} {...listeners}
      className={`cursor-grab active:cursor-grabbing ${isDragging || dragging ? "opacity-40" : ""}`}>
      <CardContent className="space-y-1.5 p-3 text-sm">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate font-medium">
              {property?.address ?? contact?.name ?? "Lead"}
            </div>
            {contact && property && (
              <div className="truncate text-xs text-muted-foreground">{contact.name}</div>
            )}
          </div>
          <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {lead.priority && (
            <Badge variant="outline"
              className={lead.priority === "high" ? "bg-destructive/15 text-destructive border-destructive/30" :
                lead.priority === "medium" ? "bg-warning/15 text-warning-foreground border-warning/30" : ""}>
              <Flag className="h-3 w-3" /> {lead.priority}
            </Badge>
          )}
          {property?.estimated_profit && (
            <span className="flex items-center gap-1 text-success">
              <DollarSign className="h-3 w-3" />{currency(property.estimated_profit, { compact: true })}
            </span>
          )}
          {lead.next_follow_up_at && (
            <span className="text-muted-foreground">Follow up {dateShort(lead.next_follow_up_at)}</span>
          )}
        </div>
        {lead.assigned_to && (
          <div className="text-xs text-muted-foreground">Assigned: {lead.assigned_to}</div>
        )}
      </CardContent>
    </Card>
  );
}
