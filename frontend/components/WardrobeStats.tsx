'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Shirt, Star, Euro, RefreshCw } from 'lucide-react';
import { getWardrobeAnalytics } from '@/lib/api';

export interface WardrobeStatsProps {
  userId: number;
  itemCount: number; // triggers refresh when wardrobe changes
}

interface Analytics {
  total: number;
  colors: { name: string; count: number }[];
  styles: { name: string; count: number }[];
  seasons: { name: string; count: number }[];
  types: { name: string; count: number }[];
  avg_look_score: number | null;
  estimated_outfit_count: number;
  wardrobe_value_eur: { budget: number; moyen: number; premium: number };
}

export default function WardrobeStats({ userId, itemCount }: WardrobeStatsProps) {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (itemCount === 0) { setData(null); return; }
    setLoading(true);
    getWardrobeAnalytics(userId)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId, itemCount]);

  if (loading) return (
    <div className="flex items-center gap-2 text-gray-500 text-sm py-4">
      <RefreshCw className="w-4 h-4 animate-spin" /> Analyse de ta garde-robe…
    </div>
  );

  if (!data || data.total === 0) return null;

  return (
    <div className="space-y-4">
      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
          <Shirt className="w-4 h-4 text-purple-400 mx-auto mb-1" />
          <p className="text-2xl font-black">{data.total}</p>
          <p className="text-xs text-gray-500">pièces</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
          <Sparkles className="w-4 h-4 text-yellow-400 mx-auto mb-1" />
          <p className="text-2xl font-black">{data.estimated_outfit_count}</p>
          <p className="text-xs text-gray-500">tenues possibles</p>
        </div>
        {data.avg_look_score !== null && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
            <Star className="w-4 h-4 text-orange-400 mx-auto mb-1" />
            <p className="text-2xl font-black">{data.avg_look_score}<span className="text-sm text-gray-500">/5</span></p>
            <p className="text-xs text-gray-500">score moyen IA</p>
          </div>
        )}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
          <Euro className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
          <p className="text-2xl font-black">{data.wardrobe_value_eur.moyen}€</p>
          <p className="text-xs text-gray-500">valeur estimée</p>
        </div>
      </div>

      {/* Colors */}
      {data.colors.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Palette dominante</p>
          <div className="flex flex-wrap gap-2">
            {data.colors.slice(0, 6).map(c => (
              <div key={c.name} className="flex items-center gap-1.5 bg-white/5 rounded-full px-3 py-1">
                <span className="text-xs font-medium">{c.name}</span>
                <span className="text-[10px] text-gray-500">×{c.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Type breakdown */}
      {data.types.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Par type de vêtement</p>
          <div className="space-y-2">
            {data.types.slice(0, 5).map(t => {
              const pct = Math.round((t.count / data.total) * 100);
              return (
                <div key={t.name} className="flex items-center gap-3">
                  <span className="text-xs text-gray-300 w-28 truncate">{t.name}</span>
                  <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500/70 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-gray-500 w-6 text-right">{t.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
