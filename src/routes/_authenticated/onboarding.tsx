import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowRight, Loader2 } from "lucide-react";
import {
  ACCOUNT_KINDS,
  LANGUAGES,
  PROFILE_ROLES,
  TRADE_LABELS,
  isProfessionalRole,
  signupRoles,
  type ProfileRoleId,
} from "@/lib/canons";
import { DEFAULT_ACCOUNT, type AccountProfile } from "@/lib/workspace-store";
import { useAccountProfile, useSaveAccountDraft } from "@/hooks/use-workspace-data";

export const Route = createFileRoute("/_authenticated/onboarding")({ component: Onboarding });

const STEPS = 5;

function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [f, setF] = useState<AccountProfile>(DEFAULT_ACCOUNT);
  const [hydrated, setHydrated] = useState(false);
  const { data: remoteDraft } = useAccountProfile();
  const saveAccountDraft = useSaveAccountDraft();

  useEffect(() => {
    if (hydrated || !remoteDraft) return;
    setF(remoteDraft);
    if (remoteDraft.onboarding_step > 1 && !remoteDraft.onboarded) {
      setStep(remoteDraft.onboarding_step);
    }
    setHydrated(true);
  }, [remoteDraft, hydrated]);

  const persistDraft = (next: AccountProfile, nextStep = step, syncRemote = false) => {
    const row = { ...next, onboarding_step: nextStep };
    setF(row);
    if (!syncRemote) return;
    saveAccountDraft.mutate(row);
    void supabase.auth.updateUser({
      data: {
        full_name: row.full_name,
        phone: row.phone,
        primary_role: row.primary_role,
        secondary_roles: row.secondary_roles,
        language: row.language,
        service_area: row.service_area,
        account_kind: row.account_kind,
        company_name: row.company_name,
        onboarding_step: nextStep,
        onboarded: row.onboarded,
      },
    });
  };

  const update = <K extends keyof AccountProfile>(k: K, v: AccountProfile[K]) =>
    persistDraft({ ...f, [k]: v });

  const professional = isProfessionalRole(f.primary_role);

  const go = (n: number) => {
    persistDraft(f, n, true);
    setStep(n);
  };

  const toggleSecondary = (key: ProfileRoleId) => {
    const has = f.secondary_roles.includes(key);
    update(
      "secondary_roles",
      has ? f.secondary_roles.filter((r) => r !== key) : [...f.secondary_roles, key],
    );
  };

  const submit = async () => {
    if (!f.consent_terms) {
      toast.error("Please accept the terms and privacy policy.");
      return;
    }
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) throw new Error("Not signed in");

      let companyId: string | null = null;
      if (f.account_kind === "company" && f.company_name.trim()) {
        const { data: existing } = await supabase
          .from("companies")
          .select("id")
          .eq("owner_id", user.id)
          .maybeSingle();
        if (existing?.id) {
          companyId = existing.id;
        } else {
          const { data: co, error: coErr } = await supabase
            .from("companies")
            .insert({
              owner_id: user.id,
              name: f.company_name,
              phone: f.phone || null,
            })
            .select("id")
            .single();
          if (coErr && !/schema cache|does not exist/i.test(coErr.message)) throw coErr;
          companyId = co?.id ?? null;
        }
      }

      await supabase.auth.updateUser({
        data: {
          full_name: f.full_name,
          phone: f.phone,
          primary_role: f.primary_role,
          secondary_roles: f.secondary_roles,
          language: f.language,
          service_area: f.service_area,
          account_kind: f.account_kind,
          company_name: f.company_name,
          onboarded: true,
        },
      });

      const { error: profErr } = await supabase.from("profiles").upsert({
        id: user.id,
        full_name: f.full_name,
        phone: f.phone || null,
        company_id: companyId,
        onboarded: true,
        primary_role: f.primary_role,
        secondary_roles: f.secondary_roles,
        language: f.language,
        service_area: f.service_area || null,
        account_kind: f.account_kind,
        onboarding_step: STEPS,
        comms_consent: f.consent_comms,
        terms_accepted_at: new Date().toISOString(),
      } as never);
      if (profErr && !/column|schema cache/i.test(profErr.message)) throw profErr;

      persistDraft({ ...f, onboarded: true, onboarding_step: STEPS }, STEPS, true);
      toast.success("Your Boliviq workspace is ready.");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const tradeHint = useMemo(
    () => (f.primary_role === "trade" ? Object.values(TRADE_LABELS).join(", ") : ""),
    [f.primary_role],
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span>
            Step {step} of {STEPS}
          </span>
          <button
            type="button"
            className="underline"
            onClick={() => {
              persistDraft(f, step, true);
              toast.success("Progress saved. You can finish later.");
            }}
          >
            Save and finish later
          </button>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-[#70bf2b] transition-all"
            style={{ width: `${(step / STEPS) * 100}%` }}
          />
        </div>
      </div>

      <h1 className="font-display text-2xl font-bold">Welcome to Boliviq</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        One operating system for finding, connecting, analyzing, financing, building, and managing
        property.
      </p>

      <div className="mt-8 space-y-5 rounded-2xl border bg-card p-6">
        {step === 1 && (
          <>
            <Field label="Full name">
              <Input
                value={f.full_name}
                onChange={(e) => update("full_name", e.target.value)}
                required
              />
            </Field>
            <Field label="Mobile number">
              <Input
                value={f.phone}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="Verified later via SMS"
              />
            </Field>
            <Field label="Preferred language">
              <Select value={f.language} onValueChange={(v) => update("language", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Account type">
              <Select
                value={f.account_kind}
                onValueChange={(v) => update("account_kind", v as AccountProfile["account_kind"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_KINDS.map((k) => (
                    <SelectItem key={k.id} value={k.id}>
                      {k.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {f.account_kind === "company" && (
              <Field label="Company name">
                <Input
                  value={f.company_name}
                  onChange={(e) => update("company_name", e.target.value)}
                />
              </Field>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <p className="text-sm text-muted-foreground">
              Choose your primary profile. You can add secondary roles next.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {signupRoles().map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => update("primary_role", r.id)}
                  className={`rounded-xl border p-4 text-left transition ${f.primary_role === r.id ? "border-[#70bf2b] bg-[#70bf2b]/10" : "hover:bg-muted/40"}`}
                >
                  <div className="font-semibold">{r.label}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{r.description}</div>
                  {r.id === "homeowner" && (
                    <div className="mt-2 text-[11px] font-medium text-[#3f7a12]">
                      Core marketplace access is free
                    </div>
                  )}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <p className="text-sm text-muted-foreground">
              Secondary roles are optional and may require verification and a professional
              subscription.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {signupRoles()
                .filter((r) => r.id !== f.primary_role)
                .map((r) => (
                  <label
                    key={r.id}
                    className="flex cursor-pointer items-start gap-3 rounded-xl border p-3"
                  >
                    <Checkbox
                      checked={f.secondary_roles.includes(r.id)}
                      onCheckedChange={() => toggleSecondary(r.id)}
                    />
                    <span>
                      <span className="font-medium">{r.label}</span>
                      <span className="block text-xs text-muted-foreground">{r.description}</span>
                    </span>
                  </label>
                ))}
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <Field label="Service area">
              <Input
                value={f.service_area}
                onChange={(e) => update("service_area", e.target.value)}
                placeholder="City, metro, or radius — e.g. Austin, TX"
              />
            </Field>
            {professional && (
              <>
                <Field label="License information">
                  <Input
                    value={f.license}
                    onChange={(e) => update("license", e.target.value)}
                    placeholder="License number and state (optional now)"
                  />
                </Field>
                <Field label="Insurance information">
                  <Input
                    value={f.insurance}
                    onChange={(e) => update("insurance", e.target.value)}
                    placeholder="Carrier / policy (optional now)"
                  />
                </Field>
                <Field label="Profile description">
                  <Textarea
                    value={f.categories.join("\n")}
                    onChange={(e) => update("categories", e.target.value.split("\n"))}
                    placeholder="Services, specialties, years in business…"
                  />
                </Field>
                {f.primary_role === "trade" && (
                  <p className="text-xs text-muted-foreground">Supported trades: {tradeHint}</p>
                )}
              </>
            )}
            {f.primary_role === "investor" && (
              <p className="text-sm text-muted-foreground">
                You can set buy-box numbers later in Settings and the Deal Analyzer. Automated
                valuations are estimates, not appraisals.
              </p>
            )}
            {f.primary_role === "wholesaler" && (
              <p className="text-sm text-muted-foreground">
                Wholesaling rules vary by state. Boliviq will show compliance notices on disposition
                campaigns.
              </p>
            )}
            {f.primary_role === "homeowner" && (
              <p className="text-sm text-muted-foreground">
                Homeowner accounts stay free for core marketplace participation — list, request
                repairs, and message professionals.
              </p>
            )}
          </>
        )}

        {step === 5 && (
          <>
            <label className="flex items-start gap-3 text-sm">
              <Checkbox
                checked={f.consent_terms}
                onCheckedChange={(v) => update("consent_terms", v === true)}
              />
              <span>I accept the Terms of Service and Privacy Policy.</span>
            </label>
            <label className="flex items-start gap-3 text-sm">
              <Checkbox
                checked={f.consent_comms}
                onCheckedChange={(v) => update("consent_comms", v === true)}
              />
              <span>
                I consent to email and (if provided) SMS from Boliviq and people I choose to
                contact. I can opt out, and quiet hours will be respected.
              </span>
            </label>
            <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
              Primary profile:{" "}
              <strong className="text-foreground">
                {PROFILE_ROLES.find((r) => r.id === f.primary_role)?.label}
              </strong>
              {f.secondary_roles.length > 0 && <> · Secondary: {f.secondary_roles.join(", ")}</>}
              {f.service_area && <> · {f.service_area}</>}
            </div>
          </>
        )}

        <div className="flex items-center justify-between pt-2">
          <Button
            variant="ghost"
            onClick={() => (step > 1 ? go(step - 1) : navigate({ to: "/dashboard" }))}
          >
            {step > 1 ? "Back" : "Skip for now"}
          </Button>
          {step < STEPS ? (
            <Button onClick={() => go(step + 1)} className="gap-2 bg-[#70bf2b] hover:bg-[#80ce38]">
              Continue <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={submit}
              disabled={loading}
              className="gap-2 bg-[#70bf2b] hover:bg-[#80ce38]"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Enter Boliviq
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
