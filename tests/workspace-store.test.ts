import { describe, expect, test } from "vitest";
import {
  categoryLabel,
  DEFAULT_ACCOUNT,
  mergeById,
  verificationFor,
} from "../src/lib/workspace-store";

describe("workspace store helpers", () => {
  test("mergeById keeps the first copy", () => {
    expect(
      mergeById(
        [{ id: "a", n: 1 }],
        [
          { id: "a", n: 2 },
          { id: "b", n: 3 },
        ],
      ),
    ).toEqual([
      { id: "a", n: 1 },
      { id: "b", n: 3 },
    ]);
  });

  test("categoryLabel maps known marketplace categories", () => {
    expect(categoryLabel("repairs")).toBeTruthy();
    expect(categoryLabel("repairs").toLowerCase()).toContain("repair");
  });

  test("verificationFor returns role-appropriate starting tiers", () => {
    expect(verificationFor("homeowner")).toEqual(["identity"]);
    expect(verificationFor("contractor")).toEqual(["unverified"]);
  });

  test("DEFAULT_ACCOUNT starts unonboarded as a homeowner", () => {
    expect(DEFAULT_ACCOUNT.onboarded).toBe(false);
    expect(DEFAULT_ACCOUNT.primary_role).toBe("homeowner");
    expect(DEFAULT_ACCOUNT.onboarding_step).toBe(1);
  });
});
