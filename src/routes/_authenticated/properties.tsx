import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Papa from "papaparse";
import { toast } from "sonner";
import {
  Building2,
  Grid3x3,
  List,
  Map as MapIcon,
  Bookmark,
  Archive,
  Plus,
  Upload,
  Link2,
  Sliders,
  Search,
  X,
  Star,
  ExternalLink,
} from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Slider } from "@/components/ui/slider";

import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { currency, num, pct } from "@/lib/format";
import {
  DEMO_PROPERTIES,
  PROPERTY_TYPES,
  STRATEGIES,
  CSV_FIELD_MAP,
  FILTER_PRESETS,
} from "@/lib/demo-data";

export const Route = createFileRoute("/_authenticated/properties")({
  component: PropertiesPage,
});

type Property = Record<string, any> & { id: string };

const PROPERTY_STATUS_TONE: Record<string, string> = {
  hot: "bg-destructive/15 text-destructive border-destructive/30",
  warm: "bg-warning/15 text-warning-foreground border-warning/30",
  cool: "bg-muted text-muted-foreground border-border",
};

const scoreBadge = (score: number | null | undefined) => {
  if (score == null) return "bg-muted text-muted-foreground";
  if (score >= 80) return "bg-success/15 text-success border-success/30";
  if (score >= 60) return "bg-warning/15 text-warning-foreground border-warning/30";
  return "bg-muted text-muted-foreground border-border";
};

function PropertiesPage() {
  const qc = useQueryClient();
  const { userId } = useCurrentUser();
  const [view, setView] = useState<"table" | "cards" | "map">("cards");
  const [tab, setTab] = useState<"all" | "saved" | "archived">("all");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [openImport, setOpenImport] = useState(false);
  const [openManual, setOpenManual] = useState(false);
  const [openUrl, setOpenUrl] = useState(false);
  const [selected, setSelected] = useState<Property | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);

  const propertiesQuery = useQuery({
    queryKey: ["properties", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Property[];
    },
  });

  const seedDemo = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Not signed in");
      const rows = DEMO_PROPERTIES.map((p) => ({ ...p, user_id: userId }));
      const { error } = await (supabase.from("properties") as any).insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Demo properties added");
      qc.invalidateQueries({ queryKey: ["properties"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to add demo data"),
  });

  const toggleSaved = useMutation({
    mutationFn: async (p: Property) => {
      const { error } = await (supabase.from("properties") as any)
        .update({ saved: !p.saved })
        .eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["properties"] }),
  });

  const archive = useMutation({
    mutationFn: async ({ p, archived }: { p: Property; archived: boolean }) => {
      const { error } = await (supabase.from("properties") as any)
        .update({ archived })
        .eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["properties"] });
      toast.success("Property updated");
    },
  });

  const items = propertiesQuery.data ?? [];

  const filtered = useMemo(() => {
    let list = items.filter((p) =>
      tab === "saved" ? p.saved : tab === "archived" ? p.archived : !p.archived,
    );
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) =>
        [p.address, p.city, p.state, p.zip, p.owner_name, p.listing_agent]
          .filter(Boolean)
          .some((v: string) => v.toLowerCase().includes(q)),
      );
    }
    return applyFilters(list, filters);
  }, [items, tab, search, filters]);

  return (
    <>
      <PageHeader
        title="Properties"
        description="Import, organize, filter, and track every property lead."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpenUrl(true)}>
              <Link2 className="h-4 w-4" /> Paste URL
            </Button>
            <Button variant="outline" size="sm" onClick={() => setOpenImport(true)}>
              <Upload className="h-4 w-4" /> CSV import
            </Button>
            <Button size="sm" onClick={() => setOpenManual(true)}>
              <Plus className="h-4 w-4" /> Add property
            </Button>
          </div>
        }
      />

      <div className="space-y-4 p-4 sm:p-6">
        {/* Controls */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList>
              <TabsTrigger value="all">
                <Building2 className="mr-1 h-3.5 w-3.5" /> All
              </TabsTrigger>
              <TabsTrigger value="saved">
                <Bookmark className="mr-1 h-3.5 w-3.5" /> Saved
              </TabsTrigger>
              <TabsTrigger value="archived">
                <Archive className="mr-1 h-3.5 w-3.5" /> Archived
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search address, city, ZIP…"
                className="w-56 pl-8"
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => setFilterOpen(true)}>
              <Sliders className="h-4 w-4" /> Filters
              {activeFilterCount(filters) > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {activeFilterCount(filters)}
                </Badge>
              )}
            </Button>
            <div className="flex items-center rounded-md border p-0.5">
              <Button
                variant={view === "cards" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-2"
                onClick={() => setView("cards")}
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
              <Button
                variant={view === "table" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-2"
                onClick={() => setView("table")}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={view === "map" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-2"
                onClick={() => setView("map")}
              >
                <MapIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Filter presets */}
        <div className="flex flex-wrap gap-2">
          {FILTER_PRESETS.map((p) => (
            <Button
              key={p.name}
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => toast.info(`Preset "${p.name}" — coming soon`)}
            >
              <Star className="h-3.5 w-3.5" /> {p.name}
            </Button>
          ))}
        </div>

        {/* Content */}
        {propertiesQuery.isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-64 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            hasAny={items.length > 0}
            onSeed={() => seedDemo.mutate()}
            seeding={seedDemo.isPending}
            onAdd={() => setOpenManual(true)}
          />
        ) : view === "cards" ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <PropertyCard
                key={p.id}
                p={p}
                onOpen={() => setSelected(p)}
                onSave={() => toggleSaved.mutate(p)}
                onArchive={() => archive.mutate({ p, archived: !p.archived })}
              />
            ))}
          </div>
        ) : view === "table" ? (
          <PropertyTable items={filtered} onOpen={setSelected} />
        ) : (
          <MapPlaceholder count={filtered.length} />
        )}
      </div>

      <ManualDialog
        open={openManual}
        onOpenChange={setOpenManual}
        userId={userId}
        onSaved={() => qc.invalidateQueries({ queryKey: ["properties"] })}
      />
      <CsvImportDialog
        open={openImport}
        onOpenChange={setOpenImport}
        userId={userId}
        onSaved={() => qc.invalidateQueries({ queryKey: ["properties"] })}
      />
      <UrlImportDialog
        open={openUrl}
        onOpenChange={setOpenUrl}
        userId={userId}
        onSaved={() => qc.invalidateQueries({ queryKey: ["properties"] })}
      />
      <FiltersSheet
        open={filterOpen}
        onOpenChange={setFilterOpen}
        filters={filters}
        setFilters={setFilters}
      />
      <PropertyDetailSheet property={selected} onOpenChange={(o) => !o && setSelected(null)} />
    </>
  );
}

