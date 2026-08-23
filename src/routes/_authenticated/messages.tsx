import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { Building2, FolderKanban, MessageSquare, Sparkles, Store } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useWorkspace } from "@/hooks/use-workspace";
import { useConversations, useSendMessage } from "@/hooks/use-workspace-data";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  thread: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/messages")({
  validateSearch: searchSchema,
  component: MessagesPage,
});

function MessagesPage() {
  const { thread: threadParam } = Route.useSearch();
  const { userId } = useWorkspace();
  const { data: threads = [], isLoading } = useConversations();
  const sendMessage = useSendMessage();
  const [activeId, setActiveId] = useState(threadParam ?? "");
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (threadParam) setActiveId(threadParam);
  }, [threadParam]);

  const filtered = useMemo(() => {
    if (!q) return threads;
    const needle = q.toLowerCase();
    return threads.filter((t) =>
      `${t.title} ${t.lastMessage} ${t.property ?? ""} ${t.project ?? ""} ${t.listing ?? ""}`
        .toLowerCase()
        .includes(needle),
    );
  }, [threads, q]);

  const active = filtered.find((t) => t.id === activeId) ?? filtered[0];

  const send = () => {
    if (!draft.trim() || !active) return;
    if (!userId) {
      toast.error("Sign in to send messages");
      return;
    }
    const body = draft.trim();
    sendMessage.mutate(
      { conversationId: active.id, body },
      {
        onSuccess: () => {
          setDraft("");
          toast.success("Message sent in-platform");
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Could not send the message"),
      },
    );
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
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search conversations…"
            />
          </div>
          <div className="max-h-[40vh] overflow-y-auto lg:max-h-none">
            {isLoading && (
              <div className="p-3 text-sm text-muted-foreground">Loading conversations…</div>
            )}
            {!isLoading && filtered.length === 0 && (
              <div className="p-6 text-sm text-muted-foreground">
                No conversations yet. Message a listing or professional to start one.
              </div>
            )}
            {filtered.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveId(t.id)}
                className={cn(
                  "w-full border-b p-3 text-left hover:bg-muted/60",
                  active?.id === t.id && "bg-[#70bf2b]/10",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="truncate text-sm font-semibold">{t.title}</div>
                  <span className="text-[11px] text-muted-foreground">
                    {formatWhen(t.updatedAt)}
                  </span>
                </div>
                <div className="truncate text-xs text-muted-foreground">{t.lastMessage}</div>
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
                    <Link to="/properties">
                      <Badge variant="outline" className="gap-1">
                        <Building2 className="h-3 w-3" /> {active.property}
                      </Badge>
                    </Link>
                  )}
                  {active.project && (
                    <Link to="/projects">
                      <Badge variant="outline" className="gap-1">
                        <FolderKanban className="h-3 w-3" /> {active.project}
                      </Badge>
                    </Link>
                  )}
                  {active.listing && (
                    <Link to="/marketplace">
                      <Badge variant="outline" className="gap-1">
                        <Store className="h-3 w-3" /> {active.listing}
                      </Badge>
                    </Link>
                  )}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {active.participants.join(" · ")}
                </div>
              </div>

              <Alert className="m-4">
                <AlertDescription className="text-xs">
                  External email and SMS respect consent, opt-out, quiet hours, and applicable
                  communication laws. In-platform messages stay inside Boliviq.
                </AlertDescription>
              </Alert>

              <div className="mx-4 mb-3 rounded-lg border border-[#70bf2b]/30 bg-[#70bf2b]/5 p-3 text-sm">
                <div className="flex items-center gap-2 font-medium">
                  <Sparkles className="h-4 w-4 text-[#2f6b12]" /> AI summary (preview)
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {active.messages
                    .slice(-2)
                    .map((m) => m.body)
                    .join(" · ") ||
                    "No messages yet. Agents will not send follow-ups without authorization."}
                </p>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto px-4 pb-4">
                {active.messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      "max-w-xl rounded-xl border bg-white p-3",
                      (m.mine || m.from === "You") && "ml-auto border-[#70bf2b]/40",
                    )}
                  >
                    <div className="text-xs font-semibold">{m.from}</div>
                    <div className="mt-1 text-sm">{m.body}</div>
                    <div className="mt-1 text-[11px] text-muted-foreground">{formatWhen(m.at)}</div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 border-t bg-white p-3">
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Write a message…"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                />
                <Button
                  onClick={send}
                  disabled={sendMessage.isPending}
                  className="gap-1 bg-[#70bf2b] hover:bg-[#80ce38]"
                >
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

function formatWhen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
