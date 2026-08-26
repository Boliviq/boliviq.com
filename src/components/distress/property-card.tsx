import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DistressSignalBadges } from "./signals";
import { currency } from "@/lib/format";

export type DistressCardProperty = {
  id: string;
  address_raw?: string | null;
  address_normalized?: string | null;
  city?: string | null;
  state_code?: string | null;
  zip?: string | null;
  distress_score?: number | null;
  opportunity_score?: number | null;
  active_subtypes?: string[];
  score_signals?: { key: string; label: string; points: number }[] | null;
  auction_date?: string | null;
  estimated_value?: number | null;
  loan_balance?: number | null;
  estimated_equity?: number | null;
  estimated_arv?: number | null;
  estimated_rehab?: number | null;
  is_demo?: boolean | null;
};

export function DistressedPropertyCard({
  property,
  onSave,
  onPipeline,
  onWatch,
  onAi,
}: {
  property: DistressCardProperty;
  onSave?: () => void;
  onPipeline?: () => void;
  onWatch?: () => void;
  onAi?: () => void;
}) {
  const address = property.address_raw ?? property.address_normalized ?? "Address pending";
  const subtypes =
    property.active_subtypes ??
    (property.score_signals ?? []).map((s) => s.key).filter((k) => !k.includes("_"));

  return (
    <Card className="overflow-hidden border-border/80 shadow-none">
      <CardHeader className="space-y-2 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-display text-lg leading-tight text-foreground">{address}</h3>
            <p className="text-sm text-muted-foreground">
              {[property.city, property.state_code].filter(Boolean).join(", ")}
              {property.zip ? ` ${property.zip}` : ""}
            </p>
          </div>
          {property.is_demo && (
            <Badge variant="outline" className="shrink-0 border-amber-300 text-amber-800">
              DEMO
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">Distress </span>
            <span className="font-semibold tabular-nums">{property.distress_score ?? "—"}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Opportunity </span>
            <span className="font-semibold tabular-nums">{property.opportunity_score ?? "—"}</span>
          </div>
        </div>
        <DistressSignalBadges
          subtypes={subtypes.length ? subtypes : (property.score_signals ?? []).map((s) => s.key)}
        />
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
        {property.auction_date && (
          <div>
            <div className="text-xs text-muted-foreground">Auction</div>
            <div className="font-medium">{property.auction_date}</div>
          </div>
        )}
        <div>
          <div className="text-xs text-muted-foreground">Est. value</div>
          <div className="font-medium">{currency(property.estimated_value)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Est. debt</div>
          <div className="font-medium">{currency(property.loan_balance)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Est. equity</div>
          <div className="font-medium">{currency(property.estimated_equity)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Potential ARV</div>
          <div className="font-medium">{currency(property.estimated_arv)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Est. rehab</div>
          <div className="font-medium">{currency(property.estimated_rehab)}</div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2 border-t bg-muted/30 pt-3">
        <Button asChild size="sm" className="bg-[#70bf2b] text-white hover:bg-[#5ea524]">
          <Link to="/distressed-opportunities/$id" params={{ id: property.id }}>
            View Property
          </Link>
        </Button>
        <Button size="sm" variant="outline" onClick={onAi}>
          Run AI Analysis
        </Button>
        <Button size="sm" variant="outline" onClick={onSave}>
          Save Search
        </Button>
        <Button size="sm" variant="outline" onClick={onPipeline}>
          Add to Pipeline
        </Button>
        <Button size="sm" variant="ghost" onClick={onWatch}>
          Watchlist
        </Button>
      </CardFooter>
    </Card>
  );
}
