import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Flag,
  FolderKanban,
  Heart,
  MapPin,
  MessageSquare,
  Plus,
  Search,
  Store,
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
import { categoryLabel, startConversation, type MarketplaceListing } from "@/lib/workspace-store";
import {
  useListings,
  useCreateListing,
  useSavedListingIds,
  useToggleSavedListing,
  useReportListing,
  useCreateProject,
} from "@/hooks/use-workspace-data";

export const Route = createFileRoute("/_authenticated/marketplace")({
  component: MarketplacePage,
});

function MarketplacePage() {
  const { account, userId } = useAccount();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<MarketplaceCategoryId | "all">("all");
  const [view, setView] = useState<"list" | "cards">("cards");
  const [compose, setCompose] = useState(false);
  const [draft, setDraft] = useState({
    title: "",
    description: "",
    category: "repairs" as MarketplaceCategoryId,
    location: "",
    price: "",
  });

  const { data: allListings = [], isLoading } = useListings();
  const { data: savedIds = [] } = useSavedListingIds();
  const createListing = useCreateListing();
  const toggleSaved = useToggleSavedListing();
  const reportListing = useReportListing();
  const createProject = useCreateProject();
  const saved = new Set(savedIds);

  const listings = useMemo(() => {
    return allListings.filter((l) => {
      const hay = `${l.title} ${l.description} ${l.location}`.toLowerCase();
      const okQ = !q || hay.includes(q.toLowerCase());
      const okC = category === "all" || l.category === category;
      return okQ && okC;
    });
  }, [allListings, q, category]);

  const publish = () => {
    if (!draft.title.trim()) {
      toast.error("Add a title");
      return;
    }
    if (!userId) {
      toast.error("Sign in to use your workspace");
      return;
    }
    createListing.mutate(
      {
        title: draft.title,
        description: draft.description,
        category: draft.category,
        location: draft.location || "Unspecified",
        price: draft.price ? Number(draft.price) : undefined,
        role: account.primary_role,
        authorName: account.full_name || "You",
        postedBy: account.full_name || "You",
        visibility: "public",
      },
      {
        onSuccess: () => {
          setCompose(false);
          setDraft({ title: "", description: "", category: "repairs", location: "", price: "" });
          toast.success("Listing posted", {
            description: "Message a professional or convert it into a project from this card.",
          });
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Could not post the listing"),
      },
    );
  };

  const messageAbout = (listing: MarketplaceListing) => {
    if (!userId) {
      toast.error("Sign in to use your workspace");
      return;
    }
    const thread = startConversation(
      userId,
      `Re: ${listing.title}`,
      `Listing · ${listing.location}`,
      `I'm interested in "${listing.title}" at ${listing.location}.`,
      {
        listing: listing.title,
        listingId: listing.id,
        property: listing.propertyLabel,
        participants: [account.full_name || "You", listing.postedBy],
      },
    );
    toast.success("Conversation started");
    void navigate({ to: "/messages", search: { thread } });
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
          startConversation(
            userId,
            project.name,
            `Project · ${project.address}`,
            `Opened a project from marketplace listing "${listing.title}".`,
            {
              project: project.name,
              property: project.address,
              listing: listing.title,
              listingId: listing.id,
            },
          );
          toast.success("Project created", {
            description: "The listing, conversation, and project now share a record.",
          });
          void navigate({ to: "/projects" });
        },
        onError: (e) =>
          toast.error(e instanceof Error ? e.message : "Could not create the project"),
      },
    );
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
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search location, keyword, project type…"
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
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
        ) : view === "cards" ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {listings.map((l) => (
              <ListingCard
                key={l.id}
                listing={l}
                saved={saved.has(l.id)}
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
                    {l.location} · {categoryLabel(l.category)} · {l.postedBy}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{priceLabel(l)}</span>
                  <Button size="sm" variant="outline" onClick={() => messageAbout(l)}>
                    Message
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
            <Button onClick={() => void publish()} className="bg-[#70bf2b] hover:bg-[#80ce38]">
              Publish
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
  onSave,
  onMessage,
  onProject,
  onReport,
}: {
  listing: SeedListing;
  saved: boolean;
  onSave: () => void;
  onMessage: () => void;
  onProject: () => void;
  onReport: () => void;
}) {
  return (
    <Card className="overflow-hidden">
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
