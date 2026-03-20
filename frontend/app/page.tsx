'use client';

import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { useWeather } from '@/hooks/useWeather';
import UserForm from '@/components/UserForm';
import UploadSection from '@/components/UploadSection';
import WardrobeGallery from '@/components/WardrobeGallery';
import WeatherAnimation from '@/components/WeatherAnimation';
import UserSettings from '@/components/UserSettings';
import ChatBot from '@/components/ChatBot';
import StylePreferences from '@/components/StylePreferences';
import SuggestionsSection from '@/components/SuggestionsSection';
import ErrorBoundary from '@/components/ErrorBoundary';
import OutfitCalendar from '@/components/OutfitCalendar';
import WardrobeStats from '@/components/WardrobeStats';
import { getWardrobe, getDailySuggestions, saveClick, updateUser } from '@/lib/api';
import type { User, ClothingItem, Suggestion, SuggestionPiece, TabType } from '@/lib/types';
import { buildShopUrl } from '@/lib/utils';
import {
  Shirt, Sparkles, Cloud, Sun, CloudRain, CloudSnow, CloudLightning,
  CloudDrizzle, Wind, MapPin, Clock, Settings, Heart, CalendarDays
} from 'lucide-react';

function WeatherIcon({ code }: { code: string }) {
  if (code.includes('thunder')) return <CloudLightning className="w-8 h-8 text-yellow-400" />;
  if (code.includes('rain') || code.includes('shower')) return <CloudRain className="w-8 h-8 text-blue-400" />;
  if (code.includes('drizzle')) return <CloudDrizzle className="w-8 h-8 text-blue-300" />;
  if (code.includes('snow')) return <CloudSnow className="w-8 h-8 text-blue-200" />;
  if (code.includes('cloud') || code.includes('overcast')) return <Cloud className="w-8 h-8 text-gray-400" />;
  if (code.includes('wind')) return <Wind className="w-8 h-8 text-gray-400" />;
  return <Sun className="w-8 h-8 text-yellow-400" />;
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [wardrobeItems, setWardrobeItems] = useState<ClothingItem[]>([]);
  const [wishlistItems, setWishlistItems] = useState<ClothingItem[]>([]);
  const [loadingWardrobe, setLoadingWardrobe] = useState(false);
  const [loadingWishlist, setLoadingWishlist] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const { playPop, playSuccessChime } = useSoundEffects();

  // Weather & time
  const weather = useWeather();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Suggestions — restored from cache to avoid unnecessary API calls
  const [suggestions, setSuggestions] = useState<Suggestion[]>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('stylist_suggestions');
      if (cached) { try { return JSON.parse(cached); } catch { /* ignore */ } }
    }
    return [];
  });
  const [greeting, setGreeting] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('stylist_greeting') || '';
    }
    return '';
  });
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showStylePrefs, setShowStylePrefs] = useState(false);

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // User from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem('stylist_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const fetchWardrobe = useCallback(async () => {
    if (!user) return;
    setLoadingWardrobe(true);
    try {
      setWardrobeItems(await getWardrobe(user.id, 'wardrobe'));
    } catch (err) { console.error(err); }
    finally { setLoadingWardrobe(false); }
  }, [user]);

  const fetchWishlist = useCallback(async () => {
    if (!user) return;
    setLoadingWishlist(true);
    try {
      setWishlistItems(await getWardrobe(user.id, 'wishlist'));
    } catch (err) { console.error(err); }
    finally { setLoadingWishlist(false); }
  }, [user]);

  const fetchSuggestions = useCallback(async () => {
    if (!user || !weather) return;
    setLoadingSuggestions(true);
    try {
      const result = await getDailySuggestions(user.id, {
        temperature: weather.temperature,
        description: weather.description,
        ville: weather.ville,
      });
      const newSuggestions = result.suggestions || [];
      const newGreeting = result.greeting || `Bonjour ${user.prenom} !`;
      setSuggestions(newSuggestions);
      setGreeting(newGreeting);
      // Cache to avoid re-fetching on refresh
      localStorage.setItem('stylist_suggestions', JSON.stringify(newSuggestions));
      localStorage.setItem('stylist_greeting', newGreeting);
    } catch (err) { console.error(err); }
    finally { setLoadingSuggestions(false); }
  }, [user, weather]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('stylist_user', JSON.stringify(user));
      fetchWardrobe();
      fetchWishlist();
    }
  }, [user, fetchWardrobe, fetchWishlist]);

  // Only fetch suggestions on first login (no cache). Refreshes use cached data.
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);
  useEffect(() => {
    if (user && weather && suggestions.length === 0 && !loadingSuggestions && !hasFetchedOnce) {
      setHasFetchedOnce(true);
      fetchSuggestions();
    }
  }, [user, weather, suggestions.length, loadingSuggestions, hasFetchedOnce, fetchSuggestions]);

  const handleUserCreated = (newUser: User) => {
    setUser(newUser);
    // Show style preferences for new users (no style_prefere set yet)
    if (!newUser.style_prefere) {
      setShowStylePrefs(true);
    }
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

  const handleUploadComplete = () => {
    if (activeTab === 'wardrobe') fetchWardrobe();
    else fetchWishlist();
  };

  const handleLogout = () => {
    localStorage.removeItem('stylist_token');
    localStorage.removeItem('stylist_user');
    localStorage.removeItem('stylist_suggestions');
    localStorage.removeItem('stylist_greeting');
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
      product_name: piece.type,
      marque: piece.marque,
      prix: typeof piece.prix === 'number' ? piece.prix : parseFloat(String(piece.prix)) || 0,
      url,
    }).catch(console.error);
  };

  if (!user) {
    return <UserForm onUserCreated={handleUserCreated} />;
  }

  if (showStylePrefs) {
    return (
      <StylePreferences
        userName={user.prenom}
        initialPreferences={user.style_prefere || undefined}
        onComplete={handleStylePrefsComplete}
      />
    );
  }

  if (showSettings) {
    return (
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
  }

  const currentItems = activeTab === 'wardrobe' ? wardrobeItems : wishlistItems;
  const currentLoading = activeTab === 'wardrobe' ? loadingWardrobe : loadingWishlist;

  const timeStr = currentTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const dateStr = currentTime.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <main className="min-h-screen bg-gray-950 font-sans text-white pb-20">
      {/* Header */}
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
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
              title="Paramètres"
            >
              <Settings className="w-4 h-4 text-gray-400" />
            </button>
            <button
              onClick={handleLogout}
              className="text-xs text-gray-500 hover:text-red-400 transition-colors"
              title="Déconnexion"
            >
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
            transition={{ duration: 0.2, ease: "easeOut" }}
          >

            {/* ===== HOME TAB ===== */}
            {activeTab === 'home' && (
              <div className="space-y-8">
                {/* Weather + Greeting Hero */}
                <div className="bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-white/10 rounded-3xl p-8 backdrop-blur relative overflow-hidden min-h-[180px]">
                  {/* Animated weather background */}
                  {weather && <WeatherAnimation weatherCode={weather.icon} />}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -mr-20 -mt-20" />
                  <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="flex-1">
                      <p className="text-sm text-gray-400 capitalize mb-1">{dateStr}</p>
                      <h2 className="text-2xl md:text-3xl font-black text-white mb-3">
                        {greeting || `Bonjour ${user.prenom} 👋`}
                      </h2>
                    </div>
                    {weather && (
                      <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl px-6 py-4">
                        <WeatherIcon code={weather.icon} />
                        <div>
                          <p className="text-3xl font-black text-white">{weather.temperature}°C</p>
                          <p className="text-sm text-gray-400">{weather.description}</p>
                          <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                            <MapPin className="w-3 h-3" />
                            {weather.ville}
                            {weather.wind_speed !== undefined && <span className="ml-2">💨 {weather.wind_speed} km/h</span>}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Suggestions */}
                <ErrorBoundary label="Suggestions">
                  <SuggestionsSection
                    suggestions={suggestions}
                    loading={loadingSuggestions}
                    onRefresh={fetchSuggestions}
                    onProductClick={handleProductClick}
                  />
                </ErrorBoundary>
              </div>
            )}

            {/* ===== CALENDAR TAB ===== */}
            {activeTab === 'calendar' && (
              <ErrorBoundary label="Planning">
                <div className="pt-6">
                  <OutfitCalendar userId={user.id} wardrobeItems={wardrobeItems} />
                </div>
              </ErrorBoundary>
            )}

            {/* ===== WARDROBE / WISHLIST TABS ===== */}
            {(activeTab === 'wardrobe' || activeTab === 'wishlist') && (
              <ErrorBoundary label="Garde-robe">
              <div className="space-y-8">
                {activeTab === 'wardrobe' && (
                  <ErrorBoundary label="Statistiques">
                    <WardrobeStats userId={user.id} itemCount={wardrobeItems.length} />
                  </ErrorBoundary>
                )}

                <UploadSection
                  userId={user.id}
                  category={activeTab}
                  onUploadComplete={handleUploadComplete}
                />

                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-white">
                        {activeTab === 'wardrobe' ? 'Ma Garde-Robe' : 'Mes Inspirations'}
                      </h2>
                      <p className="text-sm text-gray-500 mt-1">
                        {activeTab === 'wardrobe'
                          ? 'Vos vêtements analysés par l\'IA'
                          : 'Les looks que vous aimeriez porter'
                        }
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${activeTab === 'wishlist' ? 'bg-purple-500/20 text-purple-300' : 'bg-white/10 text-gray-400'
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
                      onItemChanged={activeTab === 'wardrobe' ? fetchWardrobe : fetchWishlist}
                    />
                  )}
                </div>
              </div>
              </ErrorBoundary>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ===== BOTTOM NAVIGATION (Mobile First) ===== */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-gray-950/80 backdrop-blur-2xl border-t border-white/10 pb-safe shadow-[0_-20px_40px_-15px_rgba(0,0,0,0.5)]">
        <div className="max-w-md mx-auto px-6 py-3 flex justify-between items-center relative">
          {([
            { key: 'home' as TabType, icon: Sparkles, label: 'Accueil' },
            { key: 'wardrobe' as TabType, icon: Shirt, label: 'Dressing', count: wardrobeItems.length },
            { key: 'calendar' as TabType, icon: CalendarDays, label: 'Planning' },
            { key: 'wishlist' as TabType, icon: Heart, label: 'Wishlist', count: wishlistItems.length },
          ]).map(({ key, icon: Icon, label, count }) => {
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => {
                  if (!isActive) {
                    playPop();
                    setActiveTab(key);
                  }
                }}
                className="relative flex flex-col items-center gap-1 p-2 group"
              >
                <div className="relative">
                  <Icon className={`w-6 h-6 transition-all duration-300 ${isActive ? 'text-white scale-110' : 'text-gray-500 group-hover:text-gray-300'}`} />
                  {isActive && (
                    <motion.div
                      layoutId="bottom-nav-indicator"
                      className="absolute -inset-2 bg-white/10 rounded-xl -z-10"
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    />
                  )}
                  {count !== undefined && count > 0 && (
                    <span className={`absolute -top-1 -right-2 text-[9px] font-black px-1.5 py-0.5 rounded-full ring-2 ring-gray-950 shadow-sm ${isActive ? 'bg-purple-500 text-white' : 'bg-gray-700 text-gray-300'}`}>
                      {count}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] font-semibold transition-colors ${isActive ? 'text-white' : 'text-gray-500'}`}>
                  {label}
                </span>
                {isActive && (
                  <div className="absolute -top-3 w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_10px_2px_rgba(255,255,255,0.5)]" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Chatbot (adjusted position due to bottom nav) */}
      <div className="fixed bottom-24 right-4 sm:right-6 z-50">
        <ErrorBoundary label="Chatbot">
          <ChatBot userId={user.id} userName={user.prenom} />
        </ErrorBoundary>
      </div>

    </main>
  );
}
