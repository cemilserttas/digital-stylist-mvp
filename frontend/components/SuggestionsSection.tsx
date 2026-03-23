'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Sparkles, ShoppingBag, Share2, Check, Crown, Lock, Image, Shirt, Tag, Lightbulb } from 'lucide-react';
import type { Suggestion, SuggestionPiece } from '@/lib/types';
import { shareLookCard } from '@/lib/shareCard';

async function shareSuggestion(sug: Suggestion) {
  const pieceLines = (sug.pieces || []).map(p => `• ${p.type}`).join('\n');
  const text = `✨ Look "${sug.titre}" (${sug.occasion})\n${pieceLines}\n\nVia Digital Stylist — ton styliste IA personnel`;

  if (typeof navigator !== 'undefined' && navigator.share) {
    await navigator.share({ title: `Look : ${sug.titre}`, text });
  } else {
    await navigator.clipboard.writeText(text);
  }
}

export interface SuggestionsSectionProps {
    suggestions: Suggestion[];
    loading: boolean;
    onRefresh: () => void;
    onProductClick: (piece: SuggestionPiece) => void;
    onGoToShop?: () => void;
    limitReached?: boolean;
}

const GRADIENT_COLORS = [
    'from-purple-600 to-blue-600',
    'from-orange-500 to-rose-600',
    'from-emerald-600 to-teal-600',
];

