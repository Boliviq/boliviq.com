import { Badge } from "@/components/ui/badge";

const LABELS: Record<string, string> = {
  verified: "VERIFIED",
  provider_data: "PROVIDER DATA",
  estimate: "ESTIMATE",
  ai_inference: "AI INFERENCE",
  user_provided: "USER PROVIDED",
  demo: "DEMO DATA",
};

export function ProvenanceBadge({
  classification,
  source,
}: {
  classification?: string | null;
  source?: string | null;
}) {
  const key = (classification ?? "estimate").toLowerCase();
  const label = LABELS[key] ?? key.toUpperCase();
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <Badge
        variant="outline"
        className={
          key === "demo"
            ? "border-warning/50 bg-warning/10 text-warning"
            : key === "verified"
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700"
              : "text-muted-foreground"
        }
      >
        {label}
      </Badge>
      {source ? <span className="text-[11px] text-muted-foreground">{source}</span> : null}
    </span>
  );
}
