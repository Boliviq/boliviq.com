import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  Flag,
  FolderKanban,
  Heart,
  MapPin,
  MessageSquare,
  Plus,
  Search,
  Store,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MARKETPLACE_CATEGORIES, type MarketplaceCategoryId } from "@/lib/canons";
import type { SeedListing } from "@/lib/marketplace-seed";
import { useAccount } from "@/hooks/use-current-user";
import { currency } from "@/lib/format";
import { categoryLabel, type MarketplaceListing } from "@/lib/workspace-store";
import {
  useCreateListing,
  useSavedListingIds,
  useToggleSavedListing,
  useReportListing,
  useCreateProject,
  useStartConversation,
} from "@/hooks/use-workspace-data";
import {
  useConvertListingToLead,
  useDeleteSavedSearch,
  useRecordListingView,
  useSaveSearch,
  useSavedSearches,
  useSearchListings,
} from "@/hooks/use-marketplace";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/marketplace")({
  component: MarketplacePage,
});

function MarketplacePage() {
  const { account, userId } = useAccount();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<MarketplaceCategoryId | "all">("all");
  const [location, setLocation] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [savedOnly, setSavedOnly] = useState(false);
  const [view, setView] = useState<"list" | "cards" | "map">("cards");
  const [compose, setCompose] = useState(false);
  const [draft, setDraft] = useState({
    title: "",
    description: "",
    category: "repairs" as MarketplaceCategoryId,
    location: "",
    price: "",
  });
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const filters = {
    query: q || undefined,
    category: category === "all" ? undefined : category,
    location: location || undefined,
    minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    savedOnly: savedOnly || undefined,
  };
  const { data: listings = [], isLoading } = useSearchListings(filters);
  const { data: savedIds = [] } = useSavedListingIds();
  const { data: savedSearches = [] } = useSavedSearches();
  const createListing = useCreateListing();
  const toggleSaved = useToggleSavedListing();
  const reportListing = useReportListing();
  const createProject = useCreateProject();
  const startConversation = useStartConversation();
  const convertLead = useConvertListingToLead();
  const recordView = useRecordListingView();
  const saveSearch = useSaveSearch();
  const deleteSearch = useDeleteSavedSearch();
  const saved = new Set(savedIds);

  const byLocation = useMemo(() => {
    const groups = new Map<string, MarketplaceListing[]>();
    for (const l of listings) {
      const key = l.location || "Unspecified";
      groups.set(key, [...(groups.get(key) ?? []), l]);
    }
    return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [listings]);

  const publish = async () => {
    if (!draft.title.trim()) {
      toast.error("Add a title");
      return;
    }
    if (!userId) {
      toast.error("Sign in to use your workspace");
      return;
    }
    setUploading(true);
    try {
      const photos: string[] = [];
      for (const file of photoFiles.slice(0, 8)) {
        const path = `${userId}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]+/g, "")}`;
        const { error } = await supabase.storage.from("marketplace-media").upload(path, file, {
          upsert: false,
        });
        if (error) throw error;
        const { data } = supabase.storage.from("marketplace-media").getPublicUrl(path);
        photos.push(data.publicUrl);
      }
      createListing.mutate(
        {
          title: draft.title,
          description: draft.description,
          category: draft.category,
          location: draft.location || "Unspecified",
          price: draft.price ? Number(draft.price) : undefined,
          photos,
          role: account.primary_role,
          authorName: account.full_name || "You",
          postedBy: account.full_name || "You",
          visibility: "public",
        },
        {
          onSuccess: () => {
            setCompose(false);
            setDraft({ title: "", description: "", category: "repairs", location: "", price: "" });
            setPhotoFiles([]);
            toast.success("Listing posted", {
              description: "Message, convert to a lead, or turn it into a project.",
            });
          },
          onError: (e) =>
            toast.error(e instanceof Error ? e.message : "Could not post the listing"),
        },
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not upload photos");
    } finally {
      setUploading(false);
    }
  };

  const messageAbout = (listing: MarketplaceListing) => {
    if (!userId) {
      toast.error("Sign in to use your workspace");
      return;
    }
    recordView.mutate(listing.id);
    startConversation.mutate(
      {
        title: `Re: ${listing.title}`,
        context: `Listing · ${listing.location}`,
        firstMessage: `I'm interested in "${listing.title}" at ${listing.location}.`,
        extra: {
          listing: listing.title,
          listingId: listing.id,
          property: listing.propertyLabel,
          participants: [account.full_name || "You", listing.postedBy],
        },
      },
      {
        onSuccess: (thread) => {
          toast.success("Conversation started");
          void navigate({ to: "/messages", search: { thread } });
        },
        onError: (e) =>
          toast.error(e instanceof Error ? e.message : "Could not start the conversation"),
      },
    );
  };

  const convert = (listing: MarketplaceListing) => {
    if (!userId) {
      toast.error("Sign in to use your workspace");
      return;
    }
    createProject.mutate(
      {
        name: listing.title,
        address: listing.location || "Unspecified",
        status: "new",
        budget: listing.budget ?? listing.price ?? 0,
        spent: 0,
        nextMilestone: "Collect estimates",
      },
      {
        onSuccess: (project) => {
          startConversation.mutate(
            {
              title: project.name,
              context: `Project · ${project.address}`,
              firstMessage: `Opened a project from marketplace listing "${listing.title}".`,
              extra: {
                project: project.name,
                property: project.address,
                listing: listing.title,
                listingId: listing.id,
              },
            },
            {
              onSuccess: () => {
                toast.success("Project created", {
                  description: "The listing, conversation, and project now share a record.",
                });
                void navigate({ to: "/projects" });
              },
              onError: (e) =>
                toast.error(e instanceof Error ? e.message : "Could not start the conversation"),
            },
          );
        },
        onError: (e) =>
          toast.error(e instanceof Error ? e.message : "Could not create the project"),
      },
    );
  };

  const toLead = (listing: MarketplaceListing) => {
    if (!userId) {
      toast.error("Sign in to use your workspace");
      return;
    }
    convertLead.mutate(listing.id, {
      onSuccess: () => {
        toast.success("Lead created from listing", {
          description: "It is on your pipeline as a new marketplace lead.",
        });
        void navigate({ to: "/leads" });
      },
      onError: (e) => toast.error(e instanceof Error ? e.message : "Could not create the lead"),
    });
  };

  return (
    <>
      <PageHeader
        title="Marketplace"
        description="Craigslist-simple, built for real estate and construction. A repair post can become a contractor lead; an accepted estimate becomes a project."
        action={
          <Button
            className="gap-2 bg-[#70bf2b] hover:bg-[#80ce38]"
            onClick={() => setCompose(true)}
          >
            <Plus className="h-4 w-4" /> Post listing
          </Button>
        }
      />
      <div className="space-y-4 p-4 sm:p-8">
        <div className="grid gap-3 lg:grid-cols-[1fr_160px_120px_120px_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search keyword…"
              className="pl-9"
            />
          </div>
          <Input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="City or area"
          />
          <Input
            type="number"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            placeholder="Min $"
          />
          <Input
            type="number"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            placeholder="Max $"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              variant={view === "cards" ? "default" : "outline"}
              size="sm"
              onClick={() => setView("cards")}
            >
              Cards
            </Button>
            <Button
              variant={view === "list" ? "default" : "outline"}
              size="sm"
              onClick={() => setView("list")}
            >
              List
            </Button>
            <Button
              variant={view === "map" ? "default" : "outline"}
              size="sm"
              onClick={() => setView("map")}
            >
              Map
            </Button>
            <Button
              variant={savedOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setSavedOnly((v) => !v)}
            >
              Saved
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              onClick={() => {
                if (!userId) return;
                saveSearch.mutate(
                  {
                    name: q || location || categoryLabel(category === "all" ? "repairs" : category),
                    query: q || undefined,
                    category,
                    location: location || undefined,
                    minPrice: minPrice ? Number(minPrice) : undefined,
                    maxPrice: maxPrice ? Number(maxPrice) : undefined,
                    alertEnabled: true,
                  },
                  {
                    onSuccess: () =>
                      toast.success("Search saved", {
                        description: "New matches can alert you once email delivery is connected.",
                      }),
                    onError: (e) =>
                      toast.error(e instanceof Error ? e.message : "Could not save search"),
                  },
                );
              }}
            >
              <Bell className="h-3.5 w-3.5" /> Save search
            </Button>
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

        {savedSearches.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {savedSearches.map((s) => (
              <button
                key={s.id}
                type="button"
                className="flex items-center gap-2 rounded-full border px-3 py-1 text-xs"
                onClick={() => {
                  setQ(s.query);
                  setCategory((s.category as MarketplaceCategoryId) || "all");
                  setLocation(s.location ?? "");
                  setMinPrice(s.minPrice != null ? String(s.minPrice) : "");
                  setMaxPrice(s.maxPrice != null ? String(s.maxPrice) : "");
                }}
              >
                {s.alertEnabled && <Bell className="h-3 w-3 text-[#70bf2b]" />}
                {s.name}
                <span
                  className="text-muted-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSearch.mutate(s.id);
                  }}
                >
                  ×
                </span>
              </button>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="rounded-2xl border-2 border-dashed p-10 text-center text-sm text-muted-foreground">
            Loading listings…
          </div>
        ) : listings.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed p-10 text-center">
            <Store className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <div className="font-display font-semibold">No listings match</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Try another category or post the first one.
            </p>
          </div>
        ) : view === "map" ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {byLocation.map(([place, rows]) => (
              <Card key={place}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-center gap-2 font-semibold">
                    <MapPin className="h-4 w-4 text-[#70bf2b]" /> {place}
                    <Badge variant="outline">{rows.length}</Badge>
                  </div>
                  {rows.map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      className="block w-full rounded-md border p-2 text-left text-sm hover:bg-muted/50"
                      onClick={() => {
                        recordView.mutate(l.id);
                        messageAbout(l);
                      }}
                    >
                      <div className="font-medium">{l.title}</div>
                      <div className="text-xs text-muted-foreground">{priceLabel(l)}</div>
                    </button>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : view === "cards" ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {listings.map((l) => (
              <ListingCard
                key={l.id}
                listing={l}
                saved={saved.has(l.id)}
                onOpen={() => recordView.mutate(l.id)}
                onSave={() => {
                  if (!userId) {
                    toast.error("Sign in to use your workspace");
                    return;
                  }
                  const wasSaved = saved.has(l.id);
                  toggleSaved.mutate(l.id);
                  toast.success(wasSaved ? "Removed from saved" : "Saved");
                }}
                onMessage={() => messageAbout(l)}
                onProject={() => convert(l)}
                onLead={() => toLead(l)}
                onReport={() => {
                  if (!userId) {
                    toast.error("Sign in to use your workspace");
                    return;
                  }
                  reportListing.mutate({
                    listingId: l.id,
                    reason: "User reported from marketplace",
                  });
                  toast.message("Report received", {
                    description: "Moderation queue will review this listing.",
                  });
                }}
              />
            ))}
          </div>
        ) : (
          <div className="divide-y rounded-xl border bg-white">
            {listings.map((l) => (
              <div key={l.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="font-medium">{l.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {l.location} · {categoryLabel(l.category)} · {l.postedBy} · {l.viewCount ?? 0}{" "}
                    views
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{priceLabel(l)}</span>
                  <Button size="sm" variant="outline" onClick={() => messageAbout(l)}>
                    Message
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => toLead(l)}>
                    Lead
                  </Button>
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
            <div className="space-y-1">
              <Label>Title</Label>
              <Input
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Category</Label>
              <Select
                value={draft.category}
                onValueChange={(v) => setDraft({ ...draft, category: v as MarketplaceCategoryId })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MARKETPLACE_CATEGORIES.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Location</Label>
              <Input
                value={draft.location}
                onChange={(e) => setDraft({ ...draft, location: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Price or budget</Label>
              <Input
                type="number"
                value={draft.price}
                onChange={(e) => setDraft({ ...draft, price: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Photos</Label>
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setPhotoFiles(Array.from(e.target.files ?? []))}
              />
              {photoFiles.length > 0 && (
                <p className="text-xs text-muted-foreground">{photoFiles.length} file(s) ready</p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompose(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => void publish()}
              disabled={uploading || createListing.isPending}
              className="bg-[#70bf2b] hover:bg-[#80ce38]"
            >
              {uploading ? "Uploading…" : "Publish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function priceLabel(l: SeedListing) {
  if (l.price) return currency(l.price);
  if (l.budget) return `Budget ${currency(l.budget)}`;
  return "Contact";
}

function ListingCard({
  listing: l,
  saved,
  onOpen,
  onSave,
  onMessage,
  onProject,
  onLead,
  onReport,
}: {
  listing: MarketplaceListing;
  saved: boolean;
  onOpen: () => void;
  onSave: () => void;
  onMessage: () => void;
  onProject: () => void;
  onLead: () => void;
  onReport: () => void;
}) {
  return (
    <Card className="overflow-hidden" onMouseEnter={onOpen}>
      {l.photos[0] ? (
        <img src={l.photos[0]} alt="" className="h-40 w-full object-cover" />
      ) : (
        <div className="grid h-28 place-items-center bg-[#071729] text-white/70">
          <Store className="h-8 w-8" />
        </div>
      )}
      <CardContent className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="font-semibold leading-snug">{l.title}</div>
          <Badge variant="outline" className="shrink-0">
            {categoryLabel(l.category)}
          </Badge>
        </div>
        <p className="line-clamp-2 text-sm text-muted-foreground">{l.description}</p>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" /> {l.location}
        </div>
        <div className="text-xs text-muted-foreground">
          {l.viewCount ?? 0} views · {l.responseCount ?? 0} responses
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
        <div className="flex flex-wrap gap-2">
          <Button size="sm" className="flex-1 gap-1" onClick={onMessage}>
            <MessageSquare className="h-3.5 w-3.5" /> Message
          </Button>
          <Button size="sm" variant="outline" onClick={onLead} title="Create lead">
            <UserPlus className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="outline" onClick={onProject} title="Convert to project">
            <FolderKanban className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="outline" onClick={onSave}>
            <Heart className={`h-3.5 w-3.5 ${saved ? "fill-destructive text-destructive" : ""}`} />
          </Button>
          <Button size="sm" variant="outline" onClick={onReport}>
            <Flag className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