/* ---------------- Empty / cards / table ---------------- */

function EmptyState({
  hasAny,
  onSeed,
  seeding,
  onAdd,
}: {
  hasAny: boolean;
  onSeed: () => void;
  seeding: boolean;
  onAdd: () => void;
}) {
  return (
    <div className="rounded-2xl border-2 border-dashed bg-card p-10 text-center">
      <Building2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
      <h3 className="font-display text-lg font-semibold">
        {hasAny ? "No properties match your filters" : "Add your first property"}
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Import properties from a CSV, paste a listing URL, add one manually, or start with sample
        data to explore the workflow.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Button onClick={onAdd}>
          <Plus className="h-4 w-4" /> Add property
        </Button>
        {!hasAny && (
          <Button variant="outline" onClick={onSeed} disabled={seeding}>
            {seeding ? "Loading…" : "Load sample data"}
          </Button>
        )}
      </div>
    </div>
  );
}

function PropertyCard({
  p,
  onOpen,
  onSave,
  onArchive,
}: {
  p: Property;
  onOpen: () => void;
  onSave: () => void;
  onArchive: () => void;
}) {
  return (
    <Card className="group overflow-hidden transition hover:shadow-md">
      <div className="relative aspect-[16/10] w-full bg-muted">
        {p.image_url ? (
          <img
            src={p.image_url}
            alt={p.address}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-muted-foreground">
            <Building2 className="h-10 w-10" />
          </div>
        )}
        <div className="absolute left-2 top-2 flex flex-wrap gap-1">
          {p.status && (
            <Badge variant="outline" className={PROPERTY_STATUS_TONE[p.status] ?? ""}>
              {p.status}
            </Badge>
          )}
          {p.deal_score != null && (
            <Badge variant="outline" className={scoreBadge(p.deal_score)}>
              Score {p.deal_score}
            </Badge>
          )}
        </div>
        <Button
          size="icon"
          variant="secondary"
          className="absolute right-2 top-2 h-8 w-8 opacity-90"
          onClick={(e) => {
            e.stopPropagation();
            onSave();
          }}
          aria-label={p.saved ? "Unsave" : "Save"}
        >
          <Bookmark className={`h-4 w-4 ${p.saved ? "fill-current" : ""}`} />
        </Button>
      </div>
      <CardContent className="space-y-2 p-4">
        <button onClick={onOpen} className="block text-left w-full">
          <div className="font-display font-semibold leading-tight truncate">{p.address}</div>
          <div className="text-xs text-muted-foreground">
            {[p.city, p.state, p.zip].filter(Boolean).join(", ")}
          </div>
        </button>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="font-display text-lg font-bold">{currency(p.list_price)}</span>
          <span className="text-xs text-muted-foreground">
            {p.property_type ?? "—"} · {p.beds ?? "—"}bd · {p.baths ?? "—"}ba · {num(p.sqft)} sqft
          </span>
        </div>
        <Separator />
        <div className="grid grid-cols-3 gap-2 text-xs">
          <Stat label="ARV" value={currency(p.arv, { compact: true })} />
          <Stat label="Rehab" value={currency(p.rehab_estimate, { compact: true })} />
          <Stat
            label="Profit"
            value={currency(p.estimated_profit, { compact: true })}
            tone="success"
          />
          <Stat label="Rent" value={currency(p.monthly_rent, { compact: true })} />
          <Stat label="Cashflow" value={currency(p.monthly_cashflow, { compact: true })} />
          <Stat label="Assigned" value={p.assigned_to || "—"} />
        </div>
        <div className="flex justify-between pt-1">
          <Button variant="ghost" size="sm" onClick={onArchive}>
            <Archive className="h-3.5 w-3.5" />
            {p.archived ? "Unarchive" : "Archive"}
          </Button>
          <Button variant="outline" size="sm" onClick={onOpen}>
            Open
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "success" }) {
  return (
    <div>
      <div className="text-muted-foreground">{label}</div>
      <div className={`font-medium ${tone === "success" ? "text-success" : ""}`}>{value}</div>
    </div>
  );
}

