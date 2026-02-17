'use client';

import { useState } from 'react';
import { X, Shirt, Palette, Sun, Scissors, User, Sparkles, Lightbulb, ExternalLink, ShoppingBag, Star, AlertTriangle, CheckCircle, DollarSign } from 'lucide-react';
import { getImageUrl } from '../lib/api';

interface ClothingItem {
    id: number;
    type: string;
    couleur: string;
    saison: string;
    tags_ia: string;
    image_path: string;
}

interface ProductRecommendation {
    nom: string;
    marque: string;
    prix_estime: string;
    recherche: string;
}

interface MissingPiece {
    nom: string;
    marque: string;
    prix_estime: string;
    raison: string;
    recherche: string;
}

interface PriceTier {
    min: number;
    max: number;
    marques: string;
}

interface PrixTotalLook {
    budget: PriceTier;
    moyen: PriceTier;
    premium: PriceTier;
}

interface LookEvaluation {
    note: number;
    commentaire: string;
    points_forts: string;
    prix_total_look?: PrixTotalLook;
    pieces_manquantes: MissingPiece[];
}

interface DetectedItem {
    type?: string;
    genre?: string;
    textile?: string;
    couleur_dominante?: string;
    style?: string;
    saison?: string;
    coupe?: string;
    description?: string;
    conseils_combinaison?: string;
    produits_recommandes?: ProductRecommendation[];
}

interface ClothingDetailProps {
    item: ClothingItem;
    onClose: () => void;
}

function buildShopUrl(searchTerms: string): string {
    return `https://www.google.com/search?btnI=1&q=${encodeURIComponent(searchTerms + ' acheter')}`;
}

function buildAmazonUrl(searchTerms: string): string {
    return `https://www.amazon.fr/s?k=${encodeURIComponent(searchTerms)}`;
}

function buildASOSUrl(searchTerms: string): string {
    return `https://www.asos.com/fr/search/?q=${encodeURIComponent(searchTerms)}`;
}

