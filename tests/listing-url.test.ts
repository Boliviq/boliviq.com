import { describe, expect, test } from "vitest";
import { addressFromListingUrl, mapsEmbedUrl } from "../src/lib/listing-url";

describe("listing URL address parse", () => {
  test("reads Zillow homedetails slugs", () => {
    expect(
      addressFromListingUrl("https://www.zillow.com/homedetails/412-Oak-St-Austin-TX-78702/123_zpid/"),
    ).toBe("412 Oak St Austin TX 78702");
  });

  test("reads Redfin city/street/home paths", () => {
    expect(
      addressFromListingUrl("https://www.redfin.com/TX/Austin/412-Oak-St/home/123"),
    ).toBe("412 Oak St, Austin");
  });

  test("returns null for unknown hosts", () => {
    expect(addressFromListingUrl("https://example.com/listing/123")).toBeNull();
    expect(addressFromListingUrl("not-a-url")).toBeNull();
  });

  test("builds a Google Maps embed URL", () => {
    expect(mapsEmbedUrl("412 Oak St, Austin TX")).toContain("maps.google.com/maps?q=412%20Oak%20St%2C%20Austin%20TX");
  });
});
