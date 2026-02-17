'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    User as UserIcon, Settings, History, Trash2, Save, ArrowLeft,
    ChevronRight, ExternalLink, AlertTriangle, Check, X, Clock, Palette
} from 'lucide-react';
import { updateUser, deleteUser, getClicks, clearClicks } from '@/lib/api';
import StylePreferences from '@/components/StylePreferences';

const MORPHOLOGIES = [
    { value: 'TRIANGLE', label: 'Triangle', icon: '🔺' },
    { value: 'OVALE', label: 'Ovale', icon: '⭕' },
    { value: 'RECTANGLE', label: 'Rectangle', icon: '▬' },
    { value: 'SABLIER', label: 'Sablier', icon: '⏳' },
    { value: 'TRAPEZE', label: 'Trapèze', icon: '🔻' },
];

interface UserData {
    id: number;
    prenom: string;
    morphologie: string;
    genre: string;
    age: number;
    style_prefere?: string | null;
}

interface ClickRecord {
    id: number;
    product_name: string;
    marque: string;
    prix: number;
    url: string;
    clicked_at: string;
}

interface UserSettingsProps {
    user: UserData;
    onBack: () => void;
    onUserUpdated: (user: UserData) => void;
    onLogout: () => void;
}

type SettingsTab = 'profile' | 'style' | 'history' | 'danger';

