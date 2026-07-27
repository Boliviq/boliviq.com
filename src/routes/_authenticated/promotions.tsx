import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ShieldAlert, Plus, Pencil, Trash2, Search, Ticket, DollarSign, TrendingUp, Percent, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { syncCouponsToStripe } from "@/lib/billing.functions";
import { getStripeEnvironment, isPaymentsConfigured } from "@/lib/stripe";

export const Route = createFileRoute("/_authenticated/promotions")({
  component: PromotionsGate,
});

function PromotionsGate() {
  const { userId, loading } = useCurrentUser();
  const { data: isAdmin, isLoading } = useQuery({
    queryKey: ["is-admin", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId!).eq("role", "admin").maybeSingle();
      return !!data;
    },
  });
  if (loading || isLoading) return <div className="p-8 text-sm text-muted-foreground">Checking access…</div>;
  if (!isAdmin) {
    return (
      <div className="p-8">
        <Card className="max-w-lg">
          <CardHeader className="flex flex-row items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            <CardTitle>Admin access required</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Only administrators can manage promotions.</CardContent>
        </Card>
      </div>
    );
  }
  return <Promotions />;
}

type Coupon = {
  id: string;
  name: string;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  active: boolean;
  start_date: string | null;
  expiration_date: string | null;
  max_total_uses: number | null;
  max_uses_per_customer: number | null;
  current_uses: number;
  restricted_plan: string | null;
  admin_only: boolean;
  hidden: boolean;
  notes: string | null;
  created_at: string;
};

const emptyForm = (): Partial<Coupon> => ({
  name: "",
  code: "",
  discount_type: "percentage",
  discount_value: 10,
  active: true,
  max_uses_per_customer: 1,
  admin_only: false,
  hidden: false,
});

