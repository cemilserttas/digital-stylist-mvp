'use client';

import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Clock, MapPin, Settings, Sparkles, Crown, LogOut } from 'lucide-react';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { useWeather } from '@/hooks/useWeather';
import UserForm from '@/components/UserForm';
import UserSettings from '@/components/UserSettings';
import StylePreferences from '@/components/StylePreferences';
import ChatBot from '@/components/ChatBot';
import ErrorBoundary from '@/components/ErrorBoundary';
import OutfitCalendar from '@/components/OutfitCalendar';
import HomeTab from '@/components/HomeTab';
import WardrobeTab from '@/components/WardrobeTab';
import ShopTab from '@/components/ShopTab';
import BottomNav from '@/components/BottomNav';
import UpgradeModal from '@/components/UpgradeModal';
import StreakBadge from '@/components/StreakBadge';
import { getWardrobe, getDailySuggestions, saveClick, updateUser, getUser } from '@/lib/api';
import type { User, ClothingItem, Suggestion, SuggestionPiece, TabType } from '@/lib/types';
import { buildShopUrl, enrichProductUrl } from '@/lib/utils';
import { identifyUser, track, resetAnalytics } from '@/lib/analytics';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [wardrobeItems, setWardrobeItems] = useState<ClothingItem[]>([]);
  const [wishlistItems, setWishlistItems] = useState<ClothingItem[]>([]);
  const [loadingWardrobe, setLoadingWardrobe] = useState(false);
  const [loadingWishlist, setLoadingWishlist] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [showSettings, setShowSettings] = useState(false);
  const [showStylePrefs, setShowStylePrefs] = useState(false);
  const { playPop, playSuccessChime } = useSoundEffects();
  const weather = useWeather();
  const [currentTime, setCurrentTime] = useState(new Date());

  const [suggestions, setSuggestions] = useState<Suggestion[]>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('stylist_suggestions');
      if (cached) { try { return JSON.parse(cached); } catch { /* ignore */ } }
    }
    return [];
  });
  const [greeting, setGreeting] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem('stylist_greeting') || '' : ''
  );
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);
  const [suggestionLimitReached, setSuggestionLimitReached] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('stylist_user');
    if (stored) setUser(JSON.parse(stored));
  }, []);

  // Refresh user after Stripe redirect (premium status may have changed)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('shop_payment') === 'success') {
      window.history.replaceState({}, '', window.location.pathname);
      setActiveTab('shop');
    }
    if (params.get('payment') === 'success') {
      // Remove query param without reload
      window.history.replaceState({}, '', window.location.pathname);
      const stored = localStorage.getItem('stylist_user');
      if (!stored) return;
      const storedUser = JSON.parse(stored) as User;
      getUser(storedUser.id).then((fresh: User) => {
        setUser(fresh);
        localStorage.setItem('stylist_user', JSON.stringify(fresh));
      }).catch(console.error);
    }
  }, []);

  const fetchWardrobe = useCallback(async () => {
    if (!user) return;
    setLoadingWardrobe(true);
    try { setWardrobeItems(await getWardrobe(user.id, 'wardrobe')); }
    catch (err) { console.error(err); }
    finally { setLoadingWardrobe(false); }
  }, [user]);

  const fetchWishlist = useCallback(async () => {
    if (!user) return;
    setLoadingWishlist(true);
    try { setWishlistItems(await getWardrobe(user.id, 'wishlist')); }
    catch (err) { console.error(err); }
    finally { setLoadingWishlist(false); }
  }, [user]);

  const fetchSuggestions = useCallback(async () => {
    if (!user || !weather) return;
    setLoadingSuggestions(true);
    try {
      const result = await getDailySuggestions(user.id, {
        temperature: weather.temperature, description: weather.description, ville: weather.ville,
      });
      const newSuggestions = result.suggestions || [];
      const newGreeting = result.greeting || `Bonjour ${user.prenom} !`;
      setSuggestions(newSuggestions);
      setGreeting(newGreeting);
      localStorage.setItem('stylist_suggestions', JSON.stringify(newSuggestions));
      localStorage.setItem('stylist_greeting', newGreeting);
      track('suggestion_viewed', { count: newSuggestions.length, ville: weather?.ville, temp: weather?.temperature });
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 429) {
        setSuggestionLimitReached(true);
        track('paywall_seen', { trigger: 'suggestion_limit', is_premium: user?.is_premium ?? false });
        if (!user?.is_premium) setShowUpgradeModal(true);
      } else {
        console.error(err);
      }
    }
    finally { setLoadingSuggestions(false); }
  }, [user, weather]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('stylist_user', JSON.stringify(user));
      fetchWardrobe();
      fetchWishlist();
    }
  }, [user, fetchWardrobe, fetchWishlist]);

  useEffect(() => {
    if (user && weather && suggestions.length === 0 && !loadingSuggestions && !hasFetchedOnce) {
      setHasFetchedOnce(true);
      fetchSuggestions();
    }
  }, [user, weather, suggestions.length, loadingSuggestions, hasFetchedOnce, fetchSuggestions]);

  const handleUserCreated = (newUser: User) => {
    setUser(newUser);
    identifyUser(newUser.id, {
      prenom: newUser.prenom,
      genre: newUser.genre,
      morphologie: newUser.morphologie,
      is_premium: newUser.is_premium ?? false,
      has_referral: !!newUser.referral_code,
    });
    track('user_signed_up', { genre: newUser.genre, morphologie: newUser.morphologie });
    if (!newUser.style_prefere) setShowStylePrefs(true);
  };

  const handleStylePrefsComplete = async (preferences: string) => {
    if (user) {
      try {
        const updated = await updateUser(user.id, { style_prefere: preferences });
        setUser(updated);
        localStorage.setItem('stylist_user', JSON.stringify(updated));
      } catch (err) { console.error(err); }
    }
    setShowStylePrefs(false);
    setShowSettings(false);
    setActiveTab('home');
  };

  const handleLogout = () => {
    resetAnalytics();
    ['stylist_token', 'stylist_user', 'stylist_suggestions', 'stylist_greeting'].forEach(k =>
      localStorage.removeItem(k)
    );
    setUser(null);
    setWardrobeItems([]);
    setWishlistItems([]);
    setSuggestions([]);
  };

  const handleProductClick = (piece: SuggestionPiece) => {
    if (!user) return;
    playSuccessChime();
    const hasDirectUrl = piece.url_produit && piece.url_produit.startsWith('http');
    const url = hasDirectUrl
      ? enrichProductUrl(piece.url_produit!)
      : buildShopUrl(piece.lien_recherche || `${piece.type} ${piece.marque}`);
    track('product_link_clicked', {
      marque: piece.marque, type: piece.type, prix: piece.prix,
      shop: piece.shop || null, direct_link: !!hasDirectUrl,
    });
    saveClick(user.id, {
      product_name: piece.type, marque: piece.marque,
      prix: typeof piece.prix === 'number' ? piece.prix : parseFloat(String(piece.prix)) || 0,
      url,
    }).catch(console.error);
  };

  const handleTabChange = (tab: TabType) => { playPop(); setActiveTab(tab); track('tab_changed', { tab }); };

  // ─── Guard screens ────────────────────────────────────────────────────────────
  if (!user) return <UserForm onUserCreated={handleUserCreated} />;
  if (showStylePrefs) return (
    <StylePreferences
      userName={user.prenom}
      initialPreferences={user.style_prefere || undefined}
      onComplete={handleStylePrefsComplete}
    />
  );
  if (showSettings) return (
    <UserSettings
      user={user}
      wardrobeCount={wardrobeItems.length}
      onBack={() => setShowSettings(false)}
      onUserUpdated={(updated) => {
        setUser(updated);
        localStorage.setItem('stylist_user', JSON.stringify(updated));
      }}
      onLogout={handleLogout}
    />
  );

  const timeStr = currentTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const dateStr = currentTime.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <main className="min-h-screen bg-gray-950 font-sans text-white" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}>
      <header className="sticky top-0 z-30 bg-gray-950/90 backdrop-blur-xl border-b border-white/5" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <h1 className="text-lg font-black tracking-tight">
              DIGITAL<span className="bg-linear-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">STYLIST</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {/* Mobile: temperature chip only */}
            {weather && (
              <div className="flex sm:hidden items-center gap-1 text-sm font-bold text-white bg-white/5 px-2.5 py-1 rounded-full">
                <span>{weather.temperature}°</span>
              </div>
            )}
            {/* Desktop: full weather + time + name */}
            <div className="hidden sm:flex items-center gap-3">
              {weather && (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <MapPin className="w-3 h-3" />
                  <span>{weather.ville}</span>
                  <span className="text-white font-bold">{weather.temperature}°</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-sm text-gray-400">
                <Clock className="w-3 h-3" />
                <span className="font-mono">{timeStr}</span>
              </div>
            </div>
            <p className="text-sm font-bold text-white hidden sm:block">{user.prenom}</p>
            <StreakBadge streak={user.streak_current ?? 0} streakMax={user.streak_max} />
            {!user.is_premium && (
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="flex items-center gap-1.5 text-xs font-bold bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 px-3 py-1.5 rounded-full transition-colors"
                title="Passer à Premium"
              >
                <Crown className="w-3.5 h-3.5" />
                Premium
              </button>
            )}
            <button onClick={() => setShowSettings(true)} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors" title="Paramètres">
              <Settings className="w-4 h-4 text-gray-400" />
            </button>
            <button onClick={handleLogout} className="p-2 rounded-xl bg-white/5 hover:bg-red-500/10 transition-colors group" title="Déconnexion">
              <LogOut className="w-4 h-4 text-gray-500 group-hover:text-red-400 transition-colors" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-32">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {activeTab === 'home' && (
              <HomeTab
                user={user} weather={weather} greeting={greeting} dateStr={dateStr}
                suggestions={suggestions} loadingSuggestions={loadingSuggestions}
                suggestionLimitReached={suggestionLimitReached}
                wardrobeCount={wardrobeItems.length}
                onRefresh={fetchSuggestions} onProductClick={handleProductClick}
                onGoToWardrobe={() => handleTabChange('wardrobe')}
              />
            )}

            {activeTab === 'calendar' && (
              <ErrorBoundary label="Planning">
                <div className="pt-6">
                  <OutfitCalendar userId={user.id} wardrobeItems={wardrobeItems} forecast={weather?.forecast} />
                </div>
              </ErrorBoundary>
            )}

            {activeTab === 'shop' && (
              <ErrorBoundary label="Boutique">
                <ShopTab user={user} />
              </ErrorBoundary>
            )}

            {(activeTab === 'wardrobe' || activeTab === 'wishlist') && (
              <ErrorBoundary label="Garde-robe">
                <WardrobeTab
                  user={user} activeTab={activeTab}
                  wardrobeItems={wardrobeItems} wishlistItems={wishlistItems}
                  loadingWardrobe={loadingWardrobe} loadingWishlist={loadingWishlist}
                  onUploadComplete={activeTab === 'wardrobe' ? fetchWardrobe : fetchWishlist}
                  onRefreshWardrobe={fetchWardrobe} onRefreshWishlist={fetchWishlist}
                />
              </ErrorBoundary>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <BottomNav
        activeTab={activeTab} onTabChange={handleTabChange}
        wardrobeCount={wardrobeItems.length} wishlistCount={wishlistItems.length}
      />

      <div className="fixed right-4 sm:right-6 z-50" style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}>
        <ErrorBoundary label="Chatbot">
          <ChatBot userId={user.id} userName={user.prenom} />
        </ErrorBoundary>
      </div>

      {showUpgradeModal && (
        <UpgradeModal
          user={user}
          onClose={() => setShowUpgradeModal(false)}
          defaultPlan="monthly"
        />
      )}
    </main>
  );
}
