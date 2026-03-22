// Shared utility functions — import from here; never duplicate in components.

// ---------------------------------------------------------------------------
// Affiliate partner detection
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