export default function UserSettings({ user, onBack, onUserUpdated, onLogout }: UserSettingsProps) {
    const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

    // Profile state
    const [prenom, setPrenom] = useState(user.prenom);
    const [genre, setGenre] = useState(user.genre);
    const [age, setAge] = useState(user.age);
    const [morphologie, setMorphologie] = useState(user.morphologie);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    // History state
    const [clicks, setClicks] = useState<ClickRecord[]>([]);
    const [loadingClicks, setLoadingClicks] = useState(false);

    // Danger state
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Style save state (separate from profile)
    const [styleSaved, setStyleSaved] = useState(false);

    const fetchClicks = useCallback(async () => {
        setLoadingClicks(true);
        try {
            const data = await getClicks(user.id);
            setClicks(data);
        } catch (err) { console.error(err); }
        finally { setLoadingClicks(false); }
    }, [user.id]);

    useEffect(() => {
        if (activeTab === 'history') fetchClicks();
    }, [activeTab, fetchClicks]);

    const handleSaveProfile = async () => {
        setSaving(true);
        try {
            const updated = await updateUser(user.id, { prenom, genre, age, morphologie });
            onUserUpdated(updated);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (err) { console.error(err); }
        finally { setSaving(false); }
    };

    const handleDeleteAccount = async () => {
        setDeleting(true);
        try {
            await deleteUser(user.id);
            localStorage.removeItem('stylist_user');
            onLogout();
        } catch (err) { console.error(err); }
        finally { setDeleting(false); }
    };

    const handleClearHistory = async () => {
        try {
            await clearClicks(user.id);
            setClicks([]);
        } catch (err) { console.error(err); }
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('fr-FR', {
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    const handleStylePrefsUpdate = async (preferences: string) => {
        try {
            const updated = await updateUser(user.id, { style_prefere: preferences });
            onUserUpdated(updated);
            setStyleSaved(true);
            setTimeout(() => setStyleSaved(false), 3000);
        } catch (err) { console.error(err); }
    };

    const tabs = [
        { key: 'profile' as SettingsTab, icon: UserIcon, label: 'Mon Profil', desc: 'Gérer mes informations' },
        { key: 'style' as SettingsTab, icon: Palette, label: 'Mon Style', desc: 'Préférences mode' },
        { key: 'history' as SettingsTab, icon: History, label: 'Historique', desc: 'Liens consultés' },
        { key: 'danger' as SettingsTab, icon: AlertTriangle, label: 'Zone danger', desc: 'Supprimer le compte' },
    ];

    return (
        <div className="min-h-screen bg-gray-950 text-white">
            {/* Header */}
            <header className="sticky top-0 z-30 bg-gray-950/80 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold flex items-center gap-2">
                            <Settings className="w-5 h-5 text-purple-400" />
                            Paramètres
                        </h1>
                        <p className="text-xs text-gray-500">Gérez votre compte et vos préférences</p>
                    </div>
                </div>
            </header>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
                <div className="flex flex-col md:flex-row gap-6">
                    {/* Sidebar */}
                    <div className="md:w-64 flex-shrink-0">
                        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                            {/* User card */}
                            <div className="p-5 border-b border-white/5 text-center">
                                <div className="w-16 h-16 mx-auto bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center text-2xl font-black mb-3">
                                    {user.prenom.charAt(0).toUpperCase()}
                                </div>
                                <p className="font-bold text-white">{user.prenom}</p>
                                <p className="text-xs text-gray-500">{user.genre} · {user.age} ans</p>
                            </div>

                            {/* Tab nav */}
                            <nav className="p-2">
                                {tabs.map(({ key, icon: Icon, label, desc }) => (
                                    <button
                                        key={key}
                                        onClick={() => setActiveTab(key)}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all mb-1 ${activeTab === key
                                            ? 'bg-white/10 text-white'
                                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                                            }`}
                                    >
                                        <Icon className={`w-4 h-4 flex-shrink-0 ${key === 'danger' && activeTab === key ? 'text-red-400' :
                                            activeTab === key ? 'text-purple-400' : ''
                                            }`} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{label}</p>
                                            <p className="text-[10px] text-gray-600 truncate">{desc}</p>
                                        </div>
                                        <ChevronRight className="w-3 h-3 text-gray-600" />
                                    </button>
                                ))}
                            </nav>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        {/* ===== PROFILE TAB ===== */}
                        {activeTab === 'profile' && (
                            <div className="space-y-6">
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                                    <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                                        <UserIcon className="w-5 h-5 text-purple-400" />
                                        Informations personnelles
                                    </h2>

                                    <div className="space-y-5">
                                        {/* Prénom */}
                                        <div>
                                            <label className="text-sm text-gray-400 mb-2 block">Prénom</label>
                                            <input
                                                type="text"
                                                value={prenom}
                                                onChange={(e) => setPrenom(e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 transition-colors"
                                            />
                                        </div>

                                        {/* Genre */}
                                        <div>
                                            <label className="text-sm text-gray-400 mb-2 block">Genre</label>
                                            <div className="grid grid-cols-2 gap-3">
                                                {['Homme', 'Femme'].map((g) => (
                                                    <button
                                                        key={g}
                                                        onClick={() => setGenre(g)}
                                                        className={`py-3 rounded-xl border text-sm font-medium transition-all ${genre === g
                                                            ? 'bg-purple-500/20 border-purple-500/50 text-white'
                                                            : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
                                                            }`}
                                                    >
                                                        {g === 'Homme' ? '👨' : '👩'} {g}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Âge */}
                                        <div>
                                            <label className="text-sm text-gray-400 mb-2 block">
                                                Âge : <span className="text-white font-bold">{age} ans</span>
                                            </label>
                                            <input
                                                type="range"
                                                min={14}
                                                max={70}
                                                value={age}
                                                onChange={(e) => setAge(Number(e.target.value))}
                                                className="w-full accent-purple-500"
                                            />
                                            <div className="flex justify-between text-[10px] text-gray-600 mt-1">
                                                <span>14</span><span>70</span>
                                            </div>
                                        </div>

                                        {/* Morphologie */}
                                        <div>
                                            <label className="text-sm text-gray-400 mb-2 block">Morphologie</label>
                                            <div className="grid grid-cols-5 gap-2">
                                                {MORPHOLOGIES.map((m) => (
                                                    <button
                                                        key={m.value}
                                                        onClick={() => setMorphologie(m.value)}
                                                        className={`py-3 rounded-xl border text-center transition-all ${morphologie === m.value
                                                            ? 'bg-purple-500/20 border-purple-500/50 text-white'
                                                            : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
                                                            }`}
                                                    >
                                                        <span className="text-lg block">{m.icon}</span>
                                                        <span className="text-[10px] block mt-1">{m.label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Save button */}
                                    <button
                                        onClick={handleSaveProfile}
                                        disabled={saving}
                                        className={`mt-6 w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${saved
                                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                            : 'bg-purple-600 hover:bg-purple-700 text-white'
                                            }`}
                                    >
                                        {saved ? (
                                            <><Check className="w-4 h-4" /> Sauvegardé !</>
                                        ) : saving ? (
                                            <><Save className="w-4 h-4 animate-pulse" /> Enregistrement...</>
                                        ) : (
                                            <><Save className="w-4 h-4" /> Enregistrer les modifications</>
                                        )}
                                    </button>
                                </div>

                                {/* Account info */}
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                                    <h3 className="text-sm font-bold text-gray-400 mb-3">Informations du compte</h3>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">ID Compte</span>
                                            <span className="text-gray-300 font-mono">#{user.id}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Morphologie</span>
                                            <span className="text-gray-300">{morphologie}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ===== STYLE TAB ===== */}
                        {activeTab === 'style' && (
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                                    <Palette className="w-5 h-5 text-green-400" />
                                    Mes préférences de style
                                </h2>
                                <p className="text-sm text-gray-400 mb-6">
                                    Modifie tes centres d&apos;intérêt pour recevoir des suggestions plus personnalisées.
                                </p>

                                {styleSaved && (
                                    <div className="mb-6 flex items-center gap-2 bg-green-500/15 border border-green-500/30 rounded-xl px-4 py-3 text-green-400 text-sm font-medium animate-pulse">
                                        <Check className="w-4 h-4" />
                                        Préférences de style sauvegardées !
                                    </div>
                                )}

                                <StylePreferences
                                    userName={user.prenom}
                                    initialPreferences={user.style_prefere || undefined}
                                    onComplete={handleStylePrefsUpdate}
                                    inline
                                />
                            </div>
                        )}

                        {/* ===== HISTORY TAB ===== */}
                        {activeTab === 'history' && (
                            <div className="space-y-4">
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                                    <div className="flex items-center justify-between mb-6">
                                        <h2 className="text-lg font-bold flex items-center gap-2">
                                            <History className="w-5 h-5 text-purple-400" />
                                            Liens consultés
                                        </h2>
                                        {clicks.length > 0 && (
                                            <button
                                                onClick={handleClearHistory}
                                                className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                                Tout effacer
                                            </button>
                                        )}
                                    </div>

                                    {loadingClicks ? (
                                        <div className="text-center py-12">
                                            <div className="w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                                            <p className="text-sm text-gray-500">Chargement...</p>
                                        </div>
                                    ) : clicks.length === 0 ? (
                                        <div className="text-center py-12">
                                            <History className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                                            <p className="text-gray-400 font-medium">Aucun lien consulté</p>
                                            <p className="text-xs text-gray-600 mt-1">
                                                Vos clics sur les produits suggérés apparaîtront ici
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {clicks.map((click) => (
                                                <div
                                                    key={click.id}
                                                    className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3 group hover:bg-white/8 transition-colors"
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-white truncate">{click.product_name}</p>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-xs text-gray-500">{click.marque}</span>
                                                            <span className="text-xs text-gray-600">·</span>
                                                            <span className="text-xs font-bold text-purple-400">{click.prix.toFixed(2)}€</span>
                                                            <span className="text-xs text-gray-600">·</span>
                                                            <span className="text-[10px] text-gray-600 flex items-center gap-1">
                                                                <Clock className="w-2.5 h-2.5" />
                                                                {formatDate(click.clicked_at)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <a
                                                        href={click.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
                                                    >
                                                        <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                                                    </a>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {clicks.length > 0 && (
                                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-500">Total des produits consultés</span>
                                            <span className="font-bold text-white">{clicks.length} produit{clicks.length > 1 ? 's' : ''}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ===== DANGER ZONE ===== */}
                        {activeTab === 'danger' && (
                            <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6">
                                <h2 className="text-lg font-bold text-red-400 flex items-center gap-2 mb-2">
                                    <AlertTriangle className="w-5 h-5" />
                                    Zone danger
                                </h2>
                                <p className="text-sm text-gray-400 mb-6">
                                    Ces actions sont irréversibles. Toutes vos données seront définitivement supprimées.
                                </p>

                                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-5">
                                    <h3 className="text-sm font-bold text-red-300 mb-1">Supprimer mon compte</h3>
                                    <p className="text-xs text-gray-500 mb-4">
                                        Supprime votre profil, votre garde-robe, vos inspirations, et tout votre historique.
                                    </p>

                                    {!confirmDelete ? (
                                        <button
                                            onClick={() => setConfirmDelete(true)}
                                            className="px-5 py-2.5 bg-red-600/20 border border-red-500/30 text-red-400 rounded-xl text-sm font-medium hover:bg-red-600/40 transition-colors"
                                        >
                                            Supprimer mon compte
                                        </button>
                                    ) : (
                                        <div className="space-y-3">
                                            <p className="text-sm font-bold text-red-300">
                                                ⚠️ Êtes-vous absolument sûr ? Cette action est irréversible.
                                            </p>
                                            <div className="flex gap-3">
                                                <button
                                                    onClick={handleDeleteAccount}
                                                    disabled={deleting}
                                                    className="px-5 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
                                                >
                                                    {deleting ? 'Suppression...' : 'Oui, supprimer définitivement'}
                                                </button>
                                                <button
                                                    onClick={() => setConfirmDelete(false)}
                                                    className="px-5 py-2.5 bg-white/5 border border-white/10 text-gray-300 rounded-xl text-sm hover:bg-white/10 transition-colors flex items-center gap-1"
                                                >
                                                    <X className="w-3.5 h-3.5" /> Annuler
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
