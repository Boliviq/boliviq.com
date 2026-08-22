import type { ReactNode } from "react";
import { MarketingLayout } from "@/components/marketing-layout";

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <MarketingLayout>
      <section className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-4xl font-bold">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: {updated}</p>
        <div className="mt-4 rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm">
          <strong>Template notice:</strong> This document is a starting template. It must be
          reviewed and customized by a licensed attorney in your jurisdiction before public launch.
        </div>
        <div className="prose prose-sm mt-8 max-w-none text-foreground [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_p]:mt-3 [&_p]:text-muted-foreground [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:text-muted-foreground">
          {children}
        </div>
      </section>
    </MarketingLayout>
  );
}
