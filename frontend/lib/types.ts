// Shared domain types — source of truth for the entire frontend.
// Import from here; never re-declare in components.

export interface User {
  id: number;
  prenom: string;
  morphologie: string;
  genre: string;
  age: number;
  style_prefere?: string | null;
  is_premium?: boolean;
  premium_until?: string | null;
  referral_code?: string | null;
  referral_count?: number;
  push_notifications_enabled?: boolean;
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

export interface SuggestionPiece {
  type: string;
  marque: string;
  prix: number;
  lien_recherche: string;
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

export type TabType = 'home' | 'wardrobe' | 'wishlist' | 'calendar';

export interface OutfitPlan {
  id: number;
  date: string; // YYYY-MM-DD
  occasion?: string | null;
  notes?: string | null;
  item_ids: number[];
}
