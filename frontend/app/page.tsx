'use client';

import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Clock, MapPin, Settings, Sparkles } from 'lucide-react';
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
import BottomNav from '@/components/BottomNav';
import { getWardrobe, getDailySuggestions, saveClick, updateUser } from '@/lib/api';
import type { User, ClothingItem, Suggestion, SuggestionPiece, TabType } from '@/lib/types';
import { buildShopUrl } from '@/lib/utils';

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

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('stylist_user');
    if (stored) setUser(JSON.parse(stored));
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
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 429) {
        setSuggestionLimitReached(true);
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
    const url = buildShopUrl(piece.lien_recherche || `${piece.type} ${piece.marque}`);
    saveClick(user.id, {
      product_name: piece.type, marque: piece.marque,
      prix: typeof piece.prix === 'number' ? piece.prix : parseFloat(String(piece.prix)) || 0,
      url,
    }).catch(console.error);
  };

  const handleTabChange = (tab: TabType) => { playPop(); setActiveTab(tab); };

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
    <main className="min-h-screen bg-gray-950 font-sans text-white pb-20">
      <header className="sticky top-0 z-30 bg-gray-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <h1 className="text-lg font-black tracking-tight">
              DIGITAL<span className="text-purple-400">STYLIST</span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
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
            <button onClick={() => setShowSettings(true)} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors" title="Paramètres">
              <Settings className="w-4 h-4 text-gray-400" />
            </button>
            <button onClick={handleLogout} className="text-xs text-gray-500 hover:text-red-400 transition-colors" title="Déconnexion">
              Déco
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
                onRefresh={fetchSuggestions} onProductClick={handleProductClick}
              />
            )}

            {activeTab === 'calendar' && (
              <ErrorBoundary label="Planning">
                <div className="pt-6">
                  <OutfitCalendar userId={user.id} wardrobeItems={wardrobeItems} forecast={weather?.forecast} />
                </div>
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

      <div className="fixed bottom-24 right-4 sm:right-6 z-50">
        <ErrorBoundary label="Chatbot">
          <ChatBot userId={user.id} userName={user.prenom} />
        </ErrorBoundary>
      </div>
    </main>
  );
}
