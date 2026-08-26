/** Shared in-memory demo catalog so Distressed Engine + Investor OS resolve the same property IDs. */

import { createInMemoryStore, ingestRecords } from "@/lib/distress/ingestion/pipeline";
import { buildDemoRecords } from "@/lib/distress/providers/demo-data";

const demoStore = createInMemoryStore();
let demoSeeded = false;

export function ensureDemoStore() {
  if (!demoSeeded) {
    ingestRecords(buildDemoRecords(), demoStore);
    demoSeeded = true;
  }
  return demoStore;
}
