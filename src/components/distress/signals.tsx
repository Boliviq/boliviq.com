import { Badge } from "@/components/ui/badge";
import { SUBTYPE_LABELS, type DistressSubtype } from "@/lib/distress/taxonomy";

const TONE: Record<string, string> = {
  foreclosure: "border-red-300 bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-100",
  tax: "border-orange-300 bg-orange-50 text-orange-900 dark:bg-orange-950/40 dark:text-orange-100",
  code: "border-rose-300 bg-rose-50 text-rose-900 dark:bg-rose-950/40 dark:text-rose-100",
  vacancy: "border-slate-300 bg-slate-50 text-slate-800 dark:bg-slate-900 dark:text-slate-100",
  government: "border-sky-300 bg-sky-50 text-sky-900 dark:bg-sky-950/40 dark:text-sky-100",
};

import { SUBTYPE_TO_CATEGORY } from "@/lib/distress/taxonomy";

export function DistressSignalBadges({
  subtypes,
  limit = 6,
}: {
  subtypes: string[];
  limit?: number;
}) {
  const unique = [...new Set(subtypes)].slice(0, limit);
  return (
    <div className="flex flex-wrap gap-1.5">
      {unique.map((s) => {
        const cat = SUBTYPE_TO_CATEGORY[s as DistressSubtype] ?? "vacancy";
        return (
          <Badge key={s} variant="outline" className={TONE[cat] ?? ""}>
            {SUBTYPE_LABELS[s as DistressSubtype] ?? s.replaceAll("_", " ")}
          </Badge>
        );
      })}
    </div>
  );
}
