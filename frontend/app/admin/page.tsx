'use client';

import { useState, useEffect, useCallback } from 'react';
import { Shield, Trash2, Users, Shirt, LogOut, AlertTriangle, RefreshCw } from 'lucide-react';
import { api } from '../../lib/api';

interface UserData {
    id: number;
    prenom: string;
    morphologie: string;
    style_prefere: string | null;
    created_at: string;
    clothing_count: number;
}

interface Stats {
    total_users: number;
    total_items: number;
}

export default function AdminPage() {
    const [adminKey, setAdminKey] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [users, setUsers] = useState<UserData[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [keyInput, setKeyInput] = useState('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [usersRes, statsRes] = await Promise.all([
                api.get('/admin/users', { headers: { 'x-admin-key': adminKey } }),
                api.get('/admin/stats', { headers: { 'x-admin-key': adminKey } }),
            ]);
            setUsers(usersRes.data.users);
            setStats(statsRes.data);
        } catch (err: unknown) {
            const error = err as { response?: { status?: number } };
            if (error.response?.status === 403) {
                setError('Clé admin invalide');
                setIsAuthenticated(false);
            } else {
                setError('Erreur de connexion au serveur');
            }
        } finally {
            setLoading(false);
        }
    }, [adminKey]);

    useEffect(() => {
        if (isAuthenticated) fetchData();
    }, [isAuthenticated, fetchData]);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (!keyInput.trim()) return;
        setAdminKey(keyInput.trim());
        setIsAuthenticated(true);
    };

    const handleDeleteUser = async (userId: number, userName: string) => {
        if (!confirm(`⚠️ Supprimer "${userName}" et TOUTES ses données (vêtements, images) ? Cette action est irréversible.`)) return;
        setDeletingId(userId);
        try {
            const res = await api.delete(`/admin/users/${userId}`, {
                headers: { 'x-admin-key': adminKey },
            });
            alert(`✅ ${res.data.message}\n${res.data.deleted_items} vêtement(s) et ${res.data.deleted_files} image(s) supprimé(s).`);
            fetchData();
        } catch {
            alert('❌ Erreur lors de la suppression');
        } finally {
            setDeletingId(null);
        }
    };

    const handleLogout = () => {
        setIsAuthenticated(false);
        setAdminKey('');
        setKeyInput('');
        setUsers([]);
        setStats(null);
    };

    const formatDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleDateString('fr-FR', {
                day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
            });
        } catch {
            return dateStr;
        }
    };

    // ========== LOGIN SCREEN ==========
    if (!isAuthenticated) {
        return (
            <main className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
                <div className="w-full max-w-md">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-white/5 border border-white/10 rounded-2xl mb-4">
                            <Shield className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-2xl font-black text-white">Admin Panel</h1>
                        <p className="text-sm text-gray-500 mt-1">Digital Stylist — Accès restreint</p>
                    </div>

                    <form onSubmit={handleLogin} className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6">
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                            Clé d&apos;administration
                        </label>
                        <input
                            type="password"
                            value={keyInput}
                            onChange={(e) => setKeyInput(e.target.value)}
                            placeholder="Entrez votre clé admin"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-white/20 mb-4"
                            autoFocus
                        />
                        {error && (
                            <p className="text-red-400 text-sm mb-4 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4" /> {error}
                            </p>
                        )}
                        <button
                            type="submit"
                            className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors"
                        >
                            Se connecter
                        </button>
                    </form>
                </div>
            </main>
        );
    }

    // ========== ADMIN DASHBOARD ==========
    return (
        <main className="min-h-screen bg-gray-950 text-white">
            {/* Header */}
            <header className="border-b border-white/10 px-6 py-4">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Shield className="w-5 h-5 text-green-400" />
                        <h1 className="font-bold text-lg">Admin Panel</h1>
                        <span className="bg-green-500/10 text-green-400 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full">
                            Connecté
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={fetchData}
                            disabled={loading}
                            className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm hover:bg-white/10 transition-colors disabled:opacity-50"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            Actualiser
                        </button>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/20 transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            Déconnexion
                        </button>
                    </div>
                </div>
            </header>

            <div className="max-w-6xl mx-auto px-6 py-8">
                {/* Stats Cards */}
                {stats && (
                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                            <div className="flex items-center gap-3 mb-2">
                                <Users className="w-5 h-5 text-blue-400" />
                                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Utilisateurs</span>
                            </div>
                            <p className="text-4xl font-black">{stats.total_users}</p>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                            <div className="flex items-center gap-3 mb-2">
                                <Shirt className="w-5 h-5 text-purple-400" />
                                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Vêtements</span>
                            </div>
                            <p className="text-4xl font-black">{stats.total_items}</p>
                        </div>
                    </div>
                )}

                {/* Users Table */}
                <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-white/10">
                        <h2 className="font-bold">Tous les utilisateurs</h2>
                    </div>

                    {loading && users.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3" />
                            Chargement...
                        </div>
                    ) : users.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            Aucun utilisateur inscrit
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/5 text-xs font-bold uppercase tracking-wider text-gray-500">
                                    <th className="px-6 py-3 text-left">ID</th>
                                    <th className="px-6 py-3 text-left">Prénom</th>
                                    <th className="px-6 py-3 text-left">Morphologie</th>
                                    <th className="px-6 py-3 text-center">Vêtements</th>
                                    <th className="px-6 py-3 text-left">Inscrit le</th>
                                    <th className="px-6 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => (
                                    <tr
                                        key={user.id}
                                        className={`border-b border-white/5 hover:bg-white/5 transition-colors ${deletingId === user.id ? 'opacity-50' : ''}`}
                                    >
                                        <td className="px-6 py-4 text-sm text-gray-400 font-mono">#{user.id}</td>
                                        <td className="px-6 py-4">
                                            <span className="font-semibold">{user.prenom}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="bg-white/10 px-2 py-1 rounded-md text-xs font-medium">
                                                {user.morphologie}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center justify-center min-w-[28px] px-2 py-1 rounded-full text-xs font-bold ${user.clothing_count > 0 ? 'bg-purple-500/20 text-purple-300' : 'bg-white/5 text-gray-500'}`}>
                                                {user.clothing_count}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-400">
                                            {formatDate(user.created_at)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleDeleteUser(user.id, user.prenom)}
                                                disabled={deletingId === user.id}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-400 text-xs font-bold rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-50"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                                Supprimer
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </main>
    );
}
