export const currency = (n: number | null | undefined, opts: { compact?: boolean } = {}) => {
  if (n == null || Number.isNaN(Number(n))) return "—";
  const v = Number(n);
  if (opts.compact && Math.abs(v) >= 1000)
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(v);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v);
};

export const num = (n: number | null | undefined) =>
  n == null || Number.isNaN(Number(n)) ? "—" : new Intl.NumberFormat("en-US").format(Number(n));

export const pct = (n: number | null | undefined, digits = 1) =>
  n == null || Number.isNaN(Number(n)) ? "—" : `${Number(n).toFixed(digits)}%`;

export const dateShort = (s: string | null | undefined) => {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

export const relative = (s: string | null | undefined) => {
  if (!s) return "—";
  const diffMs = new Date(s).getTime() - Date.now();
  const days = Math.round(diffMs / 86400000);
  if (Math.abs(days) < 1) return "today";
  if (days > 0 && days < 7) return `in ${days}d`;
  if (days < 0 && days > -7) return `${-days}d ago`;
  return dateShort(s);
};