const SOURCE_CONFIG = {
    wardrobe: { label: 'Dans ta garde-robe', icon: Shirt, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    marketplace: { label: 'Dispo sur le shop', icon: Tag, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
    suggestion: { label: 'Recommandé', icon: Lightbulb, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
};

export default function SuggestionsSection({
    suggestions,
    loading,
    onRefresh,
    onProductClick,
    onGoToShop,
    limitReached = false,
}: SuggestionsSectionProps) {
    const [sharedIdx, setSharedIdx] = useState<number | null>(null);
    const [cardGeneratingIdx, setCardGeneratingIdx] = useState<number | null>(null);

    const handleShare = async (sug: Suggestion, idx: number) => {
        try {
            await shareSuggestion(sug);
            setSharedIdx(idx);
            setTimeout(() => setSharedIdx(null), 2000);
        } catch { /* user cancelled share or clipboard denied */ }
    };

    const handleShareCard = async (sug: Suggestion, idx: number) => {
        setCardGeneratingIdx(idx);
        try {
            await shareLookCard(sug);
        } catch { /* user cancelled or Canvas unavailable */ }
        finally { setCardGeneratingIdx(null); }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-xl font-bold text-white">Suggestions du jour</h3>
                    <p className="text-sm text-gray-500">Composées depuis ta garde-robe et le shop</p>
                </div>
                <button
                    onClick={onRefresh}
                    disabled={loading || limitReached}
                    className="flex items-center gap-2 text-sm bg-white/5 border border-white/10 px-4 py-2 rounded-full text-gray-300 hover:bg-white/10 hover:text-white transition-all disabled:opacity-50"
                >
                    {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Sparkles className="w-4 h-4" />
                    )}
                    Nouvelles suggestions
                </button>
            </div>

            {/* Premium upgrade banner when daily limit is reached */}
            {limitReached && (
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 bg-linear-to-r from-amber-500/15 to-orange-500/15 border border-amber-500/30 rounded-2xl p-5 flex items-start gap-4"
                >
                    <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                        <Crown className="w-5 h-5 text-amber-400" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-bold text-amber-300 mb-1">Limite quotidienne atteinte</p>
                        <p className="text-xs text-gray-400 leading-relaxed">
                            En version gratuite, vous avez droit à <strong className="text-white">1 suggestion par jour</strong>.
                            Passez à Premium pour des suggestions illimitées, le chat sans limite et bien plus.
                        </p>
                    </div>
                    <div className="flex items-center gap-1.5 bg-amber-500/20 border border-amber-500/30 rounded-full px-3 py-1.5 shrink-0">
                        <Lock className="w-3 h-3 text-amber-400" />
                        <span className="text-[11px] font-bold text-amber-300">Premium</span>
                    </div>
                </motion.div>
            )}

            {loading && suggestions.length === 0 ? (
                <div className="text-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-400 mx-auto mb-4" />
                    <p className="text-gray-500">Votre styliste IA analyse votre garde-robe...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {suggestions.map((sug, idx) => (
                        <div
                            key={idx}
                            className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all group"
                        >
                            <div className={`bg-linear-to-r ${GRADIENT_COLORS[idx % 3]} p-5`}>
                                <p className="text-xs font-bold uppercase tracking-wider text-white/70 mb-1">{sug.occasion}</p>
                                <h4 className="text-lg font-black text-white">{sug.titre}</h4>
                            </div>

                            <div className="p-5 space-y-4">
                                <p className="text-sm text-gray-400 leading-relaxed">{sug.description}</p>

                                <div className="space-y-2">
                                    {sug.pieces?.map((piece, pidx) => {
                                        const source = piece.source || 'suggestion';
                                        const config = SOURCE_CONFIG[source] || SOURCE_CONFIG.suggestion;
                                        const SourceIcon = config.icon;
                                        const price = piece.prix ?? piece.prix_estime;

                                        return (
                                            <div key={pidx} className={`rounded-xl px-3 py-2.5 border ${config.bg}`}>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex-1 min-w-0 pr-2">
                                                        <p className="text-sm font-bold text-white truncate">{piece.type}</p>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <SourceIcon className={`w-3 h-3 ${config.color}`} />
                                                            <span className={`text-[10px] font-medium ${config.color}`}>
                                                                {config.label}
                                                            </span>
                                                            {piece.marque && (
                                                                <span className="text-[10px] text-gray-500">· {piece.marque}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                                                        {price != null && price > 0 && (
                                                            <span className="text-sm font-black text-transparent bg-clip-text bg-linear-to-r from-purple-400 to-pink-400">
                                                                {price.toFixed(2)}€
                                                            </span>
                                                        )}
                                                        {source === 'marketplace' && (
                                                            <motion.button
                                                                whileHover={{ scale: 1.05 }}
                                                                whileTap={{ scale: 0.95 }}
                                                                onClick={() => onProductClick(piece)}
                                                                className="flex items-center gap-1.5 bg-linear-to-r from-purple-600 to-blue-600 rounded-lg px-3 py-1.5 shadow-lg shadow-purple-500/25"
                                                            >
                                                                <ShoppingBag className="w-3.5 h-3.5 text-white" />
                                                                <span className="text-[10px] font-bold text-white uppercase tracking-wider">Voir</span>
                                                            </motion.button>
                                                        )}
                                                        {source === 'suggestion' && piece.conseil && (
                                                            <p className="text-[10px] text-amber-400/80 max-w-[140px] text-right leading-tight">
                                                                {piece.conseil}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {(() => {
                                    const marketplaceCount = (sug.pieces || []).filter(p => p.source === 'marketplace').length;
                                    const shared = sharedIdx === idx;
                                    const generatingCard = cardGeneratingIdx === idx;
                                    return (
                                        <div className="flex items-center justify-between pt-3 border-t border-white/5">
                                            <div className="flex items-center gap-3">
                                                {marketplaceCount > 0 && onGoToShop && (
                                                    <button
                                                        onClick={onGoToShop}
                                                        className="text-[10px] text-purple-400 font-bold hover:text-purple-300 transition-colors"
                                                    >
                                                        {marketplaceCount} article{marketplaceCount > 1 ? 's' : ''} dispo sur le shop
                                                    </button>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {/* Image card share */}
                                                <button
                                                    onClick={() => handleShareCard(sug, idx)}
                                                    disabled={generatingCard}
                                                    title="Partager en image Story"
                                                    className="p-1.5 rounded-lg transition-all bg-white/5 text-gray-400 hover:bg-purple-500/20 hover:text-purple-300 disabled:opacity-50"
                                                >
                                                    {generatingCard
                                                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                        : <Image className="w-3.5 h-3.5" />}
                                                </button>
                                                {/* Text share */}
                                                <button
                                                    onClick={() => handleShare(sug, idx)}
                                                    title={shared ? 'Copié !' : 'Partager (texte)'}
                                                    className={`p-1.5 rounded-lg transition-all ${shared ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}
                                                >
                                                    {shared ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
