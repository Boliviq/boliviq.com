import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Flag, Heart, MapPin, MessageSquare, Plus, Search, Store } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MARKETPLACE_CATEGORIES, type MarketplaceCategoryId } from "@/lib/canons";
import { MARKETPLACE_SEED, type SeedListing } from "@/lib/marketplace-seed";
import { supabase } from "@/integrations/supabase/client";
import { isMissingRelation } from "@/lib/supabase-safe";
import { useCurrentUser } from "@/hooks/use-current-user";
import { currency } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/marketplace")({
  component: MarketplacePage,
});

function MarketplacePage() {
  const { userId } = useCurrentUser();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<MarketplaceCategoryId | "all">("all");
  const [view, setView] = useState<"list" | "cards">("cards");
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [posted, setPosted] = useState<SeedListing[]>([]);
  const [compose, setCompose] = useState(false);
  const [draft, setDraft] = useState({ title: "", description: "", category: "repairs" as MarketplaceCategoryId, location: "", price: "" });

  const remote = useQuery({
    queryKey: ["marketplace-listings", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await (supabase.from("marketplace_listings") as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        if (isMissingRelation(error)) return [] as SeedListing[];
        throw error;
      }
      return ((data ?? []) as Record<string, unknown>[]).map((row): SeedListing => ({
        id: String(row.id),
        title: String(row.title ?? "Listing"),
        description: String(row.description ?? ""),
        category: (row.category as MarketplaceCategoryId) || "homes_for_sale",
        location: String(row.location ?? [row.city, row.state].filter(Boolean).join(", ")),
        city: String(row.city ?? ""),
        state: String(row.state ?? ""),
        price: row.price != null ? Number(row.price) : undefined,
        budget: row.budget != null ? Number(row.budget) : undefined,
        photos: Array.isArray(row.photos) ? row.photos as string[] : [],
        postedBy: "You",
        role: "homeowner",
        createdAt: String(row.created_at ?? "").slice(0, 10),
        propertyLabel: undefined,
        projectLabel: undefined,
      }));
    },
  });

  const listings = useMemo(() => {
    const merged = [...posted, ...(remote.data ?? []), ...MARKETPLACE_SEED];
    return merged.filter((l) => {
      const hay = `${l.title} ${l.description} ${l.location}`.toLowerCase();
      const okQ = !q || hay.includes(q.toLowerCase());
      const okC = category === "all" || l.category === category;
      return okQ && okC;
    });
  }, [posted, remote.data, q, category]);

  const publish = async () => {
    if (!draft.title.trim()) {
      toast.error("Add a title");
      return;
    }
    const local: SeedListing = {
      id: `local-${Date.now()}`,
      title: draft.title,
      description: draft.description,
      category: draft.category,
      location: draft.location || "Unspecified",
      city: draft.location,
      state: "",
      price: draft.price ? Number(draft.price) : undefined,
      photos: [],
      postedBy: "You",
      role: "homeowner",
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setPosted((p) => [local, ...p]);
    setCompose(false);
    setDraft({ title: "", description: "", category: "repairs", location: "", price: "" });
    toast.success("Listing posted", { description: "It can become a lead, project, or conversation from Messages." });

    if (!userId) return;
    const { error } = await (supabase.from("marketplace_listings") as any).insert({
      user_id: userId,
      title: local.title,
      description: local.description,
      category: local.category,
      location: local.location,
      price: local.price ?? null,
      visibility: "public",
      status: "active",
    });
    if (error && !isMissingRelation(error)) toast.error(error.message);
  };

  return (
    <>
      <PageHeader
        title="Marketplace"
        description="Craigslist-simple, built for real estate and construction. A repair post can become a contractor lead; an accepted estimate becomes a project."
        action={
          <Button className="gap-2 bg-[#70bf2b] hover:bg-[#80ce38]" onClick={() => setCompose(true)}>
            <Plus className="h-4 w-4" /> Post listing
          </Button>
        }
      />
      <div className="space-y-4 p-4 sm:p-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search location, keyword, project type…" className="pl-9" />
          </div>
          <div className="flex gap-2">
            <Button variant={view === "cards" ? "default" : "outline"} size="sm" onClick={() => setView("cards")}>Cards</Button>
            <Button variant={view === "list" ? "default" : "outline"} size="sm" onClick={() => setView("list")}>List</Button>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setCategory("all")}
            className={`shrink-0 rounded-full border px-3 py-1 text-xs ${category === "all" ? "border-[#70bf2b] bg-[#70bf2b]/10 font-semibold" : ""}`}
          >
            All
          </button>
          {MARKETPLACE_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs ${category === c.id ? "border-[#70bf2b] bg-[#70bf2b]/10 font-semibold" : ""}`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {listings.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed p-10 text-center">
            <Store className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <div className="font-display font-semibold">No listings match</div>
            <p className="mt-1 text-sm text-muted-foreground">Try another category or post the first one.</p>
          </div>
        ) : view === "cards" ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {listings.map((l) => (
              <ListingCard
                key={l.id}
                listing={l}
                saved={!!saved[l.id]}
                onSave={() => setSaved((s) => ({ ...s, [l.id]: !s[l.id] }))}
              />
            ))}
          </div>
        ) : (
          <div className="divide-y rounded-xl border bg-white">
            {listings.map((l) => (
              <div key={l.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="font-medium">{l.title}</div>
                  <div className="text-xs text-muted-foreground">{l.location} · {catLabel(l.category)} · {l.postedBy}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{priceLabel(l)}</span>
                  <Link to="/messages"><Button size="sm" variant="outline">Message</Button></Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={compose} onOpenChange={setCompose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Post a listing</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Title</Label><Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></div>
            <div className="space-y-1">
              <Label>Category</Label>
              <Select value={draft.category} onValueChange={(v) => setDraft({ ...draft, category: v as MarketplaceCategoryId })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MARKETPLACE_CATEGORIES.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Location</Label><Input value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} /></div>
            <div className="space-y-1"><Label>Price or budget</Label><Input type="number" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} /></div>
            <div className="space-y-1"><Label>Description</Label><Textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} rows={4} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompose(false)}>Cancel</Button>
            <Button onClick={publish} className="bg-[#70bf2b] hover:bg-[#80ce38]">Publish</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function catLabel(id: string) {
  return MARKETPLACE_CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

function priceLabel(l: SeedListing) {
  if (l.price) return currency(l.price);
  if (l.budget) return `Budget ${currency(l.budget)}`;
  return "Contact";
}

function ListingCard({ listing: l, saved, onSave }: { listing: SeedListing; saved: boolean; onSave: () => void }) {
  return (
    <Card className="overflow-hidden">
      {l.photos[0] ? (
        <img src={l.photos[0]} alt="" className="h-40 w-full object-cover" />
      ) : (
        <div className="grid h-28 place-items-center bg-[#071729] text-white/70"><Store className="h-8 w-8" /></div>
      )}
      <CardContent className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="font-semibold leading-snug">{l.title}</div>
          <Badge variant="outline" className="shrink-0">{catLabel(l.category)}</Badge>
        </div>
        <p className="line-clamp-2 text-sm text-muted-foreground">{l.description}</p>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" /> {l.location}
        </div>
        {(l.propertyLabel || l.projectLabel) && (
          <div className="text-xs text-muted-foreground">
            Linked: {l.propertyLabel ?? l.projectLabel}
          </div>
        )}
        <div className="flex items-center justify-between pt-1">
          <div className="font-display text-lg font-bold">{priceLabel(l)}</div>
          <div className="text-xs text-muted-foreground">{l.postedBy}</div>
        </div>
        <div className="flex gap-2">
          <Link to="/messages" className="flex-1">
            <Button size="sm" className="w-full gap-1"><MessageSquare className="h-3.5 w-3.5" /> Message</Button>
          </Link>
          <Button size="sm" variant="outline" onClick={() => { onSave(); toast.success(saved ? "Removed from saved" : "Saved"); }}>
            <Heart className={`h-3.5 w-3.5 ${saved ? "fill-destructive text-destructive" : ""}`} />
          </Button>
          <Button size="sm" variant="outline" onClick={() => toast.message("Report received", { description: "Moderation queue will review this listing." })}>
            <Flag className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
