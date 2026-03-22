'use client';

import { Cloud, Sun, CloudRain, CloudSnow, CloudLightning, CloudDrizzle, Wind, MapPin, Droplets, Thermometer, Shirt, ArrowRight, Sparkles } from 'lucide-react';
import ErrorBoundary from '@/components/ErrorBoundary';
import SuggestionsSection from '@/components/SuggestionsSection';
import WeatherAnimation from '@/components/WeatherAnimation';
import type { WeatherData, Suggestion, SuggestionPiece, User, DayForecast } from '@/lib/types';

function WeatherIcon({ code, size = 'md' }: { code: string; size?: 'sm' | 'md' }) {
  const cls = size === 'sm' ? 'w-4 h-4' : 'w-8 h-8';
  if (code.includes('thunder')) return <CloudLightning className={`${cls} text-yellow-400`} />;
  if (code.includes('rain') || code.includes('shower')) return <CloudRain className={`${cls} text-blue-400`} />;
  if (code.includes('drizzle')) return <CloudDrizzle className={`${cls} text-blue-300`} />;
  if (code.includes('snow')) return <CloudSnow className={`${cls} text-blue-200`} />;
  if (code.includes('cloud') || code.includes('overcast')) return <Cloud className={`${cls} text-gray-400`} />;
  if (code.includes('wind')) return <Wind className={`${cls} text-gray-400`} />;
  return <Sun className={`${cls} text-yellow-400`} />;
}

