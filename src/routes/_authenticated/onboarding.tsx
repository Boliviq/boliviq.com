import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/onboarding")({ component: Onboarding });

const STRATEGIES = [
  { value: "fix_and_flip", label: "Fix and flip" },
  { value: "wholesale", label: "Wholesale" },
  { value: "buy_and_hold", label: "Buy and hold" },
  { value: "brrrr", label: "BRRRR" },
  { value: "short_term_rental", label: "Short-term rental" },
  { value: "creative_finance", label: "Creative finance" },
  { value: "land_investing", label: "Land investing" },
];

const INVESTOR_TYPES = [
  { value: "individual", label: "Individual investor" },
  { value: "wholesaler", label: "Wholesaler" },
  { value: "flipper", label: "House flipper" },
  { value: "landlord", label: "Landlord" },
  { value: "agent", label: "Agent" },
  { value: "team", label: "Investment team" },
];

function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [f, setF] = useState({
    full_name: "", company_name: "", phone: "",
    primary_market: "", investor_type: "", strategy: "",
    price_min: "", price_max: "", max_rehab_budget: "",
    min_profit: "", min_monthly_cashflow: "",
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const name = (data.user?.user_metadata?.full_name as string) ?? "";
      if (name) setF((p) => ({ ...p, full_name: name }));
    });
  }, []);

  const update = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) throw new Error("Not signed in");

      let companyId: string | null = null;
      if (f.company_name.trim()) {
        const { data: co, error: coErr } = await supabase.from("companies").insert({
          owner_id: user.id, name: f.company_name, phone: f.phone || null,
        }).select("id").single();
        if (coErr) throw coErr;
        companyId = co.id;
      }

      const { error: profErr } = await supabase.from("profiles").upsert({
        id: user.id,
        full_name: f.full_name,
        phone: f.phone || null,
        company_id: companyId,
        onboarded: true,
      });
      if (profErr) throw profErr;

      const num = (v: string) => (v ? Number(v) : null);
      const { error: prefErr } = await supabase.from("user_preferences").upsert({
        user_id: user.id,
        primary_market: f.primary_market || null,
        investor_type: (f.investor_type || null) as never,
        strategy: (f.strategy || null) as never,
        price_min: num(f.price_min),
        price_max: num(f.price_max),
        max_rehab_budget: num(f.max_rehab_budget),
        min_profit: num(f.min_profit),
        min_monthly_cashflow: num(f.min_monthly_cashflow),
      });
      if (prefErr) throw prefErr;

      toast.success("You're all set!");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally { setLoading(false); }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:py-16">
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
          Step {step} of 3
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-success transition-all" style={{ width: `${(step / 3) * 100}%` }} />
        </div>
      </div>

      <h1 className="font-display text-2xl font-bold">Welcome to Boliviq</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Tell us about your business so we can tune the platform to your buy box.
      </p>

      <div className="mt-8 space-y-5 rounded-2xl border bg-card p-6">
        {step === 1 && (
          <>
            <Field label="Full name">
              <Input value={f.full_name} onChange={(e) => update("full_name", e.target.value)} />
            </Field>
            <Field label="Company name">
              <Input value={f.company_name} onChange={(e) => update("company_name", e.target.value)} placeholder="Optional" />
            </Field>
            <Field label="Phone number">
              <Input value={f.phone} onChange={(e) => update("phone", e.target.value)} placeholder="(555) 123-4567" />
            </Field>
          </>
        )}
        {step === 2 && (
          <>
            <Field label="Primary market">
              <Input value={f.primary_market} onChange={(e) => update("primary_market", e.target.value)} placeholder="e.g. Austin, TX" />
            </Field>
            <Field label="Investor type">
              <Select value={f.investor_type} onValueChange={(v) => update("investor_type", v)}>
                <SelectTrigger><SelectValue placeholder="Choose one" /></SelectTrigger>
                <SelectContent>
                  {INVESTOR_TYPES.map((i) => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Preferred investment strategy">
              <Select value={f.strategy} onValueChange={(v) => update("strategy", v)}>
                <SelectTrigger><SelectValue placeholder="Choose one" /></SelectTrigger>
                <SelectContent>
                  {STRATEGIES.map((i) => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </>
        )}
        {step === 3 && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Min price ($)">
                <Input type="number" value={f.price_min} onChange={(e) => update("price_min", e.target.value)} placeholder="100000" />
              </Field>
              <Field label="Max price ($)">
                <Input type="number" value={f.price_max} onChange={(e) => update("price_max", e.target.value)} placeholder="400000" />
              </Field>
            </div>
            <Field label="Max rehab budget ($)">
              <Input type="number" value={f.max_rehab_budget} onChange={(e) => update("max_rehab_budget", e.target.value)} placeholder="60000" />
            </Field>
            <Field label="Min desired profit ($)">
              <Input type="number" value={f.min_profit} onChange={(e) => update("min_profit", e.target.value)} placeholder="35000" />
            </Field>
            <Field label="Min monthly cash flow ($)">
              <Input type="number" value={f.min_monthly_cashflow} onChange={(e) => update("min_monthly_cashflow", e.target.value)} placeholder="300" />
            </Field>
          </>
        )}

        <div className="flex items-center justify-between pt-2">
          <Button variant="ghost" onClick={() => (step > 1 ? setStep(step - 1) : navigate({ to: "/dashboard" }))}>
            {step > 1 ? "Back" : "Skip for now"}
          </Button>
          {step < 3 ? (
            <Button onClick={() => setStep(step + 1)} className="gap-2">
              Continue <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={submit} disabled={loading} className="gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Finish setup
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
