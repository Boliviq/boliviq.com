import { afterEach, describe, expect, test, vi } from "vitest";
import {
  addDocument,
  createListing,
  createProjectFromListing,
  listDocuments,
  listListings,
  listProjects,
  listThreads,
  mergeById,
  sendMessage,
  startConversation,
  startVerification,
  startedVerifications,
} from "../src/lib/workspace-store";

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => { data.set(k, v); },
    removeItem: (k: string) => { data.delete(k); },
    clear: () => { data.clear(); },
    key: () => null,
    get length() { return data.size; },
  };
}

describe("workspace store", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("mergeById keeps the first copy", () => {
    expect(mergeById([{ id: "a", n: 1 }], [{ id: "a", n: 2 }, { id: "b", n: 3 }])).toEqual([
      { id: "a", n: 1 },
      { id: "b", n: 3 },
    ]);
  });

  test("listings, messages, and projects stay connected for a user", () => {
    const storage = memoryStorage();
    vi.stubGlobal("Event", class Event { constructor(public type: string) {} });
    vi.stubGlobal("window", {
      localStorage: storage,
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true,
    });
    vi.stubGlobal("localStorage", storage);

    const userId = "user-1";
    const listing = createListing(userId, {
      title: "Kitchen repair",
      description: "Cabinets and counters",
      category: "repairs",
      location: "Austin, TX",
    });
    const project = createProjectFromListing(userId, listing);
    const threadId = startConversation(
      userId,
      listing.title,
      "Listing",
      "Can you bid this?",
      { listing: listing.title, listingId: listing.id, project: project.name },
    );
    sendMessage(userId, threadId, "Walk-through Thursday");
    addDocument(userId, { name: "Kitchen scope.pdf", kind: "Estimate", related: project.name, restricted: false });
    startVerification(userId, "identity");

    expect(listListings(userId)[0].title).toBe("Kitchen repair");
    expect(listProjects(userId)[0].name).toBe("Kitchen repair");
    expect(listThreads(userId)[0].messages.at(-1)?.body).toBe("Walk-through Thursday");
    expect(listDocuments(userId)[0].name).toBe("Kitchen scope.pdf");
    expect(startedVerifications(userId).has("identity")).toBe(true);
  });
});
