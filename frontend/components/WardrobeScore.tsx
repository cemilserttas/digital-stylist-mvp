'use client';

import { useState } from 'react';
import { Sparkles, Star, TrendingUp, AlertCircle, ShoppingBag, RefreshCw, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { getWardrobeScore } from '@/lib/api';
import { buildShopUrl } from '@/lib/utils';

export interface WardrobeScoreProps {
  userId: number;
  itemCount: number;
}

interface ScoreData {
  score: number | null;
  style_dna: string;
  resume: string;
  forces: string[];
  axes_amelioration: string[];
  capsule_manquante: { type: string; pourquoi: string; marque: string; prix_estime: string; recherche: string }[];
  top_combos: { titre: string; pieces: string[]; conseil: string }[];
}

export default function WardrobeScore({ userId, itemCount }: WardrobeScoreProps) {
  const [data, setData] = useState<ScoreData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);

  const handleAnalyse = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getWardrobeScore(userId);
      setData(result);
      setExpanded(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg || 'Analyse impossible. Réessayez dans un instant.');
    } finally {
      setLoading(false);
    }
  };

  const scoreColor = (s: number) =>
    s >= 4 ? 'text-emerald-400' : s >= 3 ? 'text-yellow-400' : 'text-orange-400';

  const scoreBg = (s: number) =>
    s >= 4 ? 'bg-emerald-500/10 border-emerald-500/20' : s >= 3 ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-orange-500/10 border-orange-500/20';

  if (itemCount < 3) return null;

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
      {/* Header / trigger */}
      <button
        onClick={data ? () => setExpanded(v => !v) : handleAnalyse}
        disabled={loading}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-left">
            <p className="font-bold text-sm">Bilan IA de ma garde-robe</p>
            <p className="text-xs text-gray-500">
              {data ? `Score : ${data.score}/5 — ${data.style_dna}` : 'Analyse complète par l\'IA'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {loading && <RefreshCw className="w-4 h-4 text-gray-400 animate-spin" />}
          {!data && !loading && (
            <span className="text-xs bg-purple-500/20 text-purple-300 font-bold px-2.5 py-1 rounded-full">
              Analyser
            </span>
          )}
          {data && (expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />)}
        </div>
      </button>

      {error && (
        <div className="px-5 pb-4 flex items-center gap-2 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {data && expanded && (
        <div className="border-t border-white/5 px-5 pb-5 space-y-5 pt-4">
          {/* Score badge + résumé */}
          <div className={`flex items-center gap-4 rounded-xl p-4 border ${scoreBg(data.score ?? 0)}`}>
            <div className="text-center shrink-0">
              <p className={`text-4xl font-black ${scoreColor(data.score ?? 0)}`}>{data.score}</p>
              <p className="text-[10px] text-gray-500 -mt-1">/ 5</p>
            </div>
            <div>
              <p className="font-bold text-sm">{data.style_dna}</p>
              <p className="text-xs text-gray-400 mt-1">{data.resume}</p>
            </div>
          </div>

          {/* Forces & axes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.forces.length > 0 && (
              <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2 flex items-center gap-1.5">
                  <Star className="w-3 h-3" /> Forces
                </p>
                <ul className="space-y-1.5">
                  {data.forces.map((f, i) => (
                    <li key={i} className="text-xs text-gray-300 flex items-start gap-1.5">
                      <span className="text-emerald-400 shrink-0 mt-0.5">✓</span> {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {data.axes_amelioration.length > 0 && (
              <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-2 flex items-center gap-1.5">
                  <TrendingUp className="w-3 h-3" /> À améliorer
                </p>
                <ul className="space-y-1.5">
                  {data.axes_amelioration.map((a, i) => (
                    <li key={i} className="text-xs text-gray-300 flex items-start gap-1.5">
                      <span className="text-amber-400 shrink-0 mt-0.5">→</span> {a}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Capsule manquante */}
          {data.capsule_manquante.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1.5">
                <ShoppingBag className="w-3 h-3" /> Pièces capsule à ajouter
              </p>
              <div className="space-y-2">
                {data.capsule_manquante.map((piece, i) => (
                  <div key={i} className="flex items-start justify-between gap-3 bg-white/5 rounded-xl p-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">{piece.type}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{piece.pourquoi}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{piece.marque} · {piece.prix_estime}</p>
                    </div>
                    <a
                      href={buildShopUrl(piece.recherche)}
                      target="_blank" rel="noopener noreferrer"
                      className="shrink-0 p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                      title="Trouver cette pièce"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-gray-300" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top combos */}
          {data.top_combos.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Tenues avec tes pièces</p>
              <div className="space-y-2">
                {data.top_combos.map((combo, i) => (
                  <div key={i} className="bg-white/5 rounded-xl p-3">
                    <p className="text-sm font-semibold mb-1">{combo.titre}</p>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {combo.pieces.map((p, j) => (
                        <span key={j} className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">{p}</span>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 italic">{combo.conseil}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleAnalyse}
            disabled={loading}
            className="w-full text-xs text-gray-500 hover:text-gray-300 transition-colors flex items-center justify-center gap-1.5 pt-1"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            Relancer l&apos;analyse
          </button>
        </div>
      )}
    </div>
  );
}
