'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Eye, ShoppingBag, MapPin, Package, ChevronLeft, ChevronRight } from 'lucide-react';
import { getImageUrl } from '@/lib/api';
import type { MarketplaceListing } from '@/lib/types';

export interface ListingDetailProps {
  listing: MarketplaceListing;
  onClose: () => void;
  onBuy: (listing: MarketplaceListing) => void;
  isSelf?: boolean;
}

export default function ListingDetail({ listing, onClose, onBuy, isSelf }: ListingDetailProps) {
  const [imageIndex, setImageIndex] = useState(0);
  const images = listing.image_urls || [];
  const priceEur = (listing.price_cents / 100).toFixed(2);
  const shippingEur = '4,99';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-end sm:items-center justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-gray-900 w-full sm:max-w-lg sm:rounded-2xl max-h-[90vh] overflow-y-auto border border-white/10"
        >
          {/* Image carousel */}
          <div className="relative aspect-square bg-gray-800">
            {images.length > 0 ? (
              <img
                src={getImageUrl(images[imageIndex])}
                alt={listing.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-600">
                <Package className="w-16 h-16" />
              </div>
            )}

            {/* Close */}
            <button onClick={onClose} className="absolute top-3 right-3 p-2 bg-black/60 backdrop-blur rounded-full">
              <X className="w-5 h-5 text-white" />
            </button>

            {/* Arrows */}
            {images.length > 1 && (
              <>
                <button
                  onClick={() => setImageIndex((i) => (i - 1 + images.length) % images.length)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/60 backdrop-blur rounded-full"
                >
                  <ChevronLeft className="w-5 h-5 text-white" />
                </button>
                <button
                  onClick={() => setImageIndex((i) => (i + 1) % images.length)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/60 backdrop-blur rounded-full"
                >
                  <ChevronRight className="w-5 h-5 text-white" />
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {images.map((_, i) => (
                    <div key={i} className={`w-2 h-2 rounded-full ${i === imageIndex ? 'bg-white' : 'bg-white/30'}`} />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Content */}
          <div className="p-5 space-y-4">
            {/* Price & title */}
            <div>
              <p className="text-2xl font-black text-white">{priceEur} €</p>
              <h2 className="text-lg font-bold text-white mt-1">{listing.title}</h2>
              {listing.brand && (
                <p className="text-sm text-purple-300 font-medium">{listing.brand}</p>
              )}
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              <span className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-xs text-gray-300">
                {listing.condition}
              </span>
              {listing.size && (
                <span className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-xs text-gray-300">
                  Taille {listing.size}
                </span>
              )}
              <span className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-xs text-gray-300">
                {listing.color}
              </span>
              <span className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-xs text-gray-300">
                {listing.season}
              </span>
            </div>

            {/* Description */}
            {listing.description && (
              <p className="text-sm text-gray-400 leading-relaxed">{listing.description}</p>
            )}

            {/* Seller + views */}
            <div className="flex items-center justify-between py-3 border-t border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300 font-bold text-sm">
                  {listing.seller_prenom?.[0]?.toUpperCase() || '?'}
                </div>
                <span className="text-sm text-gray-300">{listing.seller_prenom || 'Vendeur'}</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Eye className="w-3.5 h-3.5" />
                {listing.views_count} vues
              </div>
            </div>

            {/* Shipping info */}
            <div className="flex items-center gap-2 text-xs text-gray-400 bg-white/5 rounded-xl p-3">
              <MapPin className="w-4 h-4 text-gray-500" />
              Livraison Colissimo — {shippingEur} €
            </div>

            {/* Buy button */}
            {!isSelf && listing.status === 'active' && (
              <button
                onClick={() => onBuy(listing)}
                className="w-full py-3.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
              >
                <ShoppingBag className="w-5 h-5" />
                Acheter — {priceEur} €
              </button>
            )}

            {isSelf && (
              <p className="text-center text-xs text-gray-500 py-2">C&apos;est votre annonce</p>
            )}

            {listing.status === 'sold' && (
              <div className="text-center py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-sm font-bold">
                Vendu
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
