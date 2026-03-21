'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarDays, Plus, Trash2, X, Check, Shirt, Cloud, Sun, CloudRain, CloudSnow, CloudLightning, Droplets } from 'lucide-react';
import { getOutfitPlans, saveOutfitPlan, deleteOutfitPlan, getImageUrl } from '@/lib/api';
import type { OutfitPlan, ClothingItem, DayForecast } from '@/lib/types';

export interface OutfitCalendarProps {
  userId: number;
  wardrobeItems: ClothingItem[];
  forecast?: DayForecast[];
}

function WeatherMini({ forecast }: { forecast: DayForecast }) {
  const icon = (() => {
    const c = forecast.icon;
    if (c.includes('thunder')) return <CloudLightning className="w-3 h-3 text-yellow-400" />;
    if (c.includes('rain') || c.includes('shower')) return <CloudRain className="w-3 h-3 text-blue-400" />;
    if (c.includes('snow')) return <CloudSnow className="w-3 h-3 text-blue-200" />;
    if (c.includes('cloud')) return <Cloud className="w-3 h-3 text-gray-400" />;
    return <Sun className="w-3 h-3 text-yellow-400" />;
  })();

  return (
    <div className="flex items-center gap-1 text-[9px] text-gray-500 mt-0.5">
      {icon}
      <span className="font-bold text-white">{forecast.temp_max}°</span>
      <span>{forecast.temp_min}°</span>
      {forecast.precipitation_probability > 20 && (
        <span className="text-blue-400 flex items-center gap-0.5">
          <Droplets className="w-2 h-2" />{forecast.precipitation_probability}%
        </span>
      )}
    </div>
  );
}

