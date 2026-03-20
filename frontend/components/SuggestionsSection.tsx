'use client';

import { motion } from 'framer-motion';
import { Loader2, Sparkles, ShoppingBag } from 'lucide-react';
import type { Suggestion, SuggestionPiece } from '@/lib/types';
import { buildShopUrl } from '@/lib/utils';

export interface SuggestionsSectionProps {
    suggestions: Suggestion[];
    loading: boolean;
    onRefresh: () => void;
    onProductClick: (piece: SuggestionPiece) => void;
}

const GRADIENT_COLORS = [
    'from-purple-600 to-blue-600',
    'from-orange-500 to-rose-600',
    'from-emerald-600 to-teal-600',
];

export default function SuggestionsSection({
    suggestions,
    loading,
    onRefresh,
    onProductClick,
}: SuggestionsSectionProps) {
    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-xl font-bold text-white">Suggestions du jour</h3>
                    <p className="text-sm text-gray-500">Basées sur votre profil et la météo actuelle</p>
                </div>
                <button
                    onClick={onRefresh}
                    disabled={loading}
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

            {loading && suggestions.length === 0 ? (
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
                            <div className={`bg-gradient-to-r ${GRADIENT_COLORS[idx % 3]} p-5`}>
                                <p className="text-xs font-bold uppercase tracking-wider text-white/70 mb-1">{sug.occasion}</p>
                                <h4 className="text-lg font-black text-white">{sug.titre}</h4>
                            </div>

                            <div className="p-5 space-y-4">
                                <p className="text-sm text-gray-400 leading-relaxed">{sug.description}</p>

                                <div className="space-y-2">
                                    {sug.pieces?.map((piece, pidx) => {
                                        const prixNum = typeof piece.prix === 'number' ? piece.prix : parseFloat(String(piece.prix)) || 0;
                                        const searchTerms = piece.lien_recherche || `${piece.type} ${piece.marque}`;
                                        return (
                                            <div key={pidx} className="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2.5">
                                                <div className="flex-1 min-w-0 pr-2">
                                                    <p className="text-sm font-bold text-white truncate">{piece.type}</p>
                                                    <p className="text-xs text-gray-400 font-medium">{piece.marque}</p>
                                                </div>
                                                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                                                    <span className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                                                        {prixNum.toFixed(2)}€
                                                    </span>
                                                    <motion.a
                                                        whileHover={{ scale: 1.05 }}
                                                        whileTap={{ scale: 0.95 }}
                                                        href={buildShopUrl(searchTerms)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={() => onProductClick(piece)}
                                                        className="flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg px-3 py-1.5 shadow-lg shadow-purple-500/25"
                                                    >
                                                        <ShoppingBag className="w-3.5 h-3.5 text-white" />
                                                        <span className="text-[10px] font-bold text-white uppercase tracking-wider">Acheter</span>
                                                    </motion.a>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

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
    );
}
