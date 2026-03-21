'use client';

import { Shirt, Sparkles, Zap } from 'lucide-react';
import ErrorBoundary from '@/components/ErrorBoundary';
import UploadSection from '@/components/UploadSection';
import WardrobeGallery from '@/components/WardrobeGallery';
import WardrobeStats from '@/components/WardrobeStats';
import WardrobeScore from '@/components/WardrobeScore';
import type { User, ClothingItem, TabType } from '@/lib/types';
import { FREE_ITEM_LIMIT } from '@/lib/types';

export interface WardrobeTabProps {
  user: User;
  activeTab: Extract<TabType, 'wardrobe' | 'wishlist'>;
  wardrobeItems: ClothingItem[];
  wishlistItems: ClothingItem[];
  loadingWardrobe: boolean;
  loadingWishlist: boolean;
  onUploadComplete: () => void;
  onRefreshWardrobe: () => void;
  onRefreshWishlist: () => void;
}

export default function WardrobeTab({
  user, activeTab, wardrobeItems, wishlistItems,
  loadingWardrobe, loadingWishlist, onUploadComplete, onRefreshWardrobe, onRefreshWishlist,
}: WardrobeTabProps) {
  const currentItems = activeTab === 'wardrobe' ? wardrobeItems : wishlistItems;
  const currentLoading = activeTab === 'wardrobe' ? loadingWardrobe : loadingWishlist;
  const onRefresh = activeTab === 'wardrobe' ? onRefreshWardrobe : onRefreshWishlist;

  const totalItems = wardrobeItems.length + wishlistItems.length;
  const isPremium = user.is_premium;
  const nearLimit = !isPremium && totalItems >= FREE_ITEM_LIMIT - 3;
  const atLimit = !isPremium && totalItems >= FREE_ITEM_LIMIT;

  return (
    <div className="space-y-8">
      {/* Freemium upgrade banner */}
      {(nearLimit || atLimit) && (
        <div className={`flex items-center gap-4 rounded-2xl px-5 py-4 border ${
          atLimit
            ? 'bg-red-500/10 border-red-500/30 text-red-300'
            : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
        }`}>
          <Zap className="w-5 h-5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm">
              {atLimit ? 'Limite atteinte — passez à Premium' : `Plus que ${FREE_ITEM_LIMIT - totalItems} pièce(s) avant la limite`}
            </p>
            <p className="text-xs opacity-70 mt-0.5">
              {atLimit
                ? 'Votre garde-robe gratuite est pleine (20 pièces).'
                : `Plan gratuit : ${totalItems} / ${FREE_ITEM_LIMIT} pièces utilisées.`}
            </p>
          </div>
          <button className="shrink-0 text-xs font-black bg-white/10 hover:bg-white/20 transition-colors px-3 py-1.5 rounded-lg">
            ✨ Premium
          </button>
        </div>
      )}

      {activeTab === 'wardrobe' && (
        <>
          <ErrorBoundary label="Statistiques">
            <WardrobeStats userId={user.id} itemCount={wardrobeItems.length} />
          </ErrorBoundary>
          <ErrorBoundary label="Bilan IA">
            <WardrobeScore userId={user.id} itemCount={wardrobeItems.length} />
          </ErrorBoundary>
        </>
      )}

      <UploadSection
        userId={user.id}
        category={activeTab}
        onUploadComplete={onUploadComplete}
      />

      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {activeTab === 'wardrobe' ? 'Ma Garde-Robe' : 'Mes Inspirations'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {activeTab === 'wardrobe'
                ? "Vos vêtements analysés par l'IA"
                : 'Les looks que vous aimeriez porter'}
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
            activeTab === 'wishlist' ? 'bg-purple-500/20 text-purple-300' : 'bg-white/10 text-gray-400'
          }`}>
            {currentItems.length} pièces
          </span>
        </div>

        {currentItems.length === 0 && !currentLoading ? (
          <div className="text-center py-16 bg-white/5 rounded-2xl border border-dashed border-white/10">
            {activeTab === 'wardrobe' ? (
              <>
                <Shirt className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 font-medium">Votre garde-robe est vide</p>
                <p className="text-gray-600 text-sm mt-1">Uploadez une photo de vêtement pour commencer</p>
              </>
            ) : (
              <>
                <Sparkles className="w-12 h-12 text-purple-500/50 mx-auto mb-4" />
                <p className="text-gray-400 font-medium">Pas encore d&apos;inspirations</p>
                <p className="text-gray-600 text-sm mt-1">Uploadez un look qui vous plaît</p>
              </>
            )}
          </div>
        ) : (
          <WardrobeGallery
            items={currentItems}
            loading={currentLoading}
            onItemChanged={onRefresh}
          />
        )}
      </div>
    </div>
  );
}