function UvBadge({ uv }: { uv: number }) {
  const level = uv <= 2 ? { label: 'Faible', color: 'text-green-400 bg-green-500/15' }
    : uv <= 5 ? { label: 'Modéré', color: 'text-yellow-400 bg-yellow-500/15' }
    : uv <= 7 ? { label: 'Élevé', color: 'text-orange-400 bg-orange-500/15' }
    : { label: 'Très élevé', color: 'text-red-400 bg-red-500/15' };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${level.color}`}>
      UV {uv} · {level.label}
    </span>
  );
}

function ComfortBadge({ index }: { index: number }) {
  const label = index >= 8 ? 'Idéal' : index >= 6 ? 'Agréable' : index >= 4 ? 'Correct' : 'Difficile';
  const color = index >= 8 ? 'text-emerald-400' : index >= 6 ? 'text-blue-400' : index >= 4 ? 'text-yellow-400' : 'text-red-400';
  return (
    <span className={`text-xs font-medium ${color}`}>
      <Thermometer className="w-3 h-3 inline mr-0.5" />
      {label}
    </span>
  );
}

function ForecastStrip({ forecast }: { forecast: DayForecast[] }) {
  const days = forecast.slice(0, 5);
  const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  return (
    <div className="grid grid-cols-5 gap-1 mt-4 pt-4 border-t border-white/10">
      {days.map((day, i) => {
        const d = new Date(day.date + 'T12:00:00');
        return (
          <div key={day.date} className="flex flex-col items-center gap-1 text-center">
            <span className="text-[10px] text-gray-500 font-medium uppercase">
              {i === 0 ? 'Auj.' : dayNames[d.getDay()]}
            </span>
            <WeatherIcon code={day.icon} size="sm" />
            <span className="text-xs font-bold text-white">{day.temp_max}°</span>
            <span className="text-[10px] text-gray-600">{day.temp_min}°</span>
            {day.precipitation_probability > 20 && (
              <span className="text-[9px] text-blue-400 flex items-center gap-0.5">
                <Droplets className="w-2.5 h-2.5" />{day.precipitation_probability}%
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AhaTeaserCard({ weather, onGoToWardrobe }: { weather: WeatherData | null; onGoToWardrobe: () => void }) {
  const temp = weather?.temperature ?? 20;
  const tip = temp >= 25
    ? { emoji: '☀️', conseil: 'Par cette chaleur, un t-shirt léger + short en lin, c\'est le combo parfait.' }
    : temp >= 15
    ? { emoji: '🌤️', conseil: 'Temps idéal pour une veste légère sur un t-shirt — confort garanti.' }
    : temp >= 5
    ? { emoji: '🧥', conseil: 'Il fait frais — pense à superposer : col roulé + manteau structuré.' }
    : { emoji: '❄️', conseil: 'Grand froid : doudoune technique + boots imperméables pour rester au chaud.' };

  return (
    <div className="bg-linear-to-br from-purple-600/15 via-pink-600/10 to-transparent border border-purple-500/20 rounded-3xl p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">Conseil du styliste</span>
        </div>
        <p className="text-lg font-bold text-white mb-1">{tip.emoji} Pour aujourd&apos;hui à {weather?.temperature ?? '—'}°C</p>
        <p className="text-sm text-gray-300 mb-5 leading-relaxed">{tip.conseil}</p>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-5">
          <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Exemple de tenue adaptée</p>
          <div className="flex flex-wrap gap-2">
            {(temp >= 25
              ? ['T-shirt col V', 'Short cargo', 'Sneakers légères']
              : temp >= 15
              ? ['T-shirt basique', 'Jean slim', 'Veste légère', 'Baskets']
              : temp >= 5
              ? ['Col roulé', 'Chino', 'Manteau long', 'Boots']
              : ['Doudoune', 'Pull épais', 'Jean renforcé', 'Boots imperméables']
            ).map(piece => (
              <span key={piece} className="flex items-center gap-1 text-xs bg-white/8 border border-white/10 rounded-full px-3 py-1 text-gray-300">
                <Shirt className="w-3 h-3 text-purple-400" />{piece}
              </span>
            ))}
          </div>
        </div>
        <button
          onClick={onGoToWardrobe}
          className="w-full flex items-center justify-center gap-2 bg-linear-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-bold rounded-2xl py-3.5 transition-all duration-200 active:scale-95"
        >
          <Shirt className="w-4 h-4" />
          Ajouter mon premier vêtement
          <ArrowRight className="w-4 h-4" />
        </button>
        <p className="text-center text-xs text-gray-600 mt-2">Ton styliste IA apprendra ton style ✨</p>
      </div>
    </div>
  );
}

export interface HomeTabProps {
  user: User;
  weather: WeatherData | null;
  greeting: string;
  dateStr: string;
  suggestions: Suggestion[];
  loadingSuggestions: boolean;
  suggestionLimitReached?: boolean;
  wardrobeCount?: number;
  onRefresh: () => void;
  onProductClick: (piece: SuggestionPiece) => void;
  onGoToWardrobe?: () => void;
}

export default function HomeTab({
  user, weather, greeting, dateStr, suggestions, loadingSuggestions, suggestionLimitReached,
  wardrobeCount = 0, onRefresh, onProductClick, onGoToWardrobe,
}: HomeTabProps) {
  const showAhaTeaser = wardrobeCount === 0 && suggestions.length === 0 && !loadingSuggestions;

  return (
    <div className="space-y-6 pt-6">
      {/* Weather + Greeting Hero */}
      <div className="bg-linear-to-br from-purple-600/20 via-blue-600/10 to-transparent border border-white/8 rounded-3xl p-6 md:p-8 backdrop-blur relative overflow-hidden min-h-[180px]">
        {weather && <WeatherAnimation weatherCode={weather.icon} />}
        <div className="absolute top-0 right-0 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl -mr-24 -mt-24" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/5 rounded-full blur-2xl -ml-12 -mb-12" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex-1">
            <p className="text-xs text-gray-500 mb-1.5 tracking-widest uppercase">{dateStr}</p>
            <h2 className="text-2xl md:text-3xl font-black text-white mb-3 leading-tight">
              {greeting || `Bonjour ${user.prenom} 👋`}
            </h2>
          </div>
          {weather && (
            <div className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 min-w-[200px]">
              <div className="flex items-center gap-4 mb-2">
                <WeatherIcon code={weather.icon} />
                <div>
                  <p className="text-3xl font-black text-white">{weather.temperature}°C</p>
                  <p className="text-sm text-gray-400">{weather.description}</p>
                </div>
              </div>

              {/* Location + stats row */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />{weather.ville}
                </span>
                {weather.wind_speed !== undefined && <span>💨 {weather.wind_speed} km/h</span>}
                {weather.humidity !== undefined && (
                  <span className="flex items-center gap-0.5">
                    <Droplets className="w-3 h-3" />{weather.humidity}%
                  </span>
                )}
              </div>

              {/* UV + comfort badges */}
              <div className="flex flex-wrap gap-2 mt-2">
                {weather.uv_index !== undefined && <UvBadge uv={weather.uv_index} />}
                {weather.comfort_index !== undefined && <ComfortBadge index={weather.comfort_index} />}
              </div>

              {/* 5-day forecast strip */}
              {weather.forecast && weather.forecast.length > 0 && (
                <ForecastStrip forecast={weather.forecast} />
              )}
            </div>
          )}
        </div>
      </div>

      {/* AHA Teaser — premier vêtement */}
      {showAhaTeaser && onGoToWardrobe && (
        <AhaTeaserCard weather={weather} onGoToWardrobe={onGoToWardrobe} />
      )}

      {/* Suggestions */}
      <ErrorBoundary label="Suggestions">
        <SuggestionsSection
          suggestions={suggestions}
          loading={loadingSuggestions}
          limitReached={suggestionLimitReached}
          onRefresh={onRefresh}
          onProductClick={onProductClick}
        />
      </ErrorBoundary>
    </div>
  );
}
