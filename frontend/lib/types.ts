// Shared domain types — source of truth for the entire frontend.
// Import from here; never re-declare in components.

export interface User {
  id: number;
  prenom: string;
  morphologie: string;
  genre: string;
  age: number;
  style_prefere?: string | null;
}

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

export interface WeatherData {
  temperature: number;
  description: string;
  ville: string;
  icon: string;
  humidity?: number;
  wind_speed?: number;
}

export type TabType = 'home' | 'wardrobe' | 'wishlist';
