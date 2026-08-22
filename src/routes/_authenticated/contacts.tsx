import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, UserRound, Phone, Mail, Building2 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { DEMO_CONTACTS } from "@/lib/demo-data";

export const Route = createFileRoute("/_authenticated/contacts")({
  component: ContactsPage,
});

type Contact = Record<string, any> & { id: string };

function ContactsPage() {
  const { userId } = useCurrentUser();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const q = useQuery({
    queryKey: ["contacts", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Contact[];
    },
  });

  const seed = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error();
      const { error } = await (supabase.from("contacts") as any).insert(
        DEMO_CONTACTS.map((c) => ({ ...c, user_id: userId })),
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Demo contacts added");
      qc.invalidateQueries({ queryKey: ["contacts"] });
    },
  });

  const filtered = useMemo(() => {
    const list = q.data ?? [];
    if (!search.trim()) return list;
    const s = search.toLowerCase();
    return list.filter((c) =>
      [c.name, c.email, c.phone, c.company, c.role]
        .filter(Boolean)
        .some((v: string) => v.toLowerCase().includes(s)),
    );
  }, [q.data, search]);

  return (
    <>
      <PageHeader
        title="Contacts"
        description="Sellers, agents, contractors, and partners."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> New contact
          </Button>
        }
      />
      <div className="space-y-4 p-4 sm:p-6">
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts…"
            className="pl-8"
          />
        </div>
        {q.isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed bg-card p-10 text-center">
            <UserRound className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <h3 className="font-display text-lg font-semibold">No contacts yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Add contacts manually or load sample data.
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <Button onClick={() => setOpen(true)}>
                <Plus className="h-4 w-4" /> New contact
              </Button>
              {(q.data?.length ?? 0) === 0 && (
                <Button variant="outline" onClick={() => seed.mutate()} disabled={seed.isPending}>
                  Load sample
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => (
              <Card key={c.id}>
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-display font-semibold">{c.name}</div>
                      <div className="text-xs text-muted-foreground">{c.role || "—"}</div>
                    </div>
                    {c.role && <Badge variant="outline">{c.role}</Badge>}
                  </div>
                  {c.company && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Building2 className="h-3.5 w-3.5" />
                      {c.company}
                    </div>
                  )}
                  {c.phone && (
                    <div className="flex items-center gap-1 text-sm">
                      <Phone className="h-3.5 w-3.5" />
                      {c.phone}
                    </div>
                  )}
                  {c.email && (
                    <div className="flex items-center gap-1 text-sm">
                      <Mail className="h-3.5 w-3.5" />
                      {c.email}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <NewContactDialog
        open={open}
        onOpenChange={setOpen}
        userId={userId}
        onCreated={() => qc.invalidateQueries({ queryKey: ["contacts"] })}
      />
    </>
  );
}

function NewContactDialog({
  open,
  onOpenChange,
  userId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  userId: string | null;
  onCreated: () => void;
}) {
  const [f, setF] = useState<Record<string, any>>({});
  const set = (k: string, v: any) => setF((p) => ({ ...p, [k]: v }));
  const save = async () => {
    if (!userId) return;
    if (!f.name) {
      toast.error("Name is required");
      return;
    }
    const { error } = await (supabase.from("contacts") as any).insert({ ...f, user_id: userId });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Contact added");
    setF({});
    onOpenChange(false);
    onCreated();
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New contact</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs">Name *</Label>
            <Input value={f.name ?? ""} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Role</Label>
            <Input
              value={f.role ?? ""}
              onChange={(e) => set("role", e.target.value)}
              placeholder="Seller, agent…"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Company</Label>
            <Input value={f.company ?? ""} onChange={(e) => set("company", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Phone</Label>
            <Input value={f.phone ?? ""} onChange={(e) => set("phone", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Email</Label>
            <Input value={f.email ?? ""} onChange={(e) => set("email", e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs">Notes</Label>
            <Textarea value={f.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
