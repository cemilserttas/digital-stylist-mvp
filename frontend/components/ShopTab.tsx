'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, SlidersHorizontal, Store, Tag, Package, Loader2, X, ShoppingBag } from 'lucide-react';
import ListingCard from './ListingCard';
import ListingDetail from './ListingDetail';
import CheckoutModal from './CheckoutModal';
import OrdersSection from './OrdersSection';
import { getListings, searchListings, getMyListings, cancelListing } from '@/lib/api';
import type { MarketplaceListing, User } from '@/lib/types';

export interface ShopTabProps {
  user: User;
}

const SORT_OPTIONS = [
  { value: 'recent', label: 'Plus récents' },
  { value: 'price_asc', label: 'Prix croissant' },
  { value: 'price_desc', label: 'Prix décroissant' },
  { value: 'popular', label: 'Populaires' },
];

const CATEGORY_FILTERS = [
  'Tous', 'T-shirt', 'Chemise', 'Pull', 'Veste', 'Pantalon', 'Jean', 'Short',
  'Robe', 'Jupe', 'Manteau', 'Chaussures', 'Accessoire',
];

type ShopView = 'browse' | 'my-listings' | 'orders';

export default function ShopTab({ user }: ShopTabProps) {
  const [view, setView] = useState<ShopView>('browse');
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [myListings, setMyListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [sort, setSort] = useState('recent');
  const [categoryFilter, setCategoryFilter] = useState('Tous');
  const [selectedListing, setSelectedListing] = useState<MarketplaceListing | null>(null);
  const [checkoutListing, setCheckoutListing] = useState<MarketplaceListing | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { sort, limit: 40 };
      if (categoryFilter !== 'Tous') params.category_type = categoryFilter;
      const data = await getListings(params);
      setListings(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [sort, categoryFilter]);

  const fetchMyListings = useCallback(async () => {
    try {
      const data = await getMyListings();
      setMyListings(data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  useEffect(() => {
    if (view === 'my-listings') fetchMyListings();
  }, [view, fetchMyListings]);

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    if (searchTimeout) clearTimeout(searchTimeout);
    if (!q.trim()) {
      fetchListings();
      return;
    }
    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchListings(q.trim());
        setListings(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 400);
    setSearchTimeout(timeout);
  };

  const handleCancelListing = async (listingId: number) => {
    if (!confirm('Retirer cette annonce ?')) return;
    try {
      await cancelListing(listingId);
      fetchMyListings();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="pt-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Store className="w-6 h-6 text-purple-400" />
            Boutique
          </h1>
          <p className="text-sm text-gray-500 mt-1">Achète et vends des vêtements</p>
        </div>
      </div>

      {/* View tabs */}
      <div className="flex bg-white/5 rounded-xl p-1 gap-1">
        {([
          { key: 'browse', label: 'Explorer', icon: Search },
          { key: 'my-listings', label: 'Mes annonces', icon: Tag },
          { key: 'orders', label: 'Commandes', icon: Package },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
              view === key ? 'bg-purple-500/20 text-purple-300' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Browse view */}
      {view === 'browse' && (
        <>
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Rechercher un article..."
              className="w-full pl-10 pr-10 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-purple-500/50 focus:outline-none"
            />
            {searchQuery && (
              <button onClick={() => handleSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-gray-500 hover:text-gray-300" />
              </button>
            )}
          </div>

          {/* Category chips */}
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {CATEGORY_FILTERS.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                  categoryFilter === cat
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">{listings.length} article{listings.length !== 1 ? 's' : ''}</p>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-gray-300 focus:outline-none"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Listings grid */}
          {loading ? (
            <div className="text-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto" />
              <p className="text-gray-500 text-sm mt-3">Chargement...</p>
            </div>
          ) : listings.length === 0 ? (
            <div className="text-center py-16 bg-white/5 rounded-2xl border border-dashed border-white/10">
              <ShoppingBag className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 font-medium">Aucun article en vente</p>
              <p className="text-gray-600 text-sm mt-1">
                {searchQuery ? 'Essayez une autre recherche' : 'Vendez vos vêtements depuis votre garde-robe !'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {listings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  onClick={setSelectedListing}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* My Listings view */}
      {view === 'my-listings' && (
        <div className="space-y-4">
          {myListings.length === 0 ? (
            <div className="text-center py-16 bg-white/5 rounded-2xl border border-dashed border-white/10">
              <Tag className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">Aucune annonce</p>
              <p className="text-gray-600 text-sm mt-1">
                Allez dans votre garde-robe et cliquez &quot;Vendre&quot; sur un vêtement
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {myListings.map((listing) => {
                const priceEur = (listing.price_cents / 100).toFixed(2);
                return (
                  <div key={listing.id} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-3">
                    <div className="w-14 h-14 rounded-lg bg-gray-800 overflow-hidden shrink-0">
                      {listing.image_urls?.[0] && (
                        <img src={listing.image_urls[0]} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{listing.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          listing.status === 'active' ? 'bg-green-500/20 text-green-300' :
                          listing.status === 'sold' ? 'bg-blue-500/20 text-blue-300' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {listing.status === 'active' ? 'En vente' : listing.status === 'sold' ? 'Vendu' : 'Annulé'}
                        </span>
                        <span className="text-xs text-gray-500">{listing.views_count} vues</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-white">{priceEur} €</p>
                      {listing.status === 'active' && (
                        <button
                          onClick={() => handleCancelListing(listing.id)}
                          className="text-[10px] text-red-400 hover:text-red-300 mt-1"
                        >
                          Retirer
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Orders view */}
      {view === 'orders' && <OrdersSection userId={user.id} />}

      {/* Listing detail modal */}
      {selectedListing && (
        <ListingDetail
          listing={selectedListing}
          onClose={() => setSelectedListing(null)}
          onBuy={(l) => {
            setSelectedListing(null);
            setCheckoutListing(l);
          }}
          isSelf={selectedListing.seller_id === user.id}
        />
      )}

      {/* Checkout modal */}
      {checkoutListing && (
        <CheckoutModal
          listing={checkoutListing}
          userId={user.id}
          onClose={() => setCheckoutListing(null)}
          onSuccess={() => {
            setCheckoutListing(null);
            setView('orders');
          }}
        />
      )}
    </div>
  );
}