function StarRating({ note }: { note: number }) {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
        stars.push(
            <Star
                key={i}
                className={`w-5 h-5 ${i <= note ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
            />
        );
    }
    return <div className="flex gap-0.5">{stars}</div>;
}

function getNoteColor(note: number): string {
    if (note >= 5) return 'from-green-500 to-emerald-600';
    if (note >= 4) return 'from-lime-500 to-green-600';
    if (note >= 3) return 'from-yellow-500 to-amber-600';
    if (note >= 2) return 'from-orange-500 to-red-500';
    return 'from-red-500 to-red-700';
}

function getNoteLabel(note: number): string {
    if (note >= 5) return 'Look Parfait';
    if (note >= 4) return 'Très Bon Look';
    if (note >= 3) return 'Bon Look';
    if (note >= 2) return 'À Améliorer';
    return 'À Revoir';
}

export default function ClothingDetail({ item, onClose }: ClothingDetailProps) {
    const [activeTab, setActiveTab] = useState(0);

    // Parse tags_ia to get all detected items + evaluation
    let detectedItems: DetectedItem[] = [];
    let evaluation: LookEvaluation = { note: 0, commentaire: '', points_forts: '', prix_total_look: undefined, pieces_manquantes: [] };

    try {
        const parsed = JSON.parse(item.tags_ia);
        if (parsed.items && Array.isArray(parsed.items)) {
            detectedItems = parsed.items;
        } else if (typeof parsed === 'object' && !parsed.evaluation) {
            detectedItems = [parsed];
        }
        if (parsed.evaluation) {
            evaluation = parsed.evaluation;
        }
    } catch {
        detectedItems = [{
            type: item.type,
            couleur_dominante: item.couleur,
            saison: item.saison,
        }];
    }

    const currentItem = detectedItems[activeTab] || detectedItems[0] || {};
    const hasMultipleItems = detectedItems.length > 1;
    const hasEvaluation = evaluation.note > 0;
    const hasMissingPieces = evaluation.pieces_manquantes && evaluation.pieces_manquantes.length > 0;
    const hasPricing = evaluation.prix_total_look && evaluation.prix_total_look.budget;

    const infoItems = [
        { icon: Shirt, label: 'Type', value: currentItem.type || item.type },
        { icon: User, label: 'Genre', value: currentItem.genre || 'Unisexe' },
        { icon: Sparkles, label: 'Textile', value: currentItem.textile || '—' },
        { icon: Palette, label: 'Couleur', value: currentItem.couleur_dominante || item.couleur },
        { icon: Sun, label: 'Saison', value: currentItem.saison || item.saison },
        { icon: Scissors, label: 'Coupe', value: currentItem.coupe || 'Regular' },
    ];

    const style = currentItem.style || 'Casual';
    const description = currentItem.description || '';
    const conseils = currentItem.conseils_combinaison || '';
    const products = currentItem.produits_recommandes || [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            <div
                className="relative bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
                style={{ animation: 'modalIn 0.25s ease-out' }}
            >
                {/* Close */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-20 bg-white/90 backdrop-blur p-2 rounded-full shadow-md hover:bg-gray-100 transition-colors"
                >
                    <X className="w-5 h-5 text-gray-700" />
                </button>

                {/* ===== TOP: Image + Info ===== */}
                <div className="flex flex-col md:flex-row">
                    {/* Image */}
                    <div className="md:w-5/12 bg-gray-100 relative overflow-hidden flex-shrink-0 rounded-tl-3xl rounded-tr-3xl md:rounded-tr-none">
                        <img
                            src={getImageUrl(item.image_path)}
                            alt={item.type}
                            className="w-full h-full object-cover min-h-[300px] md:min-h-[500px]"
                        />
                        <div className="absolute bottom-3 left-3 bg-black text-white px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
                            {style}
                        </div>

                        {/* Look Score Badge on image */}
                        {hasEvaluation && (
                            <div className={`absolute top-3 right-3 bg-gradient-to-r ${getNoteColor(evaluation.note)} text-white px-4 py-2 rounded-2xl shadow-lg`}>
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl font-black">{evaluation.note}</span>
                                    <span className="text-xs font-bold opacity-90">/5</span>
                                </div>
                            </div>
                        )}

                        {/* Multi-item count badge */}
                        {hasMultipleItems && (
                            <div className="absolute top-3 left-3 bg-white/95 backdrop-blur px-3 py-1.5 rounded-full text-xs font-bold text-gray-800 shadow-md">
                                {detectedItems.length} pièces détectées
                            </div>
                        )}
                    </div>

                    {/* Info panel */}
                    <div className="md:w-7/12 p-6 md:p-8">
                        {/* Multi-item tabs */}
                        {hasMultipleItems && (
                            <div className="flex flex-wrap gap-2 mb-5">
                                {detectedItems.map((detItem, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setActiveTab(index)}
                                        className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${activeTab === index
                                            ? 'bg-black text-white shadow-lg'
                                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                            }`}
                                    >
                                        {detItem.type || `Pièce ${index + 1}`}
                                    </button>
                                ))}
                            </div>
                        )}

                        <h2 className="text-3xl font-black text-gray-900 mb-1">
                            {currentItem.type || item.type}
                        </h2>
                        <p className="text-sm text-gray-400 mb-5">
                            {currentItem.genre || 'Unisexe'} &middot; {currentItem.couleur_dominante || item.couleur}
                        </p>

                        {/* ===== LOOK EVALUATION ===== */}
                        {hasEvaluation && (
                            <div className={`bg-gradient-to-r ${getNoteColor(evaluation.note)} rounded-2xl p-5 mb-6 text-white`}>
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <StarRating note={evaluation.note} />
                                        <span className="text-sm font-black uppercase tracking-wider">{getNoteLabel(evaluation.note)}</span>
                                    </div>
                                </div>
                                {evaluation.commentaire && (
                                    <p className="text-sm leading-relaxed text-white/90 mb-2">{evaluation.commentaire}</p>
                                )}
                                {evaluation.points_forts && (
                                    <div className="flex items-start gap-2 mt-2">
                                        <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-white/80" />
                                        <p className="text-xs text-white/80">{evaluation.points_forts}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Price Range */}
                        {hasPricing && evaluation.prix_total_look && (
                            <div className="bg-gray-50 rounded-2xl p-4 mb-6 border border-gray-100">
                                <div className="flex items-center gap-2 mb-3">
                                    <DollarSign className="w-4 h-4 text-gray-500" />
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Coût estimé du look complet</h3>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="bg-white rounded-xl p-3 border border-green-100">
                                        <p className="text-[9px] font-bold uppercase tracking-wider text-green-600 mb-1">Budget</p>
                                        <p className="text-lg font-black text-gray-900">{evaluation.prix_total_look.budget.min}–{evaluation.prix_total_look.budget.max}€</p>
                                        <p className="text-[10px] text-gray-400 mt-1 leading-tight">{evaluation.prix_total_look.budget.marques}</p>
                                    </div>
                                    <div className="bg-white rounded-xl p-3 border-2 border-blue-200 relative">
                                        <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-[8px] font-bold px-2 py-0.5 rounded-full">POPULAIRE</div>
                                        <p className="text-[9px] font-bold uppercase tracking-wider text-blue-600 mb-1">Moyen</p>
                                        <p className="text-lg font-black text-gray-900">{evaluation.prix_total_look.moyen.min}–{evaluation.prix_total_look.moyen.max}€</p>
                                        <p className="text-[10px] text-gray-400 mt-1 leading-tight">{evaluation.prix_total_look.moyen.marques}</p>
                                    </div>
                                    <div className="bg-white rounded-xl p-3 border border-amber-100">
                                        <p className="text-[9px] font-bold uppercase tracking-wider text-amber-600 mb-1">Premium</p>
                                        <p className="text-lg font-black text-gray-900">{evaluation.prix_total_look.premium.min}–{evaluation.prix_total_look.premium.max}€</p>
                                        <p className="text-[10px] text-gray-400 mt-1 leading-tight">{evaluation.prix_total_look.premium.marques}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Description */}
                        {description && (
                            <p className="text-gray-600 text-sm leading-relaxed mb-6 border-l-2 border-gray-200 pl-4">
                                {description}
                            </p>
                        )}

                        {/* Info grid */}
                        <div className="grid grid-cols-3 gap-2.5 mb-6">
                            {infoItems.map(({ icon: Icon, label, value }) => (
                                <div key={label} className="bg-gray-50 rounded-xl p-3">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <Icon className="w-3 h-3 text-gray-400" />
                                        <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">{label}</span>
                                    </div>
                                    <p className="text-xs font-semibold text-gray-900 leading-tight">{value}</p>
                                </div>
                            ))}
                        </div>

                        {/* Styling advice */}
                        {conseils && (
                            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-5 text-white">
                                <div className="flex items-center gap-2 mb-2">
                                    <Lightbulb className="w-4 h-4 text-yellow-400" />
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300">
                                        Conseils de style
                                    </h3>
                                </div>
                                <p className="text-sm leading-relaxed text-gray-200">
                                    {conseils}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* ===== MISSING PIECES (if score < 5) ===== */}
                {hasMissingPieces && (
                    <div className="border-t border-gray-100 bg-gradient-to-r from-amber-50 to-orange-50 p-6 md:p-8">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                                <AlertTriangle className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">
                                    Pièces manquantes pour un look 5/5
                                </h3>
                                <p className="text-xs text-gray-500">
                                    {evaluation.pieces_manquantes.length} pièce(s) suggérée(s) pour perfectionner votre tenue
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {evaluation.pieces_manquantes.map((piece, index) => (
                                <div
                                    key={index}
                                    className="bg-white rounded-2xl border-2 border-amber-200 overflow-hidden hover:border-amber-400 hover:shadow-lg transition-all duration-300"
                                >
                                    <div className="p-5">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 mb-1">
                                            {piece.marque}
                                        </p>
                                        <h4 className="font-bold text-gray-900 text-sm mb-2 leading-tight">
                                            {piece.nom}
                                        </h4>
                                        <p className="text-xl font-black text-gray-900 mb-2">
                                            {piece.prix_estime}
                                        </p>
                                        {piece.raison && (
                                            <p className="text-xs text-gray-500 mb-4 italic leading-relaxed">
                                                &ldquo;{piece.raison}&rdquo;
                                            </p>
                                        )}

                                        <div className="space-y-2">
                                            <a
                                                href={buildShopUrl(piece.recherche)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center justify-center gap-2 w-full bg-amber-500 text-white text-xs font-bold py-2.5 rounded-xl hover:bg-amber-600 transition-colors"
                                            >
                                                <ExternalLink className="w-3 h-3" />
                                                Zalando
                                            </a>
                                            <a
                                                href={buildAmazonUrl(piece.recherche)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center justify-center gap-2 w-full bg-white text-gray-700 text-xs font-bold py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
                                            >
                                                <ExternalLink className="w-3 h-3" />
                                                Amazon
                                            </a>
                                            <a
                                                href={buildASOSUrl(piece.recherche)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center justify-center gap-2 w-full bg-white text-gray-700 text-xs font-bold py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
                                            >
                                                <ExternalLink className="w-3 h-3" />
                                                ASOS
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ===== BOTTOM: Product Recommendations ===== */}
                {products.length > 0 && (
                    <div className="border-t border-gray-100 p-6 md:p-8">
                        <div className="flex items-center gap-2 mb-5">
                            <ShoppingBag className="w-5 h-5 text-gray-900" />
                            <h3 className="text-lg font-bold text-gray-900">
                                Complétez votre look
                            </h3>
                            <span className="text-xs text-gray-400 ml-auto">
                                À assortir avec votre {currentItem.type || 'pièce'}
                            </span>
                        </div>

                        <div className="flex gap-4 overflow-x-auto pb-2 -mx-2 px-2 snap-x">
                            {products.map((product, index) => (
                                <div
                                    key={index}
                                    className="flex-shrink-0 w-64 bg-gray-50 rounded-2xl overflow-hidden border border-gray-100 hover:border-gray-300 hover:shadow-lg transition-all duration-300 snap-start"
                                >
                                    <div className="p-5">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                                            {product.marque}
                                        </p>
                                        <h4 className="font-bold text-gray-900 text-sm mb-2 leading-tight">
                                            {product.nom}
                                        </h4>
                                        <p className="text-2xl font-black text-gray-900 mb-4">
                                            {product.prix_estime}
                                        </p>

                                        <div className="space-y-2">
                                            <a
                                                href={buildShopUrl(product.recherche)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center justify-center gap-2 w-full bg-black text-white text-xs font-bold py-2.5 rounded-xl hover:bg-gray-800 transition-colors"
                                            >
                                                <ExternalLink className="w-3 h-3" />
                                                Zalando
                                            </a>
                                            <a
                                                href={buildAmazonUrl(product.recherche)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center justify-center gap-2 w-full bg-white text-gray-700 text-xs font-bold py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
                                            >
                                                <ExternalLink className="w-3 h-3" />
                                                Amazon
                                            </a>
                                            <a
                                                href={buildASOSUrl(product.recherche)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center justify-center gap-2 w-full bg-white text-gray-700 text-xs font-bold py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
                                            >
                                                <ExternalLink className="w-3 h-3" />
                                                ASOS
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <style jsx>{`
                    @keyframes modalIn {
                        from { opacity: 0; transform: scale(0.95) translateY(10px); }
                        to { opacity: 1; transform: scale(1) translateY(0); }
                    }
                `}</style>
            </div>
        </div>
    );
}
