'use client';

import { useState } from 'react';
import { Trash2, Pencil, X, Check, Eye } from 'lucide-react';
import { getImageUrl, deleteClothing, updateClothing } from '../lib/api';
import ClothingDetail from './ClothingDetail';

interface ClothingItem {
    id: number;
    type: string;
    couleur: string;
    saison: string;
    tags_ia: string;
    image_path: string;
}

interface WardrobeGalleryProps {
    items: ClothingItem[];
    loading?: boolean;
    onItemChanged: () => void;
}

const SAISONS = ['Hiver', 'Été', 'Mi-saison', 'Toutes saisons'];

export default function WardrobeGallery({ items, loading, onItemChanged }: WardrobeGalleryProps) {
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState({ type: '', couleur: '', saison: '' });
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);
    const [selectedItem, setSelectedItem] = useState<ClothingItem | null>(null);

    const handleStartEdit = (item: ClothingItem) => {
        setEditingId(item.id);
        setEditForm({ type: item.type, couleur: item.couleur, saison: item.saison });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditForm({ type: '', couleur: '', saison: '' });
    };

    const handleSaveEdit = async (itemId: number) => {
        setSaving(true);
        try {
            await updateClothing(itemId, editForm);
            setEditingId(null);
            onItemChanged();
        } catch (err) {
            console.error('Failed to update item', err);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (itemId: number) => {
        if (!confirm('Supprimer ce vêtement ?')) return;
        setDeletingId(itemId);
        try {
            await deleteClothing(itemId);
            onItemChanged();
        } catch (err) {
            console.error('Failed to delete item', err);
        } finally {
            setDeletingId(null);
        }
    };

    if (loading) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-pulse">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="aspect-[3/4] bg-gray-200 rounded-2xl"></div>
                ))}
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                <p className="text-gray-400 font-medium">Votre garde-robe est vide pour l&apos;instant.</p>
            </div>
        );
    }

    const getStyle = (tagsIa: string): string => {
        try {
            const parsed = JSON.parse(tagsIa);
            return parsed.style || 'Casual';
        } catch {
            return 'Casual';
        }
    };

    const getGenre = (tagsIa: string): string => {
        try {
            const parsed = JSON.parse(tagsIa);
            return parsed.genre || '';
        } catch {
            return '';
        }
    };

    return (
        <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {items.map((item) => {
                    const isEditing = editingId === item.id;
                    const isDeleting = deletingId === item.id;
                    const itemStyle = getStyle(item.tags_ia);
                    const genre = getGenre(item.tags_ia);

                    return (
                        <div
                            key={item.id}
                            className={`group relative bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:-translate-y-1 ${isDeleting ? 'opacity-50 scale-95 pointer-events-none' : ''}`}
                        >
                            {/* Image area */}
                            <div className="aspect-[3/4] bg-gray-100 relative overflow-hidden">
                                <img
                                    src={getImageUrl(item.image_path)}
                                    alt={item.type}
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                    loading="lazy"
                                />

                                {/* Season badge - top right */}
                                <div className="absolute top-2 right-2 bg-white/90 backdrop-blur px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider text-gray-800 shadow-sm z-10">
                                    {item.saison}
                                </div>

                                {/* Style badge - bottom left */}
                                <div className="absolute bottom-2 left-2 bg-black/80 backdrop-blur text-white px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider z-10">
                                    {itemStyle}
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-4">
                                {isEditing ? (
                                    <div className="space-y-2">
                                        <input
                                            type="text"
                                            value={editForm.type}
                                            onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                                            className="w-full px-2 py-1 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-black focus:border-transparent outline-none"
                                            placeholder="Type"
                                        />
                                        <input
                                            type="text"
                                            value={editForm.couleur}
                                            onChange={(e) => setEditForm({ ...editForm, couleur: e.target.value })}
                                            className="w-full px-2 py-1 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-black focus:border-transparent outline-none"
                                            placeholder="Couleur"
                                        />
                                        <select
                                            value={editForm.saison}
                                            onChange={(e) => setEditForm({ ...editForm, saison: e.target.value })}
                                            className="w-full px-2 py-1 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-black focus:border-transparent outline-none bg-white"
                                        >
                                            {SAISONS.map((s) => (
                                                <option key={s} value={s}>{s}</option>
                                            ))}
                                        </select>
                                        <div className="flex gap-2 pt-1">
                                            <button
                                                onClick={() => handleSaveEdit(item.id)}
                                                disabled={saving}
                                                className="flex-1 flex items-center justify-center gap-1 bg-black text-white text-xs py-1.5 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                                            >
                                                <Check className="w-3 h-3" />
                                                {saving ? '...' : 'OK'}
                                            </button>
                                            <button
                                                onClick={handleCancelEdit}
                                                className="flex-1 flex items-center justify-center gap-1 bg-gray-100 text-gray-600 text-xs py-1.5 rounded-lg hover:bg-gray-200 transition-colors"
                                            >
                                                <X className="w-3 h-3" />
                                                Annuler
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="mb-3">
                                            <h4 className="font-bold text-gray-900 leading-tight">{item.type}</h4>
                                            <p className="text-sm text-gray-500">
                                                {item.couleur}
                                                {genre && <span className="text-gray-300"> · {genre}</span>}
                                            </p>
                                        </div>

                                        {/* ACTION BUTTONS - always visible */}
                                        <div className="flex gap-2 pt-2 border-t border-gray-100">
                                            <button
                                                onClick={() => setSelectedItem(item)}
                                                className="flex-1 flex items-center justify-center gap-1.5 bg-gray-900 text-white text-xs font-medium py-2 rounded-lg hover:bg-black transition-colors"
                                            >
                                                <Eye className="w-3 h-3" />
                                                Détails
                                            </button>
                                            <button
                                                onClick={() => handleStartEdit(item)}
                                                className="flex items-center justify-center p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                                                title="Modifier"
                                            >
                                                <Pencil className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(item.id)}
                                                disabled={isDeleting}
                                                className="flex items-center justify-center p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors"
                                                title="Supprimer"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Detail Modal */}
            {selectedItem && (
                <ClothingDetail
                    item={selectedItem}
                    onClose={() => setSelectedItem(null)}
                />
            )}
        </>
    );
}
