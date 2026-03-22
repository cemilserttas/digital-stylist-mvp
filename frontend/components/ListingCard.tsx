'use client';

import { Eye, Tag } from 'lucide-react';
import { getImageUrl } from '@/lib/api';
import type { MarketplaceListing } from '@/lib/types';

export interface ListingCardProps {
  listing: MarketplaceListing;
  onClick: (listing: MarketplaceListing) => void;
}

const conditionColor: Record<string, string> = {
  'Neuf avec étiquette': 'bg-green-500/20 text-green-300',
  'Très bon état': 'bg-blue-500/20 text-blue-300',
  'Bon état': 'bg-amber-500/20 text-amber-300',
  'Satisfaisant': 'bg-gray-500/20 text-gray-300',
};

export default function ListingCard({ listing, onClick }: ListingCardProps) {
  const firstImage = listing.image_urls?.[0];
  const priceEur = (listing.price_cents / 100).toFixed(2);

  return (
    <button
      onClick={() => onClick(listing)}
      className="group relative bg-white/5 rounded-2xl overflow-hidden border border-white/10 hover:border-purple-500/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-500/5 text-left w-full"
    >
      {/* Image */}
      <div className="aspect-[3/4] bg-gray-800 relative overflow-hidden">
        {firstImage ? (
          <img
            src={getImageUrl(firstImage)}
            alt={listing.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Tag className="w-10 h-10 text-gray-600" />
          </div>
        )}

        {/* Condition badge */}
        <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider backdrop-blur ${conditionColor[listing.condition] || 'bg-white/10 text-gray-300'}`}>
          {listing.condition}
        </div>

        {/* Views */}
        {listing.views_count > 0 && (
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 backdrop-blur px-1.5 py-0.5 rounded-md text-[10px] text-gray-300">
            <Eye className="w-3 h-3" />
            {listing.views_count}
          </div>
        )}

        {/* Price overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-8">
          <p className="text-lg font-black text-white">{priceEur} €</p>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="font-bold text-white text-sm leading-tight truncate">{listing.title}</h3>
        <div className="flex items-center gap-2 mt-1">
          {listing.brand && (
            <span className="text-xs text-purple-300 font-medium">{listing.brand}</span>
          )}
          {listing.size && (
            <span className="text-xs text-gray-500">Taille {listing.size}</span>
          )}
        </div>
        {listing.seller_prenom && (
          <p className="text-[10px] text-gray-500 mt-1.5">par {listing.seller_prenom}</p>
        )}
      </div>
    </button>
  );
}
