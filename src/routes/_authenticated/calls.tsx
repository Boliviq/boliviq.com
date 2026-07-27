import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Phone, PhoneCall, PhoneIncoming, PhoneOutgoing, Clock, Search,
  Plus, PlayCircle, ShieldAlert, Sparkles, Copy, FileText, User,
  CalendarClock, MessageSquare, Save, ChevronRight,
} from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";

import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  SCRIPT_TEMPLATES, TONES, CONTACT_TYPES, CALL_PURPOSES,
  fillScript, summarizeTranscript, type Tone,
} from "@/lib/call-scripts";
import { currency, dateShort, relative } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/calls")({
  head: () => ({ meta: [
    { title: "AI Call Assistant — Boliviq" },
    { name: "description", content: "Scripts, call prep, transcript summaries, and follow-up tasks." },
  ]}),
  component: CallsPage,
});

function CallsPage() {
  const { userId } = useCurrentUser();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [openLog, setOpenLog] = useState(false);
  const [openPrep, setOpenPrep] = useState(false);
  const [openScript, setOpenScript] = useState(false);
  const [activeCallId, setActiveCallId] = useState<string | null>(null);

  const { data: calls = [], isLoading } = useQuery({
    queryKey: ["calls", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("calls")
        .select("*, contacts(name,phone,role), properties(address,city,state,list_price,arv,deal_score)")
        .order("called_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const activeCall = calls.find((c: any) => c.id === activeCallId);

  const filtered = useMemo(() => {
    return calls.filter((c: any) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (q) {
        const hay = `${c.contact_name} ${c.phone_number} ${c.purpose} ${c.contact_type} ${c.properties?.address}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [calls, q, statusFilter]);

  // Stats
  const today = new Date().toDateString();
  const stats = useMemo(() => {
    const t = calls.filter((c: any) => new Date(c.called_at).toDateString() === today);
    return {
      today: t.length,
      completed: calls.filter((c: any) => c.status === "completed").length,
      needsFollowup: calls.filter((c: any) => c.follow_up_at && new Date(c.follow_up_at) <= new Date()).length,
      avgDuration: Math.round((calls.reduce((s: number, c: any) => s + (c.duration_seconds ?? 0), 0) / Math.max(calls.length, 1)) / 60),
      qualified: calls.filter((c: any) => (c.motivation_score ?? 0) >= 7).length,
      agentCallbacks: calls.filter((c: any) => c.contact_type === "Listing agent" && c.follow_up_at).length,
      sellerCallbacks: calls.filter((c: any) => c.contact_type === "Seller" && c.follow_up_at).length,
    };
  }, [calls, today]);

  return (
    <div className="flex flex-col">
      <PageHeader
        title="AI Call Assistant"
        description="Prep, script, log, and summarize every conversation."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpenScript(true)}>
              <FileText className="mr-2 h-4 w-4" /> Scripts
            </Button>
            <Button variant="outline" size="sm" onClick={() => setOpenPrep(true)}>
              <Sparkles className="mr-2 h-4 w-4" /> Call prep
            </Button>
            <Button size="sm" onClick={() => setOpenLog(true)}>
              <Plus className="mr-2 h-4 w-4" /> Log a call
            </Button>
          </div>
        }
      />

      <div className="space-y-6 p-4 sm:p-8">
        <Alert>
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription className="text-sm">
            You are responsible for complying with telemarketing, recording-consent, licensing, and privacy laws in your jurisdiction.
            The app does not place live calls automatically. Configure a telephony provider in Integrations to enable click-to-call.
          </AlertDescription>
        </Alert>

        {/* Stat cards */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={<CalendarClock className="h-4 w-4" />} label="Scheduled today" value={stats.today} />
          <Stat icon={<PhoneCall className="h-4 w-4" />} label="Completed" value={stats.completed} />
          <Stat icon={<Clock className="h-4 w-4" />} label="Avg duration" value={`${stats.avgDuration}m`} />
          <Stat icon={<Sparkles className="h-4 w-4" />} label="Qualified opps" value={stats.qualified} />
          <Stat icon={<PhoneIncoming className="h-4 w-4" />} label="Follow-ups due" value={stats.needsFollowup} />
          <Stat icon={<PhoneOutgoing className="h-4 w-4" />} label="Agent callbacks" value={stats.agentCallbacks} />
          <Stat icon={<User className="h-4 w-4" />} label="Seller callbacks" value={stats.sellerCallbacks} />
          <Stat icon={<Phone className="h-4 w-4" />} label="Total calls" value={calls.length} />
        </div>

        {/* History */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">Call history</CardTitle>
                <CardDescription>Every conversation, with AI summary and follow-ups.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search calls…" className="h-9 w-[220px] pl-8" />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 w-[160px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="no_answer">No answer</SelectItem>
                    <SelectItem value="voicemail">Voicemail</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Loading calls…</div>
            ) : filtered.length === 0 ? (
              <EmptyCalls onLog={() => setOpenLog(true)} />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contact</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Motivation</TableHead>
                    <TableHead>When</TableHead>
                    <TableHead>Follow-up</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c: any) => (
                    <TableRow key={c.id} className="cursor-pointer" onClick={() => setActiveCallId(c.id)}>
                      <TableCell>
                        <div className="font-medium">{c.contact_name || c.contacts?.name || "Unknown"}</div>
                        <div className="text-xs text-muted-foreground">{c.phone_number || "—"}</div>
                      </TableCell>
                      <TableCell><Badge variant="outline">{c.contact_type || "—"}</Badge></TableCell>
                      <TableCell className="max-w-[200px] truncate">{c.properties?.address ?? "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.purpose || "—"}</TableCell>
                      <TableCell><StatusBadge status={c.status} /></TableCell>
                      <TableCell><MotivationDot score={c.motivation_score} /></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{dateShort(c.called_at)}</TableCell>
                      <TableCell className="text-sm">{c.follow_up_at ? relative(c.follow_up_at) : "—"}</TableCell>
                      <TableCell><ChevronRight className="h-4 w-4 text-muted-foreground" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <LogCallDialog open={openLog} onOpenChange={setOpenLog} userId={userId} onSaved={() => qc.invalidateQueries({ queryKey: ["calls"] })} />
      <CallPrepSheet open={openPrep} onOpenChange={setOpenPrep} />
      <ScriptGeneratorSheet open={openScript} onOpenChange={setOpenScript} />
      <CallDetailSheet
        call={activeCall}
        onOpenChange={(o) => !o && setActiveCallId(null)}
        onUpdated={() => qc.invalidateQueries({ queryKey: ["calls"] })}
        userId={userId}
      />
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <Card><CardContent className="p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
    </CardContent></Card>
  );
}

function StatusBadge({ status }: { status?: string }) {
  const map: Record<string, { label: string; variant: any }> = {
    scheduled: { label: "Scheduled", variant: "secondary" },
    completed: { label: "Completed", variant: "default" },
    no_answer: { label: "No answer", variant: "outline" },
    voicemail: { label: "Voicemail", variant: "outline" },
  };
  const s = map[status ?? ""] ?? { label: status ?? "—", variant: "outline" };
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

function MotivationDot({ score }: { score?: number | null }) {
  if (score == null) return <span className="text-muted-foreground">—</span>;
  const color = score >= 8 ? "bg-emerald-500" : score >= 5 ? "bg-amber-500" : "bg-muted-foreground/50";
  return <div className="flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${color}`} /><span className="tabular-nums">{score}/10</span></div>;
}

function EmptyCalls({ onLog }: { onLog: () => void }) {
  return (
    <div className="grid place-items-center gap-3 p-12 text-center">
      <PhoneCall className="h-8 w-8 text-muted-foreground" />
      <div>
        <div className="font-medium">No calls logged yet</div>
        <div className="text-sm text-muted-foreground">Log your first call to start tracking motivation and follow-ups.</div>
      </div>
      <Button size="sm" onClick={onLog}><Plus className="mr-2 h-4 w-4" />Log a call</Button>
    </div>
  );
}

// ============== LOG CALL DIALOG ==============
function LogCallDialog({ open, onOpenChange, userId, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; userId: string | null; onSaved: () => void }) {
  const [form, setForm] = useState({
    contact_name: "", contact_type: "Listing agent", phone_number: "", purpose: "Initial outreach",
    status: "scheduled", duration_seconds: 0, motivation_score: 5, transcript: "", consent_note: "",
    follow_up_at: "",
  });
  const [property_id, setPropertyId] = useState<string>("");

  const { data: properties } = useQuery({
    queryKey: ["calls-properties", userId],
    enabled: !!userId && open,
    queryFn: async () => {
      const { data } = await supabase.from("properties").select("id,address,city,state").limit(100);
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("No user");
      const payload: any = { ...form, user_id: userId, called_at: new Date().toISOString() };
      if (property_id) payload.property_id = property_id;
      if (!payload.follow_up_at) delete payload.follow_up_at;
      if (form.transcript?.trim()) {
        const { summary } = summarizeTranscript(form.transcript);
        payload.ai_summary = summary;
      }
      const { error } = await supabase.from("calls").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Call logged"); onSaved(); onOpenChange(false); },
    onError: (e: any) => toast.error(e.message ?? "Failed to log"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Log a call</DialogTitle>
          <DialogDescription>Capture details now — paste a transcript later for the AI summary.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Contact name"><Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} /></Field>
          <Field label="Phone number"><Input value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} /></Field>
          <Field label="Contact type">
            <Select value={form.contact_type} onValueChange={(v) => setForm({ ...form, contact_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CONTACT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Call purpose">
            <Select value={form.purpose} onValueChange={(v) => setForm({ ...form, purpose: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CALL_PURPOSES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Related property">
            <Select value={property_id} onValueChange={setPropertyId}>
              <SelectTrigger><SelectValue placeholder="Optional — link a property" /></SelectTrigger>
              <SelectContent>{(properties ?? []).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.address}, {p.city}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Status">
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="no_answer">No answer</SelectItem>
                <SelectItem value="voicemail">Voicemail</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Duration (minutes)"><Input type="number" value={form.duration_seconds / 60 || ""} onChange={(e) => setForm({ ...form, duration_seconds: (Number(e.target.value) || 0) * 60 })} /></Field>
          <Field label="Follow-up date"><Input type="date" value={form.follow_up_at} onChange={(e) => setForm({ ...form, follow_up_at: e.target.value })} /></Field>
          <Field label={`Motivation score: ${form.motivation_score}/10`}>
            <Slider value={[form.motivation_score]} onValueChange={(v) => setForm({ ...form, motivation_score: v[0] })} min={1} max={10} step={1} />
          </Field>
          <Field label="Consent / compliance note">
            <Input placeholder="e.g. Consented to recording in TX" value={form.consent_note} onChange={(e) => setForm({ ...form, consent_note: e.target.value })} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Transcript (optional — paste to auto-summarize)">
              <Textarea rows={6} value={form.transcript} onChange={(e) => setForm({ ...form, transcript: e.target.value })} />
            </Field>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !form.contact_name}>{save.isPending ? "Saving…" : "Save call"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============== CALL PREP SHEET ==============
function CallPrepSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [propertyId, setPropertyId] = useState<string>("");
  const [userNotes, setUserNotes] = useState("");
  const { data: properties } = useQuery({
    queryKey: ["prep-properties"],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase.from("properties").select("id,address,city,state,list_price,arv,rehab_estimate,deal_score,beds,baths,sqft,year_built,property_type,strategy,motivation").limit(100);
      return data ?? [];
    },
  });
  const p: any = (properties ?? []).find((x: any) => x.id === propertyId);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Call preparation</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          <Field label="Property">
            <Select value={propertyId} onValueChange={setPropertyId}>
              <SelectTrigger><SelectValue placeholder="Pick a property to prep for…" /></SelectTrigger>
              <SelectContent>{(properties ?? []).map((x: any) => <SelectItem key={x.id} value={x.id}>{x.address}, {x.city}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          {p && (
            <>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Property summary</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-3 text-sm">
                  <Kv k="Address" v={`${p.address}, ${p.city} ${p.state}`} />
                  <Kv k="Type" v={p.property_type ?? "—"} />
                  <Kv k="Beds / Baths" v={`${p.beds ?? "—"} / ${p.baths ?? "—"}`} />
                  <Kv k="Square footage" v={p.sqft ?? "—"} />
                  <Kv k="Year built" v={p.year_built ?? "—"} />
                  <Kv k="Strategy" v={p.strategy ?? "—"} />
                  <Kv k="Asking price" v={currency(p.list_price)} />
                  <Kv k="ARV" v={currency(p.arv)} />
                  <Kv k="Est. rehab" v={currency(p.rehab_estimate)} />
                  <Kv k="Deal score" v={p.deal_score ?? "—"} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Recommended offer range</CardTitle></CardHeader>
                <CardContent className="text-sm space-y-1">
                  <Kv k="Conservative (65% MAO)" v={currency(Math.max(0, (p.arv ?? 0) * 0.65 - (p.rehab_estimate ?? 0) - 35000))} />
                  <Kv k="Target (70% MAO)" v={currency(Math.max(0, (p.arv ?? 0) * 0.70 - (p.rehab_estimate ?? 0) - 35000))} />
                  <Kv k="Maximum (75% MAO)" v={currency(Math.max(0, (p.arv ?? 0) * 0.75 - (p.rehab_estimate ?? 0) - 25000))} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Suggested questions</CardTitle></CardHeader>
                <CardContent><ul className="ml-4 list-disc space-y-1 text-sm text-muted-foreground">
                  <li>Is the property still available and are there any offers?</li>
                  <li>What repairs are known? Any inspection reports?</li>
                  <li>How motivated is the seller and what's the timeline?</li>
                  <li>Any price flexibility, especially for a cash close?</li>
                  <li>Any title, tenant, lien, or access issues?</li>
                </ul></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Missing information</CardTitle></CardHeader>
                <CardContent><ul className="ml-4 list-disc space-y-1 text-sm text-muted-foreground">
                  {!p.arv && <li>No ARV set — pull comps before the call.</li>}
                  {!p.rehab_estimate && <li>No rehab estimate — ask about condition and repairs.</li>}
                  {!p.motivation && <li>Seller motivation unknown — ask why they're selling.</li>}
                  {p.arv && p.rehab_estimate && p.motivation && <li>Looks good — you have the essentials.</li>}
                </ul></CardContent>
              </Card>
              <Field label="Your notes">
                <Textarea rows={4} value={userNotes} onChange={(e) => setUserNotes(e.target.value)} placeholder="Talking points, offer strategy, anything to remember…" />
              </Field>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ============== SCRIPT GENERATOR ==============
function ScriptGeneratorSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [templateId, setTemplateId] = useState(SCRIPT_TEMPLATES[0].id);
  const [tone, setTone] = useState<Tone>("professional");
  const [ctx, setCtx] = useState({ yourName: "", companyName: "", propertyAddress: "", agentName: "", sellerName: "", askingPrice: 0, offerAmount: 0 });
  const [customQuestions, setCustomQuestions] = useState<string[]>([]);
  const [editedText, setEditedText] = useState<string | null>(null);

  const template = SCRIPT_TEMPLATES.find((t) => t.id === templateId)!;
  const generated = useMemo(() => {
    const base = fillScript(template, ctx, tone);
    if (customQuestions.length === 0) return base;
    return base + "\n\nCustom questions:\n" + customQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n");
  }, [template, ctx, tone, customQuestions]);

  const text = editedText ?? generated;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Call-script generator</SheetTitle>
        </SheetHeader>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Script template">
            <Select value={templateId} onValueChange={(v) => { setTemplateId(v); setEditedText(null); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{SCRIPT_TEMPLATES.map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Tone">
            <Select value={tone} onValueChange={(v) => { setTone(v as Tone); setEditedText(null); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TONES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Your name"><Input value={ctx.yourName} onChange={(e) => { setCtx({ ...ctx, yourName: e.target.value }); setEditedText(null); }} /></Field>
          <Field label="Company"><Input value={ctx.companyName} onChange={(e) => { setCtx({ ...ctx, companyName: e.target.value }); setEditedText(null); }} /></Field>
          <Field label="Agent name"><Input value={ctx.agentName} onChange={(e) => { setCtx({ ...ctx, agentName: e.target.value }); setEditedText(null); }} /></Field>
          <Field label="Seller name"><Input value={ctx.sellerName} onChange={(e) => { setCtx({ ...ctx, sellerName: e.target.value }); setEditedText(null); }} /></Field>
          <div className="sm:col-span-2"><Field label="Property address"><Input value={ctx.propertyAddress} onChange={(e) => { setCtx({ ...ctx, propertyAddress: e.target.value }); setEditedText(null); }} /></Field></div>
          <Field label="Asking price"><Input type="number" value={ctx.askingPrice || ""} onChange={(e) => { setCtx({ ...ctx, askingPrice: Number(e.target.value) }); setEditedText(null); }} /></Field>
          <Field label="Your offer"><Input type="number" value={ctx.offerAmount || ""} onChange={(e) => { setCtx({ ...ctx, offerAmount: Number(e.target.value) }); setEditedText(null); }} /></Field>
        </div>

        <div className="mt-4">
          <Label className="text-xs text-muted-foreground">Custom questions</Label>
          <div className="mt-2 space-y-2">
            {customQuestions.map((q, i) => (
              <div key={i} className="flex gap-2">
                <Input value={q} onChange={(e) => { const c = [...customQuestions]; c[i] = e.target.value; setCustomQuestions(c); }} />
                <Button variant="outline" size="sm" onClick={() => setCustomQuestions(customQuestions.filter((_, x) => x !== i))}>Remove</Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setCustomQuestions([...customQuestions, ""])}><Plus className="mr-2 h-4 w-4" />Add question</Button>
          </div>
        </div>

        <Separator className="my-4" />
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">Generated script</div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(text); toast.success("Copied to clipboard"); }}><Copy className="mr-2 h-4 w-4" />Copy</Button>
            <Button variant="outline" size="sm" onClick={() => { toast.success("Saved as template", { description: "Persistent templates coming soon." }); }}><Save className="mr-2 h-4 w-4" />Save template</Button>
          </div>
        </div>
        <Textarea rows={16} className="mt-2 font-mono text-xs" value={text} onChange={(e) => setEditedText(e.target.value)} />
      </SheetContent>
    </Sheet>
  );
}

// ============== CALL DETAIL SHEET ==============
function CallDetailSheet({ call, onOpenChange, onUpdated, userId }: { call: any; onOpenChange: (o: boolean) => void; onUpdated: () => void; userId: string | null }) {
  const [transcript, setTranscript] = useState("");
  const [followUp, setFollowUp] = useState("");
  const summary = call?.ai_summary as any;

  const runSummary = useMutation({
    mutationFn: async () => {
      if (!call) return;
      const { summary, tasks } = summarizeTranscript(transcript || call.transcript || "");
      const { error } = await supabase.from("calls").update({ transcript: transcript || call.transcript, ai_summary: summary }).eq("id", call.id);
      if (error) throw error;
      // Create suggested tasks
      if (userId && tasks.length > 0) {
        await supabase.from("tasks").insert(tasks.map((t) => ({
          user_id: userId, title: t, task_type: "Follow up", priority: "medium",
          related_call_id: call.id, related_property_id: call.property_id,
        })).map(({ related_call_id, related_property_id, ...rest }) => ({ ...rest, property_id: related_property_id })));
      }
      return { tasks };
    },
    onSuccess: (r) => {
      toast.success("Transcript summarized", { description: `${r?.tasks?.length ?? 0} follow-up tasks created` });
      onUpdated();
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const setFu = useMutation({
    mutationFn: async () => {
      if (!call || !followUp) return;
      const { error } = await supabase.from("calls").update({ follow_up_at: new Date(followUp).toISOString() }).eq("id", call.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Follow-up scheduled"); onUpdated(); },
  });

  return (
    <Sheet open={!!call} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        {call && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" />
                {call.contact_name || "Call"} <StatusBadge status={call.status} />
              </SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-4">
              <Card>
                <CardContent className="grid grid-cols-2 gap-3 p-4 text-sm">
                  <Kv k="Contact" v={call.contact_name || "—"} />
                  <Kv k="Type" v={call.contact_type || "—"} />
                  <Kv k="Phone" v={call.phone_number || "—"} />
                  <Kv k="Purpose" v={call.purpose || "—"} />
                  <Kv k="Property" v={call.properties?.address ?? "—"} />
                  <Kv k="Called" v={dateShort(call.called_at)} />
                  <Kv k="Duration" v={`${Math.round((call.duration_seconds ?? 0) / 60)} min`} />
                  <Kv k="Motivation" v={call.motivation_score ? `${call.motivation_score}/10` : "—"} />
                  <Kv k="Recording" v={call.recording_url ? "Link available" : "Not recorded"} />
                  <Kv k="Consent" v={call.consent_note || "—"} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><MessageSquare className="h-4 w-4" />Transcript</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <Textarea rows={6} placeholder="Paste transcript here…" value={transcript || call.transcript || ""} onChange={(e) => setTranscript(e.target.value)} />
                  <Button size="sm" onClick={() => runSummary.mutate()} disabled={runSummary.isPending}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    {runSummary.isPending ? "Summarizing…" : "Summarize & create tasks"}
                  </Button>
                </CardContent>
              </Card>

              {summary && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">AI summary</CardTitle></CardHeader>
                  <CardContent className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                    {Object.entries(summary).map(([k, v]) => (
                      <Kv key={k} k={k.replace(/_/g, " ")} v={String(v)} />
                    ))}
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Schedule follow-up</CardTitle></CardHeader>
                <CardContent className="flex items-end gap-2">
                  <div className="flex-1"><Field label="Date"><Input type="date" value={followUp} onChange={(e) => setFollowUp(e.target.value)} /></Field></div>
                  <Button size="sm" onClick={() => setFu.mutate()} disabled={!followUp}>Save</Button>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">{label}</Label>{children}</div>;
}
function Kv({ k, v }: { k: string; v: React.ReactNode }) {
  return <div><div className="text-xs uppercase tracking-wide text-muted-foreground">{k}</div><div className="tabular-nums font-medium">{v}</div></div>;
}