function Promotions() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Coupon> | null>(null);

  const { data: coupons = [] } = useQuery({
    queryKey: ["coupons"],
    queryFn: async () => {
      const { data, error } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Coupon[];
    },
  });

  const { data: redemptions = [] } = useQuery({
    queryKey: ["coupon-redemptions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("coupon_redemptions").select("*").order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      return data as Array<{ id: string; coupon_id: string; coupon_code: string; user_id: string; plan: string | null; order_amount: number | null; discount_amount: number | null; created_at: string }>;
    },
  });

  const filtered = useMemo(() => {
    return coupons.filter((c) => {
      if (filter === "active" && !c.active) return false;
      if (filter === "inactive" && c.active) return false;
      if (!q) return true;
      const s = (c.code + " " + c.name).toLowerCase();
      return s.includes(q.toLowerCase());
    });
  }, [coupons, q, filter]);

  const totalDiscounts = redemptions.reduce((sum, r) => sum + Number(r.discount_amount ?? 0), 0);
  const topCoupon = useMemo(() => {
    const map = new Map<string, number>();
    redemptions.forEach((r) => map.set(r.coupon_code, (map.get(r.coupon_code) ?? 0) + 1));
    let top: [string, number] | null = null;
    map.forEach((v, k) => { if (!top || v > top[1]) top = [k, v]; });
    return top?.[0] ?? "—";
  }, [redemptions]);

  const save = useMutation({
    mutationFn: async (payload: Partial<Coupon>) => {
      const row = {
        name: payload.name?.trim() ?? "",
        code: payload.code?.trim() ?? "",
        discount_type: payload.discount_type ?? "percentage",
        discount_value: Number(payload.discount_value ?? 0),
        active: payload.active ?? true,
        start_date: payload.start_date || null,
        expiration_date: payload.expiration_date || null,
        max_total_uses: payload.max_total_uses == null || (payload.max_total_uses as unknown as string) === "" ? null : Number(payload.max_total_uses),
        max_uses_per_customer: payload.max_uses_per_customer == null || (payload.max_uses_per_customer as unknown as string) === "" ? null : Number(payload.max_uses_per_customer),
        restricted_plan: payload.restricted_plan || null,
        admin_only: !!payload.admin_only,
        hidden: !!payload.hidden,
        notes: payload.notes || null,
      };
      if (payload.id) {
        const { error } = await supabase.from("coupons").update(row).eq("id", payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("coupons").insert(row);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coupons"] });
      setOpen(false);
      setEditing(null);
      toast.success("Coupon saved.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async (c: Coupon) => {
      const { error } = await supabase.from("coupons").update({ active: !c.active }).eq("id", c.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["coupons"] }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("coupons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coupons"] });
      toast.success("Coupon deleted.");
    },
  });

  return (
    <>
      <PageHeader title="Promotions & coupons" description="Create and manage discount codes. All validation and redemptions are enforced server-side." />
      <div className="space-y-6 p-4 sm:p-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={Ticket} label="Active promotions" value={String(coupons.filter((c) => c.active).length)} />
          <Stat icon={TrendingUp} label="Total redemptions" value={String(redemptions.length)} />
          <Stat icon={DollarSign} label="Revenue discounted" value={`$${totalDiscounts.toFixed(2)}`} />
          <Stat icon={Percent} label="Most-used coupon" value={topCoupon} />
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>Coupons</CardTitle>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Search name or code…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
                </div>
                <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
                  <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <SyncStripeButton />
                <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
                  <DialogTrigger asChild>
                    <Button onClick={() => setEditing(emptyForm())}><Plus className="mr-2 h-4 w-4" />New coupon</Button>
                  </DialogTrigger>
                  <CouponDialog editing={editing} setEditing={setEditing} save={(v) => save.mutate(v)} saving={save.isPending} />
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="list">
              <TabsList>
                <TabsTrigger value="list">Coupons</TabsTrigger>
                <TabsTrigger value="history">Redemption history</TabsTrigger>
              </TabsList>
              <TabsContent value="list" className="mt-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="text-left py-2">Code</th>
                        <th className="text-left py-2">Name</th>
                        <th className="text-left py-2">Discount</th>
                        <th className="text-left py-2">Uses</th>
                        <th className="text-left py-2">Flags</th>
                        <th className="text-left py-2">Status</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((c) => (
                        <tr key={c.id} className="border-t">
                          <td className="py-2 font-mono text-xs">{c.code}</td>
                          <td className="py-2">{c.name}</td>
                          <td className="py-2">
                            {c.discount_type === "percentage" ? `${c.discount_value}%` : `$${c.discount_value}`} off
                          </td>
                          <td className="py-2 tabular-nums">
                            {c.current_uses}{c.max_total_uses ? ` / ${c.max_total_uses}` : ""}
                          </td>
                          <td className="py-2">
                            <div className="flex flex-wrap gap-1">
                              {c.admin_only && <Badge variant="outline">Admin only</Badge>}
                              {c.hidden && <Badge variant="outline">Hidden</Badge>}
                              {c.restricted_plan && <Badge variant="secondary">{c.restricted_plan}</Badge>}
                            </div>
                          </td>
                          <td className="py-2">
                            <div className="flex items-center gap-2">
                              <Switch checked={c.active} onCheckedChange={() => toggleActive.mutate(c)} />
                              <span className="text-xs text-muted-foreground">{c.active ? "Active" : "Inactive"}</span>
                            </div>
                          </td>
                          <td className="py-2 text-right">
                            <div className="flex justify-end gap-1">
                              <Button size="sm" variant="ghost" onClick={() => { setEditing(c); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                              <Button size="sm" variant="ghost" onClick={() => { if (confirm(`Delete ${c.code}?`)) del.mutate(c.id); }}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filtered.length === 0 && (
                        <tr><td colSpan={7} className="py-8 text-center text-sm text-muted-foreground">No coupons match.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </TabsContent>
              <TabsContent value="history" className="mt-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="text-left py-2">Date</th>
                        <th className="text-left py-2">Code</th>
                        <th className="text-left py-2">User</th>
                        <th className="text-left py-2">Plan</th>
                        <th className="text-right py-2">Order</th>
                        <th className="text-right py-2">Discount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {redemptions.map((r) => (
                        <tr key={r.id} className="border-t">
                          <td className="py-2">{new Date(r.created_at).toLocaleString()}</td>
                          <td className="py-2 font-mono text-xs">{r.coupon_code}</td>
                          <td className="py-2 font-mono text-xs">{r.user_id.slice(0, 8)}…</td>
                          <td className="py-2">{r.plan ?? "—"}</td>
                          <td className="py-2 text-right tabular-nums">${Number(r.order_amount ?? 0).toFixed(2)}</td>
                          <td className="py-2 text-right tabular-nums">${Number(r.discount_amount ?? 0).toFixed(2)}</td>
                        </tr>
                      ))}
                      {redemptions.length === 0 && (
                        <tr><td colSpan={6} className="py-8 text-center text-sm text-muted-foreground">No redemptions yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function CouponDialog({ editing, setEditing, save, saving }: { editing: Partial<Coupon> | null; setEditing: (v: Partial<Coupon> | null) => void; save: (v: Partial<Coupon>) => void; saving: boolean }) {
  if (!editing) return null;
  const set = (patch: Partial<Coupon>) => setEditing({ ...editing, ...patch });
  return (
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>{editing.id ? "Edit coupon" : "New coupon"}</DialogTitle></DialogHeader>
      <div className="grid gap-4">
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <Label>Name</Label>
            <Input value={editing.name ?? ""} onChange={(e) => set({ name: e.target.value })} />
          </div>
          <div>
            <Label>Code</Label>
            <Input value={editing.code ?? ""} onChange={(e) => set({ code: e.target.value })} />
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <Label>Discount type</Label>
            <Select value={editing.discount_type ?? "percentage"} onValueChange={(v) => set({ discount_type: v as "percentage" | "fixed" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">Percentage</SelectItem>
                <SelectItem value="fixed">Fixed amount</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Discount value</Label>
            <Input type="number" min={0} value={editing.discount_value ?? 0} onChange={(e) => set({ discount_value: Number(e.target.value) })} />
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <Label>Start date</Label>
            <Input type="datetime-local" value={editing.start_date?.slice(0, 16) ?? ""} onChange={(e) => set({ start_date: e.target.value || null })} />
          </div>
          <div>
            <Label>Expiration date</Label>
            <Input type="datetime-local" value={editing.expiration_date?.slice(0, 16) ?? ""} onChange={(e) => set({ expiration_date: e.target.value || null })} />
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <Label>Max total uses</Label>
            <Input type="number" min={0} value={editing.max_total_uses ?? ""} onChange={(e) => set({ max_total_uses: e.target.value === "" ? null : Number(e.target.value) })} />
          </div>
          <div>
            <Label>Max uses per customer</Label>
            <Input type="number" min={0} value={editing.max_uses_per_customer ?? ""} onChange={(e) => set({ max_uses_per_customer: e.target.value === "" ? null : Number(e.target.value) })} />
          </div>
        </div>
        <div>
          <Label>Restricted plan (optional)</Label>
          <Input placeholder="e.g. Professional" value={editing.restricted_plan ?? ""} onChange={(e) => set({ restricted_plan: e.target.value })} />
        </div>
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm"><Switch checked={!!editing.active} onCheckedChange={(v) => set({ active: v })} /> Active</label>
          <label className="flex items-center gap-2 text-sm"><Switch checked={!!editing.admin_only} onCheckedChange={(v) => set({ admin_only: v })} /> Admin only</label>
          <label className="flex items-center gap-2 text-sm"><Switch checked={!!editing.hidden} onCheckedChange={(v) => set({ hidden: v })} /> Hidden</label>
        </div>
        <div>
          <Label>Notes</Label>
          <Textarea rows={2} value={editing.notes ?? ""} onChange={(e) => set({ notes: e.target.value })} />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
        <Button onClick={() => save(editing)} disabled={saving}>{saving ? "Saving…" : "Save coupon"}</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function Stat({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <Card><CardContent className="p-5">
      <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase"><Icon className="h-4 w-4 text-success" />{label}</div>
      <div className="mt-2 font-display text-2xl font-bold tabular-nums">{value}</div>
    </CardContent></Card>
  );
}

function SyncStripeButton() {
  const sync = useServerFn(syncCouponsToStripe);
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  if (!isPaymentsConfigured()) return null;
  return (
    <Button
      variant="outline"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const res = await sync({ data: { environment: getStripeEnvironment() } });
          const synced = res.results.filter((r) => r.status === "synced").length;
          const errs = res.results.filter((r) => r.status === "error");
          if (errs.length) toast.error(`${synced} synced, ${errs.length} error(s): ${errs.map((e) => `${e.code} — ${e.message}`).join("; ")}`);
          else toast.success(`Synced ${synced} coupon(s) to Stripe.`);
          qc.invalidateQueries({ queryKey: ["coupons"] });
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Sync failed.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <RefreshCw className={`mr-2 h-4 w-4 ${busy ? "animate-spin" : ""}`} />Sync to Stripe
    </Button>
  );
}
