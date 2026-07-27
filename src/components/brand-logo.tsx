import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  compact?: boolean;
  inverse?: boolean;
  showTagline?: boolean;
};

export function BrandLogo({ className, compact = false, inverse = false, showTagline = false }: BrandLogoProps) {
  const primary = inverse ? "#ffffff" : "#0b1d33";
  const green = "#70bf2b";

  return (
    <div className={cn("flex items-center gap-3", className)} aria-label="Boliviq">
      <svg viewBox="0 0 120 120" className="h-11 w-11 shrink-0" role="img" aria-hidden="true">
        <circle cx="60" cy="60" r="54" fill="none" stroke={primary} strokeWidth="5" />
        <path d="M27 47 60 20l17 14V25h13v20l6 5" fill="none" stroke={primary} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M39 43v54h28c17 0 28-9 28-23 0-10-6-17-16-20 7-3 11-9 11-17" fill="none" stroke={primary} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="50" y="70" width="8" height="19" rx="1" fill={green} />
        <rect x="61" y="61" width="8" height="28" rx="1" fill={green} />
        <rect x="72" y="51" width="8" height="38" rx="1" fill={green} />
        <path d="M48 67c10-4 20-11 30-25" fill="none" stroke={green} strokeWidth="5" strokeLinecap="round" />
        <path d="m73 42 9-3-2 10" fill={green} />
        <rect x="53" y="31" width="7" height="7" fill={green} />
        <rect x="62" y="31" width="7" height="7" fill={green} />
        <rect x="53" y="40" width="7" height="7" fill={green} />
        <rect x="62" y="40" width="7" height="7" fill={green} />
      </svg>
      {!compact && (
        <div className="leading-none">
          <div className={cn("font-display text-[1.65rem] font-extrabold tracking-[0.06em]", inverse ? "text-white" : "text-[#0b1d33]")}> 
            BOLI<span className="text-[#70bf2b]">VIQ</span>
          </div>
          {showTagline && (
            <div className={cn("mt-1 text-[0.54rem] font-semibold uppercase tracking-[0.18em]", inverse ? "text-white/70" : "text-slate-500")}>AI that builds better investors</div>
          )}
        </div>
      )}
    </div>
  );
}
