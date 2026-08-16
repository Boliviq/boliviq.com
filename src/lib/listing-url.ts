/** Pull a human address out of common listing URLs (Zillow, Redfin, Realtor). */
export function addressFromListingUrl(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  const path = decodeURIComponent(url.pathname);

  const zillow = path.match(/homedetails\/([^/]+)/i);
  if (zillow) {
    return zillow[1]
      .replace(/-\d+_zpid$/i, "")
      .replace(/_/g, " ")
      .replace(/-/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  const redfin = path.match(/\/[A-Z]{2}\/([^/]+)\/([^/]+)\/home/i);
  if (redfin) {
    const city = redfin[1].replace(/-/g, " ");
    const street = redfin[2].replace(/-/g, " ");
    return `${street}, ${city}`;
  }

  const realtor = path.match(/realestateandhomes-detail\/([^/]+)/i);
  if (realtor) {
    return realtor[1].replace(/_/g, " ").replace(/-/g, " ").replace(/\s+/g, " ").trim();
  }

  return null;
}

export function mapsEmbedUrl(address: string): string {
  return `https://maps.google.com/maps?q=${encodeURIComponent(address)}&z=13&output=embed`;
}

export function mapsOpenUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}
