// Shared utility functions — import from here; never duplicate in components.

export function buildShopUrl(searchTerms: string): string {
  return `https://www.google.com/search?btnI=1&q=${encodeURIComponent(searchTerms + ' acheter')}`;
}
