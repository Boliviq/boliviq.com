import type { ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { Construction } from "lucide-react";

export function ComingSoonPage({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <div className="p-4 sm:p-8">
        <div className="mx-auto max-w-2xl rounded-2xl border-2 border-dashed bg-card p-10 text-center">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-warning/10 text-warning">
            <Construction className="h-6 w-6" />
          </div>
          <h2 className="font-display text-lg font-semibold">Coming soon</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            This section is part of the Boliviq roadmap and will be built out in upcoming updates.
          </p>
          {children}
        </div>
      </div>
    </>
  );
}
