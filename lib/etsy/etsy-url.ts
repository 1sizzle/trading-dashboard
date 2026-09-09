/**
 * Validates a real Etsy listing URL and extracts the listing ID.
 * Matches e.g. https://www.etsy.com/listing/1234567890/some-slug
 * or https://www.etsy.com/uk/listing/1234567890/some-slug
 */
export function parseEtsyListingUrl(url: string): { listingId: string } | null {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return null;
  }

  if (!/(^|\.)etsy\.com$/.test(parsed.hostname)) {
    return null;
  }

  const match = parsed.pathname.match(/\/listing\/(\d+)(?:\/|$)/);
  if (!match) {
    return null;
  }

  return { listingId: match[1] };
}
