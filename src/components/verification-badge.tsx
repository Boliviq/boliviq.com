import { Badge } from "@/components/ui/badge";
import { VERIFICATION_TIERS, type VerificationTierId } from "@/lib/canons";
import { ShieldCheck, ShieldAlert, IdCard, FileCheck, Award } from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS: Record<VerificationTierId, typeof ShieldCheck> = {
  identity: IdCard,
  license: FileCheck,
  insurance: ShieldCheck,
  boliviq_certified: Award,
  unverified: ShieldAlert,
};

const TONES: Record<VerificationTierId, string> = {
  identity: "border-sky-400/40 bg-sky-500/10 text-sky-800",
  license: "border-[#70bf2b]/40 bg-[#70bf2b]/10 text-[#1f4d0d]",
  insurance: "border-teal-400/40 bg-teal-500/10 text-teal-800",
  boliviq_certified: "border-amber-400/50 bg-amber-500/10 text-amber-900",
  unverified: "border-muted text-muted-foreground",
};

export function VerificationBadge({
  tier,
  className,
}: {
  tier: VerificationTierId;
  className?: string;
}) {
  const meta = VERIFICATION_TIERS.find((t) => t.id === tier) ?? VERIFICATION_TIERS[4];
  const Icon = ICONS[tier] ?? ShieldAlert;
  return (
    <Badge variant="outline" className={cn("gap-1 font-medium", TONES[tier], className)}>
      <Icon className="h-3 w-3" />
      {meta.label}
    </Badge>
  );
}

export function VerificationBadgeRow({ tiers }: { tiers: VerificationTierId[] }) {
  const show = tiers.length ? tiers : (["unverified"] as VerificationTierId[]);
  return (
    <div className="flex flex-wrap gap-1.5">
      {show.map((t) => (
        <VerificationBadge key={t} tier={t} />
      ))}
    </div>
  );
}
