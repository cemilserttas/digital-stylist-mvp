// Shared utility functions — import from here; never duplicate in components.

// ---------------------------------------------------------------------------
// Affiliate partner detection
// ---------------------------------------------------------------------------

type Partner = 'amazon' | 'zalando' | 'asos' | 'google';

/** Maps lowercase brand name fragments to their preferred shopping partner. */
const BRAND_PARTNER: Record<string, Partner> = {
  // Amazon FR (Associates)
  nike: 'amazon',
  adidas: 'amazon',
  levi: 'amazon',
  uniqlo: 'amazon',
  lacoste: 'amazon',
  'ralph lauren': 'amazon',
  tommy: 'amazon',
  converse: 'amazon',
  vans: 'amazon',
  // Zalando
  zara: 'zalando',
  'h&m': 'zalando',
  hm: 'zalando',
  mango: 'zalando',
  cos: 'zalando',
  arket: 'zalando',
  sandro: 'zalando',
  maje: 'zalando',
  // ASOS
  asos: 'asos',
  topshop: 'asos',
  weekday: 'asos',
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
 * Set NEXT_PUBLIC_AMAZON_TAG and NEXT_PUBLIC_ASOS_AFF_ID env vars to activate
 * real affiliate tracking.
 */
export function buildShopUrl(searchTerms: string): string {
  const partner = detectPartner(searchTerms);
  const q = encodeURIComponent(searchTerms);
  const amazonTag = process.env.NEXT_PUBLIC_AMAZON_TAG ?? 'digitalstylist-21';
  const asosAffId = process.env.NEXT_PUBLIC_ASOS_AFF_ID ?? '';

  switch (partner) {
    case 'amazon':
      return `https://www.amazon.fr/s?k=${q}&tag=${amazonTag}&${UTM}`;
    case 'zalando':
      return `https://www.zalando.fr/catalog/?q=${q}&${UTM}`;
    case 'asos': {
      const base = `https://www.asos.com/search/?q=${q}&${UTM}`;
      return asosAffId ? `${base}&affid=${asosAffId}` : base;
    }
    default:
      return `https://www.google.com/search?q=${encodeURIComponent(searchTerms + ' acheter')}&${UTM}`;
  }
}