function WeatherDetail({ forecast }: { forecast: DayForecast }) {
  const uvColor = forecast.uv_index <= 2 ? 'text-green-400'
    : forecast.uv_index <= 5 ? 'text-yellow-400'
    : forecast.uv_index <= 7 ? 'text-orange-400'
    : 'text-red-400';

  const rainWarning = forecast.precipitation_probability >= 60;
  const coldWarning = forecast.temp_max <= 8;
  const hotWarning = forecast.temp_max >= 28;

  return (
    <div className="mb-5 bg-white/5 border border-white/10 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-sm font-bold text-white">{forecast.temp_max}° / {forecast.temp_min}°</p>
          <p className="text-xs text-gray-400">{forecast.description}</p>
        </div>
        <div className="text-right text-xs space-y-1">
          <p className={uvColor}>UV {forecast.uv_index}</p>
          {forecast.precipitation_probability > 0 && (
            <p className="text-blue-400 flex items-center gap-1 justify-end">
              <Droplets className="w-3 h-3" />{forecast.precipitation_probability}%
            </p>
          )}
        </div>
      </div>
      {(rainWarning || coldWarning || hotWarning) && (
        <div className="flex flex-wrap gap-1 mt-2">
          {rainWarning && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300">☔ Prévoir un imperméable</span>}
          {coldWarning && <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300">🧥 Tenue chaude recommandée</span>}
          {hotWarning && <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-300">🕶️ Tenue légère conseillée</span>}
        </div>
      )}
    </div>
  );
}

function getWeekDays(): { date: string; label: string; short: string }[] {
  const days = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const iso = d.toISOString().split('T')[0];
    const label = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' });
    const short = i === 0 ? "Aujourd'hui" : d.toLocaleDateString('fr-FR', { weekday: 'short' });
    days.push({ date: iso, label, short });
  }
  return days;
}

const OCCASIONS = ['Travail', 'Casual', 'Sport', 'Soirée', 'RDV', 'Voyage'];

export default function OutfitCalendar({ userId, wardrobeItems, forecast }: OutfitCalendarProps) {
  const [plans, setPlans] = useState<OutfitPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [occasion, setOccasion] = useState('');
  const [saving, setSaving] = useState(false);

  const week = getWeekDays();

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getOutfitPlans(userId, week[0].date, week[6].date);
      setPlans(data.plans || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  const planForDay = (date: string) => plans.find(p => p.date === date);
  const forecastForDay = (date: string) => forecast?.find(f => f.date === date);

  const openDay = (date: string) => {
    const existing = planForDay(date);
    setSelectedItems(existing?.item_ids ?? []);
    setOccasion(existing?.occasion ?? '');
    setSelectedDay(date);
  };

  const toggleItem = (id: number) =>
    setSelectedItems(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleSave = async () => {
    if (!selectedDay) return;
    setSaving(true);
    try {
      await saveOutfitPlan(userId, { date: selectedDay, item_ids: selectedItems, occasion: occasion || undefined });
      await fetchPlans();
      setSelectedDay(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (date: string) => {
    const plan = planForDay(date);
    if (!plan) return;
    try {
      await deleteOutfitPlan(plan.id);
      setPlans(prev => prev.filter(p => p.date !== date));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-6">
        <CalendarDays className="w-5 h-5 text-purple-400" />
        <h2 className="text-xl font-bold text-white">Planning Tenues</h2>
        <span className="text-xs text-gray-500 ml-1">— 7 prochains jours</span>
      </div>

      {loading ? (
        <div className="grid grid-cols-7 gap-2">
          {week.map(d => (
            <div key={d.date} className="h-32 bg-white/5 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {week.map(({ date, label, short }) => {
            const plan = planForDay(date);
            const dayForecast = forecastForDay(date);
            const items = wardrobeItems.filter(i => plan?.item_ids.includes(i.id));
            const isToday = date === week[0].date;

            return (
              <motion.div
                key={date}
                whileHover={{ scale: 1.03 }}
                className={`relative rounded-2xl border p-3 cursor-pointer transition-colors min-h-[130px] flex flex-col gap-2 ${
                  isToday
                    ? 'border-purple-500/60 bg-purple-500/10'
                    : plan
                    ? 'border-white/20 bg-white/5'
                    : 'border-dashed border-white/10 bg-white/2 hover:bg-white/5'
                }`}
                onClick={() => openDay(date)}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${isToday ? 'text-purple-400' : 'text-gray-500'}`}>
                      {short}
                    </p>
                    <p className="text-[9px] text-gray-600 mt-0.5 capitalize">
                      {new Date(date + 'T12:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </p>
                    {dayForecast && <WeatherMini forecast={dayForecast} />}
                  </div>
                  {plan && (
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(date); }}
                      className="text-gray-600 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {plan && items.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {items.slice(0, 3).map(item => (
                      <img
                        key={item.id}
                        src={getImageUrl(item.image_path)}
                        alt={item.type}
                        className="w-8 h-8 rounded-lg object-cover ring-1 ring-white/10"
                      />
                    ))}
                    {items.length > 3 && (
                      <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-[9px] text-gray-400 font-bold">
                        +{items.length - 3}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <Plus className="w-5 h-5 text-gray-700" />
                  </div>
                )}

                {plan?.occasion && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 self-start">
                    {plan.occasion}
                  </span>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Day editor modal */}
      <AnimatePresence>
        {selectedDay && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
            onClick={() => setSelectedDay(null)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              className="bg-gray-900 border border-white/10 rounded-3xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-white capitalize">
                  {new Date(selectedDay + 'T12:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h3>
                <button onClick={() => setSelectedDay(null)} className="text-gray-500 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Weather context for the selected day */}
              {forecastForDay(selectedDay) && (
                <WeatherDetail forecast={forecastForDay(selectedDay)!} />
              )}

              {/* Occasion picker */}
              <div className="flex flex-wrap gap-2 mb-5">
                {OCCASIONS.map(occ => (
                  <button
                    key={occ}
                    onClick={() => setOccasion(prev => prev === occ ? '' : occ)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                      occasion === occ ? 'bg-purple-500 text-white' : 'bg-white/10 text-gray-400 hover:bg-white/20'
                    }`}
                  >
                    {occ}
                  </button>
                ))}
              </div>

              {/* Wardrobe item picker */}
              <p className="text-xs text-gray-500 mb-3">Sélectionne les pièces de ta tenue :</p>
              {wardrobeItems.length === 0 ? (
                <div className="text-center py-8 text-gray-600">
                  <Shirt className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Ajoute d&apos;abord des vêtements à ta garde-robe</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2 mb-5">
                  {wardrobeItems.map(item => {
                    const isSelected = selectedItems.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        onClick={() => toggleItem(item.id)}
                        className={`relative rounded-xl overflow-hidden ring-2 transition-all ${
                          isSelected ? 'ring-purple-500 scale-95' : 'ring-transparent hover:ring-white/30'
                        }`}
                      >
                        <img
                          src={getImageUrl(item.image_path)}
                          alt={item.type}
                          className="w-full aspect-square object-cover"
                        />
                        {isSelected && (
                          <div className="absolute inset-0 bg-purple-500/30 flex items-center justify-center">
                            <Check className="w-5 h-5 text-white drop-shadow" />
                          </div>
                        )}
                        <p className="absolute bottom-0 left-0 right-0 text-[8px] text-white bg-black/60 px-1 py-0.5 truncate">
                          {item.type}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}

              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-colors disabled:opacity-50"
              >
                {saving ? 'Enregistrement...' : `Enregistrer (${selectedItems.length} pièce${selectedItems.length > 1 ? 's' : ''})`}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
