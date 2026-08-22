import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LANGUAGES, PROFILE_ROLES, type LanguageId, type ProfileRoleId } from "@/lib/canons";
import { isMissingRelation } from "@/lib/supabase-safe";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({ component: SettingsPage });

const STRATEGIES = [
  ["fix_and_flip", "Fix and flip"],
  ["wholesale", "Wholesale"],
  ["buy_and_hold", "Buy and hold"],
  ["brrrr", "BRRRR"],
  ["short_term_rental", "Short-term rental"],
  ["creative_finance", "Creative finance"],
  ["land_investing", "Land investing"],
] as const;

const INVESTOR_TYPES = [
  ["individual", "Individual"],
  ["wholesaler", "Wholesaler"],
  ["flipper", "Flipper"],
  ["landlord", "Landlord"],
  ["agent", "Agent"],
  ["team", "Team"],
] as const;

function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState("");
  const [profile, setProfile] = useState({
    full_name: "",
    phone: "",
    primary_role: "" as ProfileRoleId | "",
    language: "en" as LanguageId,
  });
  const [company, setCompany] = useState({ id: "", name: "", phone: "", website: "" });
  const [prefs, setPrefs] = useState({
    primary_market: "",
    investor_type: "",
    strategy: "",
    price_min: "",
    price_max: "",
    max_rehab_budget: "",
    min_profit: "",
    min_monthly_cashflow: "",
  });

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return;
      setEmail(user.email ?? "");
      const meta = user.user_metadata ?? {};
      setProfile((p) => ({
        ...p,
        primary_role: (meta.primary_role as ProfileRoleId) || p.primary_role,
        language: (meta.language as LanguageId) || p.language,
      }));

      const [{ data: p }, { data: pref }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("user_preferences").select("*").eq("user_id", user.id).maybeSingle(),
      ]);
      if (p) {
        setProfile({
          full_name: p.full_name ?? "",
          phone: p.phone ?? "",
          primary_role: ((p as { primary_role?: ProfileRoleId }).primary_role ||
            (meta.primary_role as ProfileRoleId) ||
            "") as ProfileRoleId | "",
          language: ((p as { language?: LanguageId }).language ||
            meta.language ||
            "en") as LanguageId,
        });
        if (p.company_id) {
          const { data: co } = await supabase
            .from("companies")
            .select("*")
            .eq("id", p.company_id)
            .maybeSingle();
          if (co)
            setCompany({
              id: co.id,
              name: co.name,
              phone: co.phone ?? "",
              website: co.website ?? "",
            });
        }
      }
      if (pref) {
        setPrefs({
          primary_market: pref.primary_market ?? "",
          investor_type: pref.investor_type ?? "",
          strategy: pref.strategy ?? "",
          price_min: pref.price_min?.toString() ?? "",
          price_max: pref.price_max?.toString() ?? "",
          max_rehab_budget: pref.max_rehab_budget?.toString() ?? "",
          min_profit: pref.min_profit?.toString() ?? "",
          min_monthly_cashflow: pref.min_monthly_cashflow?.toString() ?? "",
        });
      }
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user!;
      let companyId = company.id || null;
      if (company.name.trim()) {
        if (companyId) {
          await supabase
            .from("companies")
            .update({
              name: company.name,
              phone: company.phone || null,
              website: company.website || null,
            })
            .eq("id", companyId);
        } else {
          const { data: co } = await supabase
            .from("companies")
            .insert({
              owner_id: user.id,
              name: company.name,
              phone: company.phone || null,
              website: company.website || null,
            })
            .select("id")
            .single();
          companyId = co?.id ?? null;
          if (companyId) setCompany((c) => ({ ...c, id: companyId! }));
        }
      }
      const { error: profErr } = await (supabase.from("profiles") as any).upsert({
        id: user.id,
        full_name: profile.full_name,
        phone: profile.phone || null,
        company_id: companyId,
        primary_role: profile.primary_role || null,
        language: profile.language,
      });
      if (profErr && !isMissingRelation(profErr)) {
        const { error: fb } = await supabase.from("profiles").upsert({
          id: user.id,
          full_name: profile.full_name,
          phone: profile.phone || null,
          company_id: companyId,
        });
        if (fb) throw fb;
      }
      await supabase.auth.updateUser({
        data: {
          full_name: profile.full_name,
          primary_role: profile.primary_role || null,
          language: profile.language,
        },
      });
      const num = (v: string) => (v ? Number(v) : null);
      await supabase.from("user_preferences").upsert({
        user_id: user.id,
        primary_market: prefs.primary_market || null,
        investor_type: (prefs.investor_type || null) as never,
        strategy: (prefs.strategy || null) as never,
        price_min: num(prefs.price_min),
        price_max: num(prefs.price_max),
        max_rehab_budget: num(prefs.max_rehab_budget),
        min_profit: num(prefs.min_profit),
        min_monthly_cashflow: num(prefs.min_monthly_cashflow),
      });
      toast.success("Settings saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="grid h-64 place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Settings"
        description="Your profile, role, language, company, and buy box."
        action={
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save changes
          </Button>
        }
      />
      <div className="grid gap-6 p-4 sm:p-8 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={email} disabled />
            </div>
            <div className="space-y-2">
              <Label>Full name</Label>
              <Input
                value={profile.full_name}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Primary role</Label>
              <Select
                value={profile.primary_role}
                onValueChange={(v) => setProfile({ ...profile, primary_role: v as ProfileRoleId })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a profile" />
                </SelectTrigger>
                <SelectContent>
                  {PROFILE_ROLES.filter((r) => r.id !== "administrator").map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Language</Label>
              <Select
                value={profile.language}
                onValueChange={(v) => setProfile({ ...profile, language: v as LanguageId })}
              >
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
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Company</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Company name</Label>
              <Input
                value={company.name}
                onChange={(e) => setCompany({ ...company, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Company phone</Label>
              <Input
                value={company.phone}
                onChange={(e) => setCompany({ ...company, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Website</Label>
              <Input
                value={company.website}
                onChange={(e) => setCompany({ ...company, website: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Investment preferences</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Primary market</Label>
              <Input
                value={prefs.primary_market}
                onChange={(e) => setPrefs({ ...prefs, primary_market: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Investor type</Label>
              <Select
                value={prefs.investor_type}
                onValueChange={(v) => setPrefs({ ...prefs, investor_type: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose one" />
                </SelectTrigger>
                <SelectContent>
                  {INVESTOR_TYPES.map(([v, l]) => (
                    <SelectItem key={v} value={v}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Strategy</Label>
              <Select
                value={prefs.strategy}
                onValueChange={(v) => setPrefs({ ...prefs, strategy: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose one" />
                </SelectTrigger>
                <SelectContent>
                  {STRATEGIES.map(([v, l]) => (
                    <SelectItem key={v} value={v}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Min price ($)</Label>
              <Input
                type="number"
                value={prefs.price_min}
                onChange={(e) => setPrefs({ ...prefs, price_min: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Max price ($)</Label>
              <Input
                type="number"
                value={prefs.price_max}
                onChange={(e) => setPrefs({ ...prefs, price_max: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Max rehab budget ($)</Label>
              <Input
                type="number"
                value={prefs.max_rehab_budget}
                onChange={(e) => setPrefs({ ...prefs, max_rehab_budget: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Min desired profit ($)</Label>
              <Input
                type="number"
                value={prefs.min_profit}
                onChange={(e) => setPrefs({ ...prefs, min_profit: e.target.value })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Min monthly cash flow ($)</Label>
              <Input
                type="number"
                value={prefs.min_monthly_cashflow}
                onChange={(e) => setPrefs({ ...prefs, min_monthly_cashflow: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <ComplianceCard />
      </div>
    </>
  );
}

function ComplianceCard() {
  const [confirmBeforeCall, setConfirmBeforeCall] = useState(true);
  const [recordingDisclosure, setRecordingDisclosure] = useState(true);
  const [consentReminder, setConsentReminder] = useState(true);
  const [dnc, setDnc] = useState("");
  const [hoursStart, setHoursStart] = useState("09:00");
  const [hoursEnd, setHoursEnd] = useState("18:00");
  const [labelPurpose, setLabelPurpose] = useState(true);
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="text-base">Calling & compliance</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <ToggleRow
          label="Confirm before placing calls"
          desc="Require a click-to-confirm before dialing."
          value={confirmBeforeCall}
          onChange={setConfirmBeforeCall}
        />
        <ToggleRow
          label="Recording disclosure"
          desc="Prompt to state a recording disclosure at call start."
          value={recordingDisclosure}
          onChange={setRecordingDisclosure}
        />
        <ToggleRow
          label="State consent reminder"
          desc="Show two-party vs one-party consent notice per state."
          value={consentReminder}
          onChange={setConsentReminder}
        />
        <ToggleRow
          label="Label call purpose"
          desc="Require selecting a purpose before every call."
          value={labelPurpose}
          onChange={setLabelPurpose}
        />
        <div className="space-y-2 sm:col-span-2">
          <Label>Do-not-call suppression (one number per line)</Label>
          <textarea
            className="min-h-[80px] w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={dnc}
            onChange={(e) => setDnc(e.target.value)}
            placeholder="+1 555 555 0100"
          />
        </div>
        <div className="space-y-2">
          <Label>Allowed calling hours — start</Label>
          <Input type="time" value={hoursStart} onChange={(e) => setHoursStart(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Allowed calling hours — end</Label>
          <Input type="time" value={hoursEnd} onChange={(e) => setHoursEnd(e.target.value)} />
        </div>
        <p className="sm:col-span-2 text-xs text-muted-foreground">
          You are responsible for complying with telemarketing (TCPA/DNC), recording-consent,
          licensing, privacy, and other communications laws. Boliviq does not place live calls
          without an approved telephony provider and your explicit action.
        </p>
      </CardContent>
    </Card>
  );
}

function ToggleRow({
  label,
  desc,
  value,
  onChange,
}: {
  label: string;
  desc: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border p-3">
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4"
      />
    </div>
  );
}
