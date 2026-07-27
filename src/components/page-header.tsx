import type { ReactNode } from "react";

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 border-b border-slate-200/80 bg-white px-4 py-7 shadow-sm sm:px-8">
      <div className="min-w-0">
        <h1 className="truncate font-display text-2xl font-extrabold tracking-tight text-[#0b1d33] sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
