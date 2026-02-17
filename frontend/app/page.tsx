'use client';

import { useState, useEffect, useCallback } from 'react';
import UserForm from '@/components/UserForm';
import UploadSection from '@/components/UploadSection';
import WardrobeGallery from '@/components/WardrobeGallery';
import WeatherAnimation from '@/components/WeatherAnimation';
import UserSettings from '@/components/UserSettings';
import ChatBot from '@/components/ChatBot';
import StylePreferences from '@/components/StylePreferences';
import { getWardrobe, getDailySuggestions, saveClick, updateUser } from '@/lib/api';
import {
  Shirt, Sparkles, Cloud, Sun, CloudRain, CloudSnow, CloudLightning,
  CloudDrizzle, Wind, MapPin, Clock, ExternalLink, Loader2, Settings
} from 'lucide-react';

interface User {
  id: number;
  prenom: string;
  morphologie: string;
  genre: string;
  age: number;
  style_prefere?: string | null;
}

interface ClothingItem {
  id: number;
  type: string;
  couleur: string;
  saison: string;
  tags_ia: string;
  image_path: string;
  category?: string;
}

interface SuggestionPiece {
  type: string;
  marque: string;
  prix: number;
  lien_recherche: string;
}

interface Suggestion {
  titre: string;
  description: string;
  pieces: SuggestionPiece[];
  occasion: string;
}

interface WeatherData {
  temperature: number;
  description: string;
  ville: string;
  icon: string;
  humidity?: number;
  wind_speed?: number;
}

type TabType = 'home' | 'wardrobe' | 'wishlist';

function WeatherIcon({ code }: { code: string }) {
  if (code.includes('thunder')) return <CloudLightning className="w-8 h-8 text-yellow-400" />;
  if (code.includes('rain') || code.includes('shower')) return <CloudRain className="w-8 h-8 text-blue-400" />;
  if (code.includes('drizzle')) return <CloudDrizzle className="w-8 h-8 text-blue-300" />;
  if (code.includes('snow')) return <CloudSnow className="w-8 h-8 text-blue-200" />;
  if (code.includes('cloud') || code.includes('overcast')) return <Cloud className="w-8 h-8 text-gray-400" />;
  if (code.includes('wind')) return <Wind className="w-8 h-8 text-gray-400" />;
  return <Sun className="w-8 h-8 text-yellow-400" />;
}