function PropertyTable({ items, onOpen }: { items: Property[]; onOpen: (p: Property) => void }) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Address</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">ARV</TableHead>
            <TableHead className="text-right">Rehab</TableHead>
            <TableHead className="text-right">Profit</TableHead>
            <TableHead className="text-right">Score</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((p) => (
            <TableRow key={p.id} className="cursor-pointer" onClick={() => onOpen(p)}>
              <TableCell>
                <div className="font-medium">{p.address}</div>
                <div className="text-xs text-muted-foreground">
                  {[p.city, p.state, p.zip].filter(Boolean).join(", ")}
                </div>
              </TableCell>
              <TableCell className="text-sm">{p.property_type ?? "—"}</TableCell>
              <TableCell className="text-right">{currency(p.list_price)}</TableCell>
              <TableCell className="text-right">{currency(p.arv)}</TableCell>
              <TableCell className="text-right">{currency(p.rehab_estimate)}</TableCell>
              <TableCell className="text-right text-success">
                {currency(p.estimated_profit)}
              </TableCell>
              <TableCell className="text-right">
                <Badge variant="outline" className={scoreBadge(p.deal_score)}>
                  {p.deal_score ?? "—"}
                </Badge>
              </TableCell>
              <TableCell>
                {p.status && (
                  <Badge variant="outline" className={PROPERTY_STATUS_TONE[p.status] ?? ""}>
                    {p.status}
                  </Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function MapPlaceholder({ count }: { count: number }) {
  return (
    <div className="grid h-[420px] place-items-center rounded-2xl border-2 border-dashed bg-card text-center">
      <div>
        <MapIcon className="mx-auto mb-2 h-10 w-10 text-muted-foreground" />
        <div className="font-display font-semibold">Map view</div>
        <p className="mt-1 text-sm text-muted-foreground">
          Showing {count} propert{count === 1 ? "y" : "ies"}. Live map with pins coming soon once a
          mapping provider is connected.
        </p>
      </div>
    </div>
  );
}

/* ---------------- Filters ---------------- */

type Filters = {
  market: string;
  zip: string;
  priceMin: string;
  priceMax: string;
  propertyType: string;
  beds: string;
  baths: string;
  sqftMin: string;
  sqftMax: string;
  yearMin: string;
  yearMax: string;
  domMax: string;
  arvMin: string;
  rehabMax: string;
  profitMin: string;
  cashflowMin: string;
  capMin: string;
  scoreMin: number;
  motivation: string;
  source: string;
  strategy: string;
};
const initialFilters: Filters = {
  market: "",
  zip: "",
  priceMin: "",
  priceMax: "",
  propertyType: "",
  beds: "",
  baths: "",
  sqftMin: "",
  sqftMax: "",
  yearMin: "",
  yearMax: "",
  domMax: "",
  arvMin: "",
  rehabMax: "",
  profitMin: "",
  cashflowMin: "",
  capMin: "",
  scoreMin: 0,
  motivation: "",
  source: "",
  strategy: "",
};
function activeFilterCount(f: Filters): number {
  return Object.entries(f).filter(([k, v]) =>
    k === "scoreMin" ? (v as number) > 0 : String(v).trim() !== "",
  ).length;
}
function applyFilters(list: Property[], f: Filters): Property[] {
  const numFilt = (v: any, min?: string, max?: string) => {
    const n = Number(v);
    if (min && !Number.isNaN(Number(min)) && !(n >= Number(min))) return false;
    if (max && !Number.isNaN(Number(max)) && !(n <= Number(max))) return false;
    return true;
  };
  return list.filter((p) => {
    if (
      f.market &&
      !`${p.city ?? ""} ${p.state ?? ""}`.toLowerCase().includes(f.market.toLowerCase())
    )
      return false;
    if (f.zip && !String(p.zip ?? "").includes(f.zip)) return false;
    if (!numFilt(p.list_price, f.priceMin, f.priceMax)) return false;
    if (f.propertyType && p.property_type !== f.propertyType) return false;
    if (f.beds && !(Number(p.beds) >= Number(f.beds))) return false;
    if (f.baths && !(Number(p.baths) >= Number(f.baths))) return false;
    if (!numFilt(p.sqft, f.sqftMin, f.sqftMax)) return false;
    if (!numFilt(p.year_built, f.yearMin, f.yearMax)) return false;
    if (f.domMax && !(Number(p.days_on_market ?? 0) <= Number(f.domMax))) return false;
    if (!numFilt(p.arv, f.arvMin)) return false;
    if (f.rehabMax && !(Number(p.rehab_estimate ?? 0) <= Number(f.rehabMax))) return false;
    if (!numFilt(p.estimated_profit, f.profitMin)) return false;
    if (!numFilt(p.monthly_cashflow, f.cashflowMin)) return false;
    if (!numFilt(p.cap_rate, f.capMin)) return false;
    if (f.scoreMin > 0 && !(Number(p.deal_score ?? 0) >= f.scoreMin)) return false;
    if (f.motivation && p.motivation !== f.motivation) return false;
    if (f.source && p.source !== f.source) return false;
    if (f.strategy && p.strategy !== f.strategy) return false;
    return true;
  });
}

function FiltersSheet({
  open,
  onOpenChange,
  filters,
  setFilters,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  filters: Filters;
  setFilters: (f: Filters) => void;
}) {
  const set = (k: keyof Filters, v: any) => setFilters({ ...filters, [k]: v });
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
          <SheetDescription>Narrow the property list.</SheetDescription>
        </SheetHeader>
        <div className="mt-4 space-y-4 p-1 pb-24">
          <FieldPair>
            <Field label="Market">
              <Input
                value={filters.market}
                onChange={(e) => set("market", e.target.value)}
                placeholder="Austin, TX"
              />
            </Field>
            <Field label="ZIP">
              <Input
                value={filters.zip}
                onChange={(e) => set("zip", e.target.value)}
                placeholder="78702"
              />
            </Field>
          </FieldPair>
          <FieldPair>
            <Field label="Price min">
              <Input value={filters.priceMin} onChange={(e) => set("priceMin", e.target.value)} />
            </Field>
            <Field label="Price max">
              <Input value={filters.priceMax} onChange={(e) => set("priceMax", e.target.value)} />
            </Field>
          </FieldPair>
          <Field label="Property type">
            <Select
              value={filters.propertyType || "__any"}
              onValueChange={(v) => set("propertyType", v === "__any" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__any">Any</SelectItem>
                {PROPERTY_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <FieldPair>
            <Field label="Beds (min)">
              <Input value={filters.beds} onChange={(e) => set("beds", e.target.value)} />
            </Field>
            <Field label="Baths (min)">
              <Input value={filters.baths} onChange={(e) => set("baths", e.target.value)} />
            </Field>
          </FieldPair>
          <FieldPair>
            <Field label="Sqft min">
              <Input value={filters.sqftMin} onChange={(e) => set("sqftMin", e.target.value)} />
            </Field>
            <Field label="Sqft max">
              <Input value={filters.sqftMax} onChange={(e) => set("sqftMax", e.target.value)} />
            </Field>
          </FieldPair>
          <FieldPair>
            <Field label="Year built (min)">
              <Input value={filters.yearMin} onChange={(e) => set("yearMin", e.target.value)} />
            </Field>
            <Field label="Year built (max)">
              <Input value={filters.yearMax} onChange={(e) => set("yearMax", e.target.value)} />
            </Field>
          </FieldPair>
          <Field label="Max days on market">
            <Input value={filters.domMax} onChange={(e) => set("domMax", e.target.value)} />
          </Field>
          <FieldPair>
            <Field label="ARV min">
              <Input value={filters.arvMin} onChange={(e) => set("arvMin", e.target.value)} />
            </Field>
            <Field label="Rehab max">
              <Input value={filters.rehabMax} onChange={(e) => set("rehabMax", e.target.value)} />
            </Field>
          </FieldPair>
          <FieldPair>
            <Field label="Profit min">
              <Input value={filters.profitMin} onChange={(e) => set("profitMin", e.target.value)} />
            </Field>
            <Field label="Cashflow min">
              <Input
                value={filters.cashflowMin}
                onChange={(e) => set("cashflowMin", e.target.value)}
              />
            </Field>
          </FieldPair>
          <Field label="Cap rate min (%)">
            <Input value={filters.capMin} onChange={(e) => set("capMin", e.target.value)} />
          </Field>
          <Field label={`Deal score min: ${filters.scoreMin}`}>
            <Slider
              min={0}
              max={100}
              step={5}
              value={[filters.scoreMin]}
              onValueChange={([v]) => set("scoreMin", v)}
            />
          </Field>
          <FieldPair>
            <Field label="Motivation">
              <Select
                value={filters.motivation || "__any"}
                onValueChange={(v) => set("motivation", v === "__any" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__any">Any</SelectItem>
                  {["Low", "Medium", "High"].map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Strategy">
              <Select
                value={filters.strategy || "__any"}
                onValueChange={(v) => set("strategy", v === "__any" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__any">Any</SelectItem>
                  {STRATEGIES.map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </FieldPair>
          <Field label="Lead source">
            <Input
              value={filters.source}
              onChange={(e) => set("source", e.target.value)}
              placeholder="MLS, Zillow…"
            />
          </Field>
        </div>
        <div className="sticky bottom-0 flex gap-2 border-t bg-background p-3">
          <Button variant="outline" className="flex-1" onClick={() => setFilters(initialFilters)}>
            <X className="h-4 w-4" /> Clear all
          </Button>
          <Button className="flex-1" onClick={() => onOpenChange(false)}>
            Apply
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
function FieldPair({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}

/* ---------------- Manual add ---------------- */

function ManualDialog({
  open,
  onOpenChange,
  userId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  userId: string | null;
  onSaved: () => void;
}) {
  const [f, setF] = useState<Record<string, any>>({});
  const set = (k: string, v: any) => setF((p) => ({ ...p, [k]: v }));
  const save = async () => {
    if (!userId) return;
    if (!f.address) {
      toast.error("Address is required");
      return;
    }
    const payload: any = { user_id: userId };
    for (const k of Object.keys(f)) {
      const v = f[k];
      if (v === "" || v == null) continue;
      payload[k] = [
        "beds",
        "baths",
        "sqft",
        "year_built",
        "list_price",
        "arv",
        "rehab_estimate",
        "monthly_rent",
        "monthly_cashflow",
        "cap_rate",
        "estimated_profit",
        "days_on_market",
        "lot_size",
        "deal_score",
      ].includes(k)
        ? Number(v)
        : v;
    }
    const { error } = await (supabase.from("properties") as any).insert(payload);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Property added");
    setF({});
    onOpenChange(false);
    onSaved();
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add property</DialogTitle>
          <DialogDescription>Enter as many details as you have.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Address *">
            <Input value={f.address ?? ""} onChange={(e) => set("address", e.target.value)} />
          </Field>
          <Field label="City">
            <Input value={f.city ?? ""} onChange={(e) => set("city", e.target.value)} />
          </Field>
          <Field label="State">
            <Input value={f.state ?? ""} onChange={(e) => set("state", e.target.value)} />
          </Field>
          <Field label="ZIP">
            <Input value={f.zip ?? ""} onChange={(e) => set("zip", e.target.value)} />
          </Field>
          <Field label="Property type">
            <Select value={f.property_type ?? ""} onValueChange={(v) => set("property_type", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {PROPERTY_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Strategy">
            <Select value={f.strategy ?? ""} onValueChange={(v) => set("strategy", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {STRATEGIES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Beds">
            <Input
              type="number"
              value={f.beds ?? ""}
              onChange={(e) => set("beds", e.target.value)}
            />
          </Field>
          <Field label="Baths">
            <Input
              type="number"
              step="0.5"
              value={f.baths ?? ""}
              onChange={(e) => set("baths", e.target.value)}
            />
          </Field>
          <Field label="Sqft">
            <Input
              type="number"
              value={f.sqft ?? ""}
              onChange={(e) => set("sqft", e.target.value)}
            />
          </Field>
          <Field label="Year built">
            <Input
              type="number"
              value={f.year_built ?? ""}
              onChange={(e) => set("year_built", e.target.value)}
            />
          </Field>
          <Field label="Asking price">
            <Input
              type="number"
              value={f.list_price ?? ""}
              onChange={(e) => set("list_price", e.target.value)}
            />
          </Field>
          <Field label="ARV">
            <Input type="number" value={f.arv ?? ""} onChange={(e) => set("arv", e.target.value)} />
          </Field>
          <Field label="Rehab estimate">
            <Input
              type="number"
              value={f.rehab_estimate ?? ""}
              onChange={(e) => set("rehab_estimate", e.target.value)}
            />
          </Field>
          <Field label="Monthly rent">
            <Input
              type="number"
              value={f.monthly_rent ?? ""}
              onChange={(e) => set("monthly_rent", e.target.value)}
            />
          </Field>
          <Field label="Owner name">
            <Input value={f.owner_name ?? ""} onChange={(e) => set("owner_name", e.target.value)} />
          </Field>
          <Field label="Listing agent">
            <Input
              value={f.listing_agent ?? ""}
              onChange={(e) => set("listing_agent", e.target.value)}
            />
          </Field>
          <Field label="Agent phone">
            <Input
              value={f.agent_phone ?? ""}
              onChange={(e) => set("agent_phone", e.target.value)}
            />
          </Field>
          <Field label="Agent email">
            <Input
              value={f.agent_email ?? ""}
              onChange={(e) => set("agent_email", e.target.value)}
            />
          </Field>
          <Field label="Listing URL">
            <Input
              value={f.listing_url ?? ""}
              onChange={(e) => set("listing_url", e.target.value)}
            />
          </Field>
          <Field label="Source">
            <Input
              value={f.source ?? ""}
              onChange={(e) => set("source", e.target.value)}
              placeholder="MLS, wholesaler…"
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Notes">
              <Textarea value={f.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
            </Field>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save}>Save property</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- CSV import ---------------- */

function CsvImportDialog({
  open,
  onOpenChange,
  userId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  userId: string | null;
  onSaved: () => void;
}) {
  const [step, setStep] = useState<"upload" | "map" | "review">("upload");
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setStep("upload");
    setRows([]);
    setHeaders([]);
    setMapping({});
  };

  const onFile = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const heads = res.meta.fields ?? [];
        setHeaders(heads);
        setRows(res.data as any[]);
        // Auto-map by fuzzy match
        const m: Record<string, string> = {};
        CSV_FIELD_MAP.forEach((f) => {
          const h = heads.find(
            (h) =>
              h.toLowerCase().replace(/[^a-z0-9]/g, "") === f.key.replace(/_/g, "") ||
              h.toLowerCase().includes(f.label.split(" ")[0].toLowerCase()),
          );
          if (h) m[f.key] = h;
        });
        setMapping(m);
        setStep("map");
      },
      error: (err) => toast.error(`CSV parse failed: ${err.message}`),
    });
  };

  const commitImport = async () => {
    if (!userId) return;
    setBusy(true);
    const numericKeys = new Set([
      "beds",
      "baths",
      "sqft",
      "year_built",
      "list_price",
      "arv",
      "rehab_estimate",
      "monthly_rent",
      "lot_size",
    ]);
    const payload = rows
      .map((r) => {
        const out: any = { user_id: userId };
        for (const f of CSV_FIELD_MAP) {
          const src = mapping[f.key];
          if (!src) continue;
          const raw = r[src];
          if (raw == null || raw === "") continue;
          out[f.key] = numericKeys.has(f.key) ? Number(String(raw).replace(/[$,]/g, "")) : raw;
        }
        return out;
      })
      .filter((p) => p.address);
    if (payload.length === 0) {
      toast.error("No valid rows with an address");
      setBusy(false);
      return;
    }
    const { error } = await (supabase.from("properties") as any).insert(payload);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Imported ${payload.length} properties`);
    reset();
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import properties from CSV</DialogTitle>
          <DialogDescription>
            {step === "upload" && "Upload a CSV file with property data."}
            {step === "map" && "Match your CSV columns to Boliviq fields."}
            {step === "review" && "Review and confirm the import."}
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-3">
            <div className="rounded-2xl border-2 border-dashed p-8 text-center">
              <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Drop a .csv file here or</p>
              <Label htmlFor="csv-file" className="mt-2 inline-block cursor-pointer">
                <span className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90">
                  Choose file
                </span>
                <Input
                  id="csv-file"
                  type="file"
                  accept=".csv"
                  className="sr-only"
                  onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
                />
              </Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Supported columns include address, city, state, ZIP, price, beds, baths, sqft, ARV,
              rehab, rent, notes and more. You can map columns in the next step.
            </p>
          </div>
        )}

        {step === "map" && (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              {rows.length} rows detected. Map each Boliviq field to a CSV column.
            </div>
            <div className="max-h-[50vh] overflow-y-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Boliviq field</TableHead>
                    <TableHead>CSV column</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {CSV_FIELD_MAP.map((f) => (
                    <TableRow key={f.key}>
                      <TableCell className="text-sm">
                        {f.label}{" "}
                        {f.key === "address" && <span className="text-destructive">*</span>}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={mapping[f.key] ?? "__skip"}
                          onValueChange={(v) =>
                            setMapping({ ...mapping, [f.key]: v === "__skip" ? "" : v })
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Skip" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__skip">Skip</SelectItem>
                            {headers.map((h) => (
                              <SelectItem key={h} value={h}>
                                {h}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={reset}>
                Back
              </Button>
              <Button onClick={commitImport} disabled={busy || !mapping.address}>
                {busy ? "Importing…" : `Import ${rows.length} properties`}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- URL import ---------------- */

function UrlImportDialog({
  open,
  onOpenChange,
  userId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  userId: string | null;
  onSaved: () => void;
}) {
  const [url, setUrl] = useState("");
  const [address, setAddress] = useState("");
  const save = async () => {
    if (!userId) return;
    if (!url && !address) {
      toast.error("Enter a URL or address");
      return;
    }
    const { error } = await (supabase.from("properties") as any).insert({
      user_id: userId,
      address: address || "Imported from URL",
      listing_url: url,
      source: "URL import",
      status: "warm",
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Property added. Fill in details on the property page.");
    setUrl("");
    setAddress("");
    onOpenChange(false);
    onSaved();
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import from listing URL</DialogTitle>
          <DialogDescription>
            Paste a link to a Zillow, Redfin, MLS or wholesaler listing. We save the URL and
            reference address so you can enrich details next.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Listing URL">
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
          </Field>
          <Field label="Address (optional)">
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Main St, Austin TX"
            />
          </Field>
          <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
            Automatic scraping of Zillow/Redfin/MLS pages requires an authorized data provider. Once
            connected in Integrations, we'll auto-fill photos, price, and property details from a
            URL.
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save}>Save property</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Property detail sheet ---------------- */

function PropertyDetailSheet({
  property,
  onOpenChange,
}: {
  property: Property | null;
  onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Property | null>(property);
  const [saving, setSaving] = useState(false);

  // sync draft when property changes
  useEffect(() => {
    setDraft(property);
  }, [property]);

  const patch = async (u: Partial<Property>) => {
    if (!property) return;
    setSaving(true);
    const { error } = await (supabase.from("properties") as any).update(u).eq("id", property.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["properties"] });
    toast.success("Saved");
  };

  if (!property || !draft) return null;

  return (
    <Sheet open={!!property} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-display truncate">{property.address}</SheetTitle>
          <SheetDescription>
            {[property.city, property.state, property.zip].filter(Boolean).join(", ")}
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="overview" className="mt-4">
          <TabsList className="flex-wrap h-auto">
            {[
              "overview",
              "financials",
              "comps",
              "rehab",
              "contacts",
              "calls",
              "notes",
              "tasks",
              "offers",
              "documents",
              "activity",
            ].map((t) => (
              <TabsTrigger key={t} value={t} className="capitalize">
                {t}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview" className="space-y-4 pt-4">
            {property.image_url && (
              <img
                src={property.image_url}
                alt=""
                className="aspect-video w-full rounded-lg object-cover"
              />
            )}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <KV label="Price" value={currency(property.list_price)} />
              <KV label="ARV" value={currency(property.arv)} />
              <KV label="Rehab" value={currency(property.rehab_estimate)} />
              <KV label="Est. profit" value={currency(property.estimated_profit)} tone="success" />
              <KV label="Monthly rent" value={currency(property.monthly_rent)} />
              <KV label="Cashflow" value={currency(property.monthly_cashflow)} />
              <KV label="Cap rate" value={pct(property.cap_rate)} />
              <KV label="Deal score" value={String(property.deal_score ?? "—")} />
              <KV label="DOM" value={property.days_on_market ?? "—"} />
              <KV
                label="Beds / Baths"
                value={`${property.beds ?? "—"} / ${property.baths ?? "—"}`}
              />
              <KV label="Sqft" value={num(property.sqft)} />
              <KV label="Year built" value={property.year_built ?? "—"} />
            </div>
            {property.listing_url && (
              <a
                href={property.listing_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" /> View original listing
              </a>
            )}
            <div className="space-y-2 rounded-lg border p-3">
              <Label className="text-xs">Notes</Label>
              <Textarea
                value={draft.notes ?? ""}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                onBlur={() => draft.notes !== property.notes && patch({ notes: draft.notes })}
                rows={4}
              />
              {saving && <p className="text-xs text-muted-foreground">Saving…</p>}
            </div>
          </TabsContent>

          <TabsContent value="financials" className="space-y-3 pt-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["Asking price", "list_price"],
                ["ARV", "arv"],
                ["Rehab", "rehab_estimate"],
                ["Est. profit", "estimated_profit"],
                ["Offer price", "offer_price"],
                ["Monthly rent", "monthly_rent"],
                ["Monthly cashflow", "monthly_cashflow"],
                ["Cap rate (%)", "cap_rate"],
                ["Deal score", "deal_score"],
              ].map(([label, key]) => (
                <Field key={key} label={label}>
                  <Input
                    type="number"
                    value={draft[key] ?? ""}
                    onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                    onBlur={() => {
                      const v = draft[key];
                      const nv = v === "" || v == null ? null : Number(v);
                      if (nv !== property[key]) patch({ [key]: nv });
                    }}
                  />
                </Field>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="comps" className="pt-4">
            <ComingSoonTab
              title="Comparable sales"
              body="Connect a data provider (MLS, ATTOM) in Integrations to pull comps automatically."
            />
          </TabsContent>
          <TabsContent value="rehab" className="pt-4">
            <ComingSoonTab
              title="Rehab estimator"
              body="Room-by-room rehab estimator is in the Deal Analyzer module."
            />
          </TabsContent>
          <TabsContent value="contacts" className="pt-4">
            <div className="space-y-2 text-sm">
              <KV label="Owner" value={property.owner_name || "—"} />
              <KV label="Listing agent" value={property.listing_agent || "—"} />
              <KV label="Agent phone" value={property.agent_phone || "—"} />
              <KV label="Agent email" value={property.agent_email || "—"} />
            </div>
          </TabsContent>
          {["calls", "notes", "tasks", "offers", "documents", "activity"].map((t) => (
            <TabsContent key={t} value={t} className="pt-4">
              <ComingSoonTab
                title={t.charAt(0).toUpperCase() + t.slice(1)}
                body="Linked records for this property will appear here as you use the CRM."
              />
            </TabsContent>
          ))}
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function KV({ label, value, tone }: { label: string; value: React.ReactNode; tone?: "success" }) {
  return (
    <div className="rounded-md bg-muted/40 p-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`font-medium ${tone === "success" ? "text-success" : ""}`}>{value}</div>
    </div>
  );
}
function ComingSoonTab({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border-2 border-dashed p-6 text-center">
      <div className="font-display font-semibold">{title}</div>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
