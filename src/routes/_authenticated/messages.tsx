import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Building2, FolderKanban, MessageSquare, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MESSAGE_SEED, type SeedThread } from "@/lib/platform-seed";
import { supabase } from "@/integrations/supabase/client";
import { isMissingRelation } from "@/lib/supabase-safe";
import { useCurrentUser } from "@/hooks/use-current-user";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/messages")({
  component: MessagesPage,
});

function MessagesPage() {
  const { userId } = useCurrentUser();
  const [activeId, setActiveId] = useState(MESSAGE_SEED[0].id);
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState("");
  const [local, setLocal] = useState<Record<string, { from: string; body: string; time: string }[]>>({});

  const remote = useQuery({
    queryKey: ["conversations", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await (supabase.from("conversations") as any).select("*").order("updated_at", { ascending: false });
      if (error) {
        if (isMissingRelation(error)) return [] as SeedThread[];
        throw error;
      }
      return ((data ?? []) as Record<string, unknown>[]).map((row): SeedThread => ({
        id: String(row.id),
        title: String(row.title ?? "Conversation"),
        participants: ["You"],
        property: undefined,
        project: undefined,
        preview: "Connected to your workspace",
        time: "now",
        unread: 0,
        messages: [],
      }));
    },
  });

  const threads = useMemo(() => {
    const merged = [...(remote.data ?? []), ...MESSAGE_SEED];
    if (!q) return merged;
    const needle = q.toLowerCase();
    return merged.filter((t) => `${t.title} ${t.preview} ${t.property ?? ""} ${t.project ?? ""}`.toLowerCase().includes(needle));
  }, [remote.data, q]);

  const active = threads.find((t) => t.id === activeId) ?? threads[0];
  const extra = active ? (local[active.id] ?? []) : [];
  const messages = active ? [...active.messages, ...extra] : [];

  const send = () => {
    if (!draft.trim() || !active) return;
    setLocal((prev) => ({
      ...prev,
      [active.id]: [...(prev[active.id] ?? []), { from: "You", body: draft.trim(), time: "Just now" }],
    }));
    setDraft("");
    toast.success("Message sent in-platform");
  };

  return (
    <>
      <PageHeader
        title="Messages"
        description="Property- and project-specific threads. File sharing, read status, and AI summaries stay on the same record as the lead."
      />
      <div className="grid min-h-[calc(100vh-8rem)] lg:grid-cols-[320px_1fr]">
        <aside className="border-b bg-white lg:border-b-0 lg:border-r">
          <div className="p-3">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search conversations…" />
          </div>
          <div className="max-h-[40vh] overflow-y-auto lg:max-h-none">
            {threads.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveId(t.id)}
                className={cn("w-full border-b p-3 text-left hover:bg-muted/60", active?.id === t.id && "bg-[#70bf2b]/10")}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="truncate text-sm font-semibold">{t.title}</div>
                  <span className="text-[11px] text-muted-foreground">{t.time}</span>
                </div>
                <div className="truncate text-xs text-muted-foreground">{t.preview}</div>
                {t.unread > 0 && <Badge className="mt-1 h-5">{t.unread}</Badge>}
              </button>
            ))}
          </div>
        </aside>

        <section className="flex flex-col bg-[#f5f7fa]">
          {active && (
            <>
              <div className="border-b bg-white px-4 py-3">
                <div className="font-display text-lg font-bold">{active.title}</div>
                <div className="mt-1 flex flex-wrap gap-2 text-xs">
                  {active.property && (
                    <Link to="/properties"><Badge variant="outline" className="gap-1"><Building2 className="h-3 w-3" /> {active.property}</Badge></Link>
                  )}
                  {active.project && (
                    <Link to="/projects"><Badge variant="outline" className="gap-1"><FolderKanban className="h-3 w-3" /> {active.project}</Badge></Link>
                  )}
                  {active.listing && (
                    <Link to="/marketplace"><Badge variant="outline">{active.listing}</Badge></Link>
                  )}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{active.participants.join(" · ")}</div>
              </div>

              <Alert className="m-4">
                <AlertDescription className="text-xs">
                  External email and SMS respect consent, opt-out, quiet hours, and applicable communication laws. In-platform messages stay inside Boliviq.
                </AlertDescription>
              </Alert>

              <div className="mx-4 mb-3 rounded-lg border border-[#70bf2b]/30 bg-[#70bf2b]/5 p-3 text-sm">
                <div className="flex items-center gap-2 font-medium"><Sparkles className="h-4 w-4 text-[#2f6b12]" /> AI summary (preview)</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Parties agreed the repair post should convert into a project after estimate approval. No messages were sent outside the platform. Agents will not send follow-ups without authorization.
                </p>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto px-4 pb-4">
                {messages.map((m, i) => (
                  <div key={i} className={cn("max-w-xl rounded-xl border bg-white p-3", m.from === "You" && "ml-auto border-[#70bf2b]/40")}>
                    <div className="text-xs font-semibold">{m.from}</div>
                    <div className="mt-1 text-sm">{m.body}</div>
                    <div className="mt-1 text-[11px] text-muted-foreground">{m.time}</div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 border-t bg-white p-3">
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Write a message…"
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                />
                <Button onClick={send} className="gap-1 bg-[#70bf2b] hover:bg-[#80ce38]">
                  <MessageSquare className="h-4 w-4" /> Send
                </Button>
              </div>
            </>
          )}
        </section>
      </div>
    </>
  );
}
