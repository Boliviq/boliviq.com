import type { ScoreSignal } from "@/lib/distress/scoring";

export function ScoreBreakdown({
  title,
  score,
  signals,
}: {
  title: string;
  score: number | null | undefined;
  signals?: ScoreSignal[] | null;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        <div className="font-display text-2xl font-semibold tabular-nums text-foreground">
          {score != null ? `${Math.round(score)}` : "—"}
          <span className="text-sm font-normal text-muted-foreground">/100</span>
        </div>
      </div>
      {signals && signals.length > 0 && (
        <ul className="space-y-1 text-sm">
          {signals.map((s) => (
            <li key={s.key} className="flex justify-between gap-3 text-muted-foreground">
              <span>{s.label}</span>
              <span className="tabular-nums text-foreground">+{s.points}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
