// Shared utility functions — import from here; never duplicate in components.

// ---------------------------------------------------------------------------
// Product URL helpers
// ---------------------------------------------------------------------------

/**
 * Returns the shop display name from a product URL domain.
 * Falls back to capitalised hostname if unknown.
 */
export function extractShopName(url: string): string {
  try {
    const host = new URL(url).hostname.replace('www.', '').replace('www2.', '');
    const map: Record<string, string> = {
      'amazon.fr': 'Amazon',
      'zalando.fr': 'Zalando',
      'asos.com': 'ASOS',
      'hm.com': 'H&M',
      'zara.com': 'Zara',
      'uniqlo.com': 'Uniqlo',
      'bershka.com': 'Bershka',
      'pullandbear.com': 'Pull&Bear',
      'kiabi.com': 'Kiabi',
      'decathlon.fr': 'Decathlon',
      'c-and-a.com': 'C&A',
      'veepee.fr': 'Veepee',
      'nike.com': 'Nike',
      'adidas.fr': 'Adidas',
      'mango.com': 'Mango',
    };
    return map[host] ?? host.split('.')[0].charAt(0).toUpperCase() + host.split('.')[0].slice(1);
  } catch {
    return 'Shop';
  }
}

/**
 * Appends UTM + affiliate params to a direct product URL.
 * Preserves the original URL structure (no search redirect).
 */
export function enrichProductUrl(url: string): string {
  try {
    const u = new URL(url);
    u.searchParams.set('utm_source', 'digitalstylist');
    u.searchParams.set('utm_medium', 'affiliate');
    u.searchParams.set('utm_campaign', 'outfit_suggestion');
    // Add affiliate IDs where applicable
    const host = u.hostname.replace('www.', '').replace('www2.', '');
    if (host === 'amazon.fr' || host.endsWith('.amazon.fr')) {
      u.searchParams.set('tag', process.env.NEXT_PUBLIC_AMAZON_TAG ?? 'digitalstylist-21');
    } else if (host === 'zalando.fr') {
      const pid = process.env.NEXT_PUBLIC_ZALANDO_PARTNER_ID;
      if (pid) u.searchParams.set('pid', pid);
    } else if (host === 'asos.com') {
      const affid = process.env.NEXT_PUBLIC_ASOS_AFF_ID;
      if (affid) u.searchParams.set('affid', affid);
    }
    return u.toString();
  } catch {
    return url;
  }
}

// ---------------------------------------------------------------------------
// Affiliate partner detection (fallback for search URLs)
// ---------------------------------------------------------------------------

type Partner = 'amazon' | 'zalando' | 'asos' | 'veepee' | 'google';

/** Maps lowercase brand name fragments to their preferred shopping partner. */
const BRAND_PARTNER: Record<string, Partner> = {
  // Amazon FR (Associates) — sports, international brands
  nike: 'amazon',
  adidas: 'amazon',
  levi: 'amazon',
  uniqlo: 'amazon',
  lacoste: 'amazon',
  'ralph lauren': 'amazon',
  tommy: 'amazon',
  converse: 'amazon',
  vans: 'amazon',
  'new balance': 'amazon',
  puma: 'amazon',
  // Zalando — fast fashion, European brands
  zara: 'zalando',
  'h&m': 'zalando',
  hm: 'zalando',
  mango: 'zalando',
  cos: 'zalando',
  arket: 'zalando',
  sandro: 'zalando',
  maje: 'zalando',
  'massimo dutti': 'zalando',
  bershka: 'zalando',
  stradivarius: 'zalando',
  'pull&bear': 'zalando',
  // ASOS — UK brands, streetwear
  asos: 'asos',
  topshop: 'asos',
  weekday: 'asos',
  monki: 'asos',
  // Veepee (vente-privée) — promo / outlet
  veepee: 'veepee',
  'vente-privee': 'veepee',
};

function detectPartner(searchTerms: string): Partner {
  const lower = searchTerms.toLowerCase();
  for (const [brand, partner] of Object.entries(BRAND_PARTNER)) {
    if (lower.includes(brand)) return partner;
  }
  return 'google';
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

const UTM = 'utm_source=digitalstylist&utm_medium=affiliate&utm_campaign=outfit_suggestion';

/**
 * Builds a shopping search URL for the given search terms.
 * Routes to brand-appropriate retailers and includes UTM + affiliate params.
 *
 * Env vars (set in Vercel dashboard):
 *   NEXT_PUBLIC_AMAZON_TAG         — Amazon Associates tag (e.g. digitalstylist-21)
 *   NEXT_PUBLIC_ASOS_AFF_ID        — ASOS affiliate ID
 *   NEXT_PUBLIC_ZALANDO_PARTNER_ID — Zalando Partner Program ID
 */
export function buildShopUrl(searchTerms: string): string {
  const partner = detectPartner(searchTerms);
  const q = encodeURIComponent(searchTerms);
  const amazonTag = process.env.NEXT_PUBLIC_AMAZON_TAG ?? 'digitalstylist-21';
  const asosAffId = process.env.NEXT_PUBLIC_ASOS_AFF_ID ?? '';
  const zalandoPartnerId = process.env.NEXT_PUBLIC_ZALANDO_PARTNER_ID ?? '';

  switch (partner) {
    case 'amazon':
      return `https://www.amazon.fr/s?k=${q}&tag=${amazonTag}&${UTM}`;
    case 'zalando': {
      const base = `https://www.zalando.fr/catalog/?q=${q}&${UTM}`;
      // Zalando Partner Program uses a tracking pixel / redirect — append partner ID if configured
      return zalandoPartnerId ? `${base}&pid=${zalandoPartnerId}` : base;
    }
    case 'asos': {
      const base = `https://www.asos.com/search/?q=${q}&${UTM}`;
      return asosAffId ? `${base}&affid=${asosAffId}` : base;
    }
    case 'veepee':
      return `https://www.veepee.fr/search?q=${q}&${UTM}`;
    default:
      return `https://www.google.com/search?q=${encodeURIComponent(searchTerms + ' acheter')}&${UTM}`;
  }
}