function buildShopUrl(searchTerms: string): string {
  return `https://www.google.com/search?btnI=1&q=${encodeURIComponent(searchTerms + ' acheter')}`;
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [wardrobeItems, setWardrobeItems] = useState<ClothingItem[]>([]);
  const [wishlistItems, setWishlistItems] = useState<ClothingItem[]>([]);
  const [loadingWardrobe, setLoadingWardrobe] = useState(false);
  const [loadingWishlist, setLoadingWishlist] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('home');

  // Weather & time
  const [weather, setWeather] = useState<WeatherData | null>(null);
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

  // Geolocation + weather
  useEffect(() => {
    async function fetchWeather(lat: number, lon: number) {
      try {
        // Reverse geocode for city name
        const geoRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=fr`);
        const geoData = await geoRes.json();
        const ville = geoData.city || geoData.locality || 'Paris';

        // Open-Meteo for weather
        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code`);
        const weatherData = await weatherRes.json();
        const current = weatherData.current;

        const weatherCode = current.weather_code || 0;
        let description = 'Ensoleillé';
        let icon = 'clear';
        if (weatherCode >= 95) { description = 'Orage'; icon = 'thunder'; }
        else if (weatherCode >= 80) { description = 'Averses'; icon = 'shower'; }
        else if (weatherCode >= 71) { description = 'Neige'; icon = 'snow'; }
        else if (weatherCode >= 61) { description = 'Pluie'; icon = 'rain'; }
        else if (weatherCode >= 51) { description = 'Bruine'; icon = 'drizzle'; }
        else if (weatherCode >= 45) { description = 'Brouillard'; icon = 'cloud'; }
        else if (weatherCode >= 3) { description = 'Nuageux'; icon = 'cloud'; }
        else if (weatherCode >= 1) { description = 'Partiellement nuageux'; icon = 'cloud'; }

        setWeather({
          temperature: Math.round(current.temperature_2m),
          description,
          ville,
          icon,
          humidity: current.relative_humidity_2m,
          wind_speed: Math.round(current.wind_speed_10m),
        });
      } catch (err) {
        console.error('Weather fetch failed:', err);
        setWeather({ temperature: 15, description: 'Indisponible', ville: 'Paris', icon: 'cloud' });
      }
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
        () => fetchWeather(48.8566, 2.3522) // Fallback to Paris
      );
    } else {
      fetchWeather(48.8566, 2.3522);
    }
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

  const gradientColors = ['from-purple-600 to-blue-600', 'from-orange-500 to-rose-600', 'from-emerald-600 to-teal-600'];

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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ===== TAB NAVIGATION ===== */}
        <div className="flex bg-white/5 rounded-2xl p-1.5 max-w-xl mt-6 mb-8 border border-white/5">
          {([
            { key: 'home' as TabType, icon: Sparkles, label: 'Accueil' },
            { key: 'wardrobe' as TabType, icon: Shirt, label: 'Garde-Robe', count: wardrobeItems.length },
            { key: 'wishlist' as TabType, icon: Sparkles, label: 'Inspirations', count: wishlistItems.length },
          ]).map(({ key, icon: Icon, label, count }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-bold transition-all ${activeTab === key
                ? 'bg-white text-gray-900 shadow-lg'
                : 'text-gray-500 hover:text-white'
                }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
              {count !== undefined && count > 0 && (
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${activeTab === key ? 'bg-gray-900 text-white' : 'bg-white/10 text-gray-400'
                  }`}>{count}</span>
              )}
            </button>
          ))}
        </div>

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
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white">Suggestions du jour</h3>
                  <p className="text-sm text-gray-500">Basées sur votre profil et la météo actuelle</p>
                </div>
                <button
                  onClick={fetchSuggestions}
                  disabled={loadingSuggestions}
                  className="flex items-center gap-2 text-sm bg-white/5 border border-white/10 px-4 py-2 rounded-full text-gray-300 hover:bg-white/10 hover:text-white transition-all disabled:opacity-50"
                >
                  {loadingSuggestions ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  Nouvelles suggestions
                </button>
              </div>

              {loadingSuggestions && suggestions.length === 0 ? (
                <div className="text-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-400 mx-auto mb-4" />
                  <p className="text-gray-500">Votre styliste IA prépare vos suggestions...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {suggestions.map((sug, idx) => (
                    <div
                      key={idx}
                      className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all group"
                    >
                      {/* Gradient header */}
                      <div className={`bg-gradient-to-r ${gradientColors[idx % 3]} p-5`}>
                        <p className="text-xs font-bold uppercase tracking-wider text-white/70 mb-1">{sug.occasion}</p>
                        <h4 className="text-lg font-black text-white">{sug.titre}</h4>
                      </div>

                      <div className="p-5 space-y-4">
                        <p className="text-sm text-gray-400 leading-relaxed">{sug.description}</p>

                        {/* Pieces */}
                        <div className="space-y-2">
                          {sug.pieces?.map((piece, pidx) => {
                            const prixNum = typeof piece.prix === 'number' ? piece.prix : parseFloat(String(piece.prix)) || 0;
                            const searchTerms = piece.lien_recherche || `${piece.type} ${piece.marque}`;
                            return (
                              <div key={pidx} className="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2.5">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-white truncate">{piece.type}</p>
                                  <p className="text-xs text-gray-500">{piece.marque}</p>
                                </div>
                                <span className="text-sm font-bold text-white mx-3 flex-shrink-0">{prixNum.toFixed(2)}€</span>
                                <a
                                  href={buildShopUrl(searchTerms)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={() => handleProductClick(piece)}
                                  className="p-1.5 bg-white/10 rounded-lg hover:bg-white/20 transition-colors flex-shrink-0"
                                >
                                  <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                                </a>
                              </div>
                            );
                          })}
                        </div>

                        {/* Calculated Total */}
                        {(() => {
                          const total = (sug.pieces || []).reduce((sum, p) => {
                            const n = typeof p.prix === 'number' ? p.prix : parseFloat(String(p.prix)) || 0;
                            return sum + n;
                          }, 0);
                          return (
                            <div className="flex items-center justify-between pt-3 border-t border-white/5">
                              <span className="text-xs text-gray-500">Total du look</span>
                              <span className="text-lg font-black text-white">{total.toFixed(2)}€</span>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== WARDROBE / WISHLIST TABS ===== */}
        {(activeTab === 'wardrobe' || activeTab === 'wishlist') && (
          <div className="space-y-8">
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
        )}
      </div>

      {/* Chatbot */}
      <ChatBot userId={user.id} userName={user.prenom} />
    </main>
  );
}
