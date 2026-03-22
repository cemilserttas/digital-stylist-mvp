'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Sparkles, Loader2, Tag } from 'lucide-react';
import { createListing, getAiPriceSuggestion, getImageUrl } from '@/lib/api';
import type { ListingCondition, PriceSuggestion } from '@/lib/types';
import { LISTING_CONDITIONS } from '@/lib/types';

interface PrefilledData {
  clothing_item_id?: number | null;
  title: string;
  description: string;
  price_cents: number;
  condition: string;
  size?: string | null;
  brand?: string | null;
  category_type: string;
  color: string;
  season: string;
  image_urls: string[];
}

export interface CreateListingModalProps {
  prefilled: PrefilledData;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateListingModal({ prefilled, onClose, onCreated }: CreateListingModalProps) {
  const [title, setTitle] = useState(prefilled.title);
  const [description, setDescription] = useState(prefilled.description);
  const [priceEur, setPriceEur] = useState(prefilled.price_cents > 0 ? (prefilled.price_cents / 100).toFixed(2) : '');
  const [condition, setCondition] = useState<string>(prefilled.condition || 'Bon état');
  const [size, setSize] = useState(prefilled.size || '');
  const [brand, setBrand] = useState(prefilled.brand || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiPrice, setAiPrice] = useState<PriceSuggestion | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [step, setStep] = useState(1); // 1: info, 2: price, 3: confirm

  const firstImage = prefilled.image_urls?.[0];

  const handleAiPrice = async () => {
    setLoadingAi(true);
    try {
      // Need a listing ID first — create as draft then fetch AI price
      // For MVP: use the prefilled data directly
      const result = await createListing({
        clothing_item_id: prefilled.clothing_item_id,
        title: title || prefilled.title,
        description,
        price_cents: 100, // placeholder
        condition,
        size: size || undefined,
        brand: brand || undefined,
        category_type: prefilled.category_type,
        color: prefilled.color,
        season: prefilled.season,
        image_urls: prefilled.image_urls,
      });
      const suggestion = await getAiPriceSuggestion(result.id);
      setAiPrice(suggestion);
      setPriceEur(suggestion.suggested.toFixed(2));
      // Update the listing with real price later on submit
    } catch {
      // Fallback — can't get AI price
    } finally {
      setLoadingAi(false);
    }
  };

  const handleSubmit = async () => {
    const priceCents = Math.round(parseFloat(priceEur || '0') * 100);
    if (priceCents < 100) {
      setError('Prix minimum : 1,00 €');
      return;
    }
    if (!title.trim()) {
      setError('Donnez un titre à votre annonce');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await createListing({
        clothing_item_id: prefilled.clothing_item_id,
        title: title.trim(),
        description: description.trim(),
        price_cents: priceCents,
        condition,
        size: size || undefined,
        brand: brand || undefined,
        category_type: prefilled.category_type,
        color: prefilled.color,
        season: prefilled.season,
        image_urls: prefilled.image_urls,
      });
      onCreated();
      onClose();
    } catch {
      setError('Erreur lors de la publication');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-end sm:items-center justify-center" onClick={onClose}>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-gray-900 w-full sm:max-w-md sm:rounded-2xl max-h-[90vh] overflow-y-auto border border-white/10"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gray-900/90 backdrop-blur-xl border-b border-white/10 px-5 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">
            <Tag className="w-5 h-5 inline mr-2 text-purple-400" />
            Vendre cet article
          </h2>
          <button onClick={onClose} className="p-2 rounded-xl bg-white/5 hover:bg-white/10">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Preview image */}
          {firstImage && (
            <div className="aspect-[4/3] rounded-xl overflow-hidden bg-gray-800">
              <img src={getImageUrl(firstImage)} alt={title} className="w-full h-full object-cover" />
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Titre</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-purple-500/50 focus:outline-none"
              placeholder="Ex: T-shirt Nike Dri-FIT noir"
            />
          </div>

          {/* Brand + Size row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Marque</label>
              <input
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-purple-500/50 focus:outline-none"
                placeholder="Nike, Zara..."
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Taille</label>
              <input
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-purple-500/50 focus:outline-none"
                placeholder="M, L, 40..."
              />
            </div>
          </div>

          {/* Condition */}
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">État</label>
            <div className="grid grid-cols-2 gap-2">
              {LISTING_CONDITIONS.map((c) => (
                <button
                  key={c}
                  onClick={() => setCondition(c)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
                    condition === c
                      ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                      : 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-purple-500/50 focus:outline-none resize-none"
              placeholder="Décrivez l'article (optionnel)..."
            />
          </div>

          {/* Price */}
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Prix (€)</label>
            <div className="relative">
              <input
                type="number"
                step="0.50"
                min="1"
                max="1000"
                value={priceEur}
                onChange={(e) => setPriceEur(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-lg font-bold focus:border-purple-500/50 focus:outline-none"
                placeholder="15.00"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">€</span>
            </div>

            {/* AI Price suggestion */}
            {aiPrice ? (
              <div className="mt-2 p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-bold text-purple-300">Estimation IA</span>
                </div>
                <p className="text-sm text-gray-300">
                  {aiPrice.price_min} € — {aiPrice.price_max} € (suggéré : <strong className="text-white">{aiPrice.suggested} €</strong>)
                </p>
                <p className="text-xs text-gray-500 mt-1">{aiPrice.reasoning}</p>
              </div>
            ) : (
              <button
                onClick={handleAiPrice}
                disabled={loadingAi}
                className="mt-2 flex items-center gap-2 text-xs text-purple-400 hover:text-purple-300 transition-colors disabled:opacity-50"
              >
                {loadingAi ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                {loadingAi ? 'Estimation en cours...' : 'Obtenir une estimation IA'}
              </button>
            )}
          </div>

          {/* Commission info */}
          {priceEur && parseFloat(priceEur) > 0 && (
            <div className="text-xs text-gray-500 bg-white/5 rounded-xl p-3 space-y-1">
              <div className="flex justify-between">
                <span>Prix de vente</span>
                <span className="text-white">{parseFloat(priceEur).toFixed(2)} €</span>
              </div>
              <div className="flex justify-between">
                <span>Commission (10%)</span>
                <span className="text-red-400">-{(parseFloat(priceEur) * 0.1).toFixed(2)} €</span>
              </div>
              <div className="flex justify-between border-t border-white/10 pt-1 font-bold">
                <span className="text-gray-300">Vous recevez</span>
                <span className="text-green-400">{(parseFloat(priceEur) * 0.9).toFixed(2)} €</span>
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-400 text-center">{error}</p>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full py-3.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Tag className="w-5 h-5" />}
            {saving ? 'Publication...' : 'Publier l\'annonce'}
          </button>

          <p className="text-center text-[10px] text-gray-600">
            En publiant, vous acceptez les conditions de vente. Commission de 10% prélevée à la vente.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
