/**
 * Returns the correct image URL for a listing.
 *
 * Priority:
 *  1. listing.photos[0].url  — the real stored image (Open Library / Unsplash)
 *  2. Category-specific local SVG fallback from /public/samples/
 *
 * The <img> tag should also set onError to swap to the category fallback
 * in case the remote URL is unreachable.
 */

// Map every category to its local SVG fallback (served from /public/samples/)
export const CATEGORY_FALLBACKS = {
  "Books":       "/samples/books.svg",
  "Electronics": "/samples/electronics.svg",
  "Furniture":   "/samples/furniture.svg",
  "Clothes":     "/samples/clothes.svg",
  "Cycles":      "/samples/cycles.svg",
  "Kitchenware": "/samples/kitchenware.svg",
  "Sports gear": "/samples/sports.svg"
};

/**
 * Returns the primary image URL for a listing.
 * Falls back to the category SVG if no photo is stored.
 */
export function getListingImage(listing) {
  const url = listing?.photos?.[0]?.url;
  if (url && url.trim()) return url;
  return CATEGORY_FALLBACKS[listing?.category] || "/samples/electronics.svg";
}

export function getImageUrl(input) {
  if (typeof input === "string" && input.trim()) return input;
  if (input && typeof input === "object") return getListingImage(input);
  return "/samples/electronics.svg";
}

/**
 * onError handler for <img> tags.
 * Swaps the broken src to the category fallback SVG.
 */
export function handleImageError(event, category) {
  const fallback = CATEGORY_FALLBACKS[category] || "/samples/electronics.svg";
  // Prevent infinite loop if the fallback itself fails
  if (event.target.src !== window.location.origin + fallback) {
    event.target.src = fallback;
  }
}
