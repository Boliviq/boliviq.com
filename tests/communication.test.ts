import { describe, expect, test } from "vitest";
import { PLAN_TO_CANON_GROUP, SUBSCRIPTION_GROUPS } from "../src/lib/canons";
import { plans } from "../src/lib/plans";
import { inferThreadType, isWithinQuietHours, maySendOutbound } from "../src/lib/communication";

describe("communication protocol", () => {
  test("infers canon thread types from linked records", () => {
    expect(inferThreadType({ project: "Oak rehab" })).toBe("project");
    expect(inferThreadType({ listingId: "abc" })).toBe("property");
    expect(inferThreadType({ participantCount: 3 })).toBe("group");
    expect(inferThreadType({})).toBe("direct");
  });

  test("quiet hours wrap midnight and skip when unset", () => {
    const evening = new Date("2026-08-23T03:00:00.000Z");
    expect(isWithinQuietHours(evening, "21:00", "07:00", "UTC")).toBe(true);
    expect(isWithinQuietHours(evening, "08:00", "17:00", "UTC")).toBe(false);
    expect(isWithinQuietHours(evening, null, null, "UTC")).toBe(false);
  });

  test("outbound email/SMS honor opt-out, consent, and quiet hours", () => {
    const prefs = {
      emailEnabled: true,
      smsEnabled: false,
      quietHoursStart: "00:00",
      quietHoursEnd: "23:59",
      timezone: "UTC",
      optedOutAt: null,
    };
    expect(maySendOutbound("in_app", prefs).allowed).toBe(true);
    expect(maySendOutbound("sms", prefs).reason).toBe("sms_disabled");
    expect(maySendOutbound("email", prefs).reason).toBe("quiet_hours");
    expect(
      maySendOutbound("email", { ...prefs, optedOutAt: new Date().toISOString() }).reason,
    ).toBe("opted_out");
  });
});

describe("billing catalog mapping", () => {
  test("every sellable plan maps onto a Canon 8 group", () => {
    for (const plan of plans) {
      expect(SUBSCRIPTION_GROUPS).toContain(PLAN_TO_CANON_GROUP[plan.tier]);
    }
    expect(PLAN_TO_CANON_GROUP.free).toBe("Homeowner Free");
    expect(PLAN_TO_CANON_GROUP.professional_ai_max).toBe("Professional + AI");
  });
});
