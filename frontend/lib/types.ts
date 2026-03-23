// Shared domain types — source of truth for the entire frontend.
// Import from here; never re-declare in components.

export interface User {
  id: number;
  prenom: string;
  email?: string | null;
  morphologie: string;
  genre: string;
  age: number;
  style_prefere?: string | null;
  is_premium?: boolean;
  premium_until?: string | null;
  referral_code?: string | null;
  referral_count?: number;
  push_notifications_enabled?: boolean;
  streak_current?: number;
  streak_max?: number;
  streak_last_activity?: string | null;
}

export interface ReferralInfo {
  referral_code: string | null;
  referral_count: number;
  referrals_until_next_reward: number;
  reward_description: string;
}

export const FREE_ITEM_LIMIT = 20;

export interface ClothingItem {
  id: number;
  type: string;
  couleur: string;
  saison: string;
  tags_ia: string;
  image_path: string;
  category?: string;
}

export type SuggestionSource = 'wardrobe' | 'marketplace' | 'suggestion';

export interface SuggestionPiece {
  type: string;
  source: SuggestionSource;
  // wardrobe source
  item_id?: number;
  // marketplace source
  listing_id?: number;
  prix?: number;
  marque?: string | null;
  couleur?: string;
  // suggestion source (general recommendation)
  prix_estime?: number;
  conseil?: string;
}

export interface Suggestion {
  titre: string;
  description: string;
  pieces: SuggestionPiece[];
  occasion: string;
}

export interface DayForecast {
  date: string;           // YYYY-MM-DD
  temp_max: number;
  temp_min: number;
  description: string;
  icon: string;
  uv_index: number;
  precipitation_probability: number;
}

export interface WeatherData {
  temperature: number;
  description: string;
  ville: string;
  icon: string;
  humidity?: number;
  wind_speed?: number;
  uv_index?: number;
  comfort_index?: number; // 0-10 computed from temp/humidity/wind
  forecast?: DayForecast[];
}

export type TabType = 'home' | 'wardrobe' | 'wishlist' | 'calendar' | 'shop';

export interface OutfitPlan {
  id: number;
  date: string; // YYYY-MM-DD
  occasion?: string | null;
  notes?: string | null;
  item_ids: number[];
}

// ── Marketplace ────────────────────────────────────────────────────────────

export type ListingStatus = 'draft' | 'active' | 'sold' | 'cancelled';
export type OrderStatus = 'pending' | 'shipped' | 'delivered' | 'completed' | 'cancelled' | 'refund_requested' | 'refunded';
export type ListingCondition = 'Neuf avec étiquette' | 'Très bon état' | 'Bon état' | 'Satisfaisant';

export const LISTING_CONDITIONS: ListingCondition[] = [
  'Neuf avec étiquette', 'Très bon état', 'Bon état', 'Satisfaisant',
];

export interface MarketplaceListing {
  id: number;
  seller_id: number;
  clothing_item_id?: number | null;
  title: string;
  description: string;
  price_cents: number;
  condition: ListingCondition;
  size?: string | null;
  brand?: string | null;
  category_type: string;
  color: string;
  season: string;
  image_urls: string[];
  status: ListingStatus;
  views_count: number;
  created_at: string;
  seller_prenom?: string | null;
}

export interface ShippingAddress {
  id: number;
  user_id: number;
  label: string;
  full_name: string;
  line1: string;
  line2?: string | null;
  postal_code: string;
  city: string;
  country: string;
  phone?: string | null;
  is_default: boolean;
  created_at: string;
}

export interface MarketplaceOrder {
  id: number;
  listing_id: number;
  buyer_id: number;
  seller_id: number;
  amount_cents: number;
  commission_cents: number;
  seller_payout_cents: number;
  status: OrderStatus;
  tracking_number?: string | null;
  tracking_carrier?: string | null;
  paid_at?: string | null;
  shipped_at?: string | null;
  delivered_at?: string | null;
  created_at: string;
  listing_title?: string | null;
  listing_image?: string | null;
  buyer_prenom?: string | null;
  seller_prenom?: string | null;
}

export interface PriceSuggestion {
  price_min: number;
  price_max: number;
  suggested: number;
  reasoning: string;
}
