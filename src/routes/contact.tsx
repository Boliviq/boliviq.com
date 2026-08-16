import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MarketingLayout } from "@/components/marketing-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { z } from "zod";
import { submitContactForm } from "@/lib/contact.functions";
import { useServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Boliviq" },
      { name: "description", content: "Get in touch with the Boliviq team." },
      { property: "og:title", content: "Contact — Boliviq" },
      { property: "og:description", content: "Sales, support, and partnership questions." },
    ],
  }),
  component: Contact,
});

const schema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  message: z.string().trim().min(10).max(2000),
});

function Contact() {
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const submitFn = useServerFn(submitContactForm);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setSubmitting(true);
    try {
      await submitFn({ data: { ...parsed.data, kind: "contact" } });
      setSent(true);
      toast.success("Message received. We'll be in touch.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send message.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <MarketingLayout>
      <section className="mx-auto max-w-2xl px-4 py-16">
        <h1 className="text-4xl font-bold">Contact us</h1>
        <p className="mt-3 text-muted-foreground">
          Sales, support, partnerships, or press. We usually reply within one business day.
        </p>
        <Card className="mt-8">
          <CardContent className="p-6">
            {sent ? (
              <div className="py-10 text-center">
                <div className="text-lg font-semibold">Thanks — we got your message.</div>
                <p className="mt-2 text-sm text-muted-foreground">A member of the team will follow up shortly.</p>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" name="name" required maxLength={100} />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" required maxLength={255} />
                </div>
                <div>
                  <Label htmlFor="message">Message</Label>
                  <Textarea id="message" name="message" required rows={6} maxLength={2000} />
                </div>
                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? "Sending…" : "Send message"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </section>
    </MarketingLayout>
  );
}
