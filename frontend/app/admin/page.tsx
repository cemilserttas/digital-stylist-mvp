'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Shield, Trash2, Users, Shirt, LogOut, AlertTriangle,
  RefreshCw, MousePointerClick, TrendingUp, Euro, Crown,
} from 'lucide-react';

interface UserRow {
  id: number; prenom: string; morphologie: string;
  style_prefere: string | null; created_at: string; clothing_count: number;
  is_premium: boolean; premium_until: string | null;
}

interface AdminStats {
  users: { total: number; new_7d: number; new_30d: number; premium: number; signups_by_day: { date: string; count: number }[] };
  wardrobe: { total_items: number; wardrobe: number; wishlist: number; avg_per_user: number };
  monetization: { total_clicks: number; top_brands: { marque: string; clicks: number }[]; estimated_revenue_eur: number };
}

function Sparkline({ data }: { data: { date: string; count: number }[] }) {
  const max = Math.max(...data.map(d => d.count), 1);
  const w = 200; const h = 40; const n = data.length;
  const pts = data.map((d, i) => `${(i / (n - 1)) * w},${h - (d.count / max) * h}`).join(' ');
  return (
    <svg width={w} height={h} className="opacity-70">
      <polyline fill="none" stroke="#a855f7" strokeWidth="2" strokeLinejoin="round" points={pts} />
      {data.map((d, i) => d.count > 0 && (
        <circle key={i} cx={(i / (n - 1)) * w} cy={h - (d.count / max) * h} r="3" fill="#a855f7" />
      ))}
    </svg>
  );
}

function KPI({ icon: Icon, label, value, sub, color = 'text-white' }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color?: string;
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-xs font-bold uppercase tracking-wider text-gray-500">{label}</span>
      </div>
      <p className={`text-3xl font-black ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [keyInput, setKeyInput] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [usersRes, statsRes] = await Promise.all([
        fetch('/api/admin/users', { headers: { 'x-admin-key': adminKey } }),
        fetch('/api/admin/stats', { headers: { 'x-admin-key': adminKey } }),
      ]);
      if (usersRes.status === 403) { setError('Clé admin invalide'); setIsAuthenticated(false); return; }
      if (!usersRes.ok || !statsRes.ok) { setError('Erreur serveur'); return; }
      const [u, s] = await Promise.all([usersRes.json(), statsRes.json()]);
      setUsers(u.users);
      setStats(s);
    } catch { setError('Impossible de contacter le serveur'); }
    finally { setLoading(false); }
  }, [adminKey]);

  useEffect(() => { if (isAuthenticated) fetchData(); }, [isAuthenticated, fetchData]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyInput.trim()) return;
    setAdminKey(keyInput.trim()); setIsAuthenticated(true);
  };

  const handleDelete = async (userId: number, name: string) => {
    if (!confirm(`⚠️ Supprimer "${name}" et toutes ses données ? Action irréversible.`)) return;
    setDeletingId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE', headers: { 'x-admin-key': adminKey } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      alert(`✅ ${data.message} (${data.deleted_items} vêtement(s) supprimé(s))`);
      fetchData();
    } catch { alert('❌ Erreur lors de la suppression'); }
    finally { setDeletingId(null); }
  };

  const fmtDate = (s: string) => {
    try { return new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return s; }
  };

  if (!isAuthenticated) return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/5 border border-white/10 rounded-2xl mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white">Admin Panel</h1>
          <p className="text-sm text-gray-500 mt-1">Digital Stylist — Accès restreint</p>
        </div>
        <form onSubmit={handleLogin} className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
            Clé d&apos;administration
          </label>
          <input
            type="password" value={keyInput} onChange={e => setKeyInput(e.target.value)}
            placeholder="Entrez votre clé admin" autoFocus
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-white/20 mb-4"
          />
          {error && <p className="text-red-400 text-sm mb-4 flex items-center gap-2"><AlertTriangle className="w-4 h-4" />{error}</p>}
          <button type="submit" className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors">
            Se connecter
          </button>
        </form>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-white/10 px-6 py-4 sticky top-0 z-10 bg-gray-950/80 backdrop-blur">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-green-400" />
            <h1 className="font-bold text-lg">Admin Panel</h1>
            <span className="bg-green-500/10 text-green-400 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full">
              Connecté
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchData} disabled={loading}
              className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm hover:bg-white/10 transition-colors disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Actualiser
            </button>
            <button onClick={() => { setIsAuthenticated(false); setAdminKey(''); setKeyInput(''); setUsers([]); setStats(null); }}
              className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/20 transition-colors">
              <LogOut className="w-4 h-4" /> Déconnexion
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* KPI Row */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            <KPI icon={Users} label="Utilisateurs" value={stats.users.total}
              sub={`+${stats.users.new_7d} cette semaine`} color="text-blue-400" />
            <KPI icon={TrendingUp} label="Nouveaux (30j)" value={stats.users.new_30d}
              sub="inscriptions" color="text-emerald-400" />
            <KPI icon={Shirt} label="Vêtements" value={stats.wardrobe.total_items}
              sub={`~${stats.wardrobe.avg_per_user} / utilisateur`} color="text-purple-400" />
            <KPI icon={MousePointerClick} label="Clics affiliés" value={stats.monetization.total_clicks}
              sub="total produits cliqués" color="text-orange-400" />
            <KPI icon={Crown} label="Premium" value={stats.users.premium}
              sub={`${stats.users.total > 0 ? Math.round(stats.users.premium / stats.users.total * 100) : 0}% des utilisateurs`} color="text-amber-400" />
            <KPI icon={Euro} label="CA estimé" value={`${stats.monetization.estimated_revenue_eur} €`}
              sub="5% comm. moy. panier 30 €" color="text-yellow-400" />
          </div>
        )}

        {/* Signups sparkline + Top brands */}
        {stats && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-4">
                Inscriptions — 14 derniers jours
              </p>
              <Sparkline data={stats.users.signups_by_day} />
              <div className="flex justify-between text-[10px] text-gray-600 mt-1">
                <span>{stats.users.signups_by_day[0]?.date.slice(5)}</span>
                <span>{stats.users.signups_by_day[stats.users.signups_by_day.length - 1]?.date.slice(5)}</span>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-4">
                Top marques cliquées
              </p>
              {stats.monetization.top_brands.length === 0 ? (
                <p className="text-gray-600 text-sm">Aucun clic enregistré</p>
              ) : (
                <div className="space-y-2">
                  {stats.monetization.top_brands.map((b, i) => {
                    const max = stats.monetization.top_brands[0].clicks;
                    return (
                      <div key={b.marque} className="flex items-center gap-3">
                        <span className="text-xs font-bold text-gray-500 w-4">{i + 1}</span>
                        <div className="flex-1">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium">{b.marque}</span>
                            <span className="text-gray-400">{b.clicks}</span>
                          </div>
                          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-purple-500 rounded-full" style={{ width: `${(b.clicks / max) * 100}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Users table */}
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
            <h2 className="font-bold">Utilisateurs ({users.length})</h2>
            {loading && <RefreshCw className="w-4 h-4 animate-spin text-gray-500" />}
          </div>
          {users.length === 0 && !loading ? (
            <div className="p-12 text-center text-gray-500">Aucun utilisateur</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5 text-xs font-bold uppercase tracking-wider text-gray-500">
                    <th className="px-5 py-3 text-left">ID</th>
                    <th className="px-5 py-3 text-left">Prénom</th>
                    <th className="px-5 py-3 text-left">Morpho</th>
                    <th className="px-5 py-3 text-center">Vêtements</th>
                    <th className="px-5 py-3 text-center">Premium</th>
                    <th className="px-5 py-3 text-left">Inscrit le</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}
                      className={`border-b border-white/5 hover:bg-white/5 transition-colors ${deletingId === u.id ? 'opacity-40' : ''}`}>
                      <td className="px-5 py-3 text-xs text-gray-500 font-mono">#{u.id}</td>
                      <td className="px-5 py-3 font-semibold">{u.prenom}</td>
                      <td className="px-5 py-3">
                        <span className="bg-white/10 px-2 py-0.5 rounded text-xs">{u.morphologie}</span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className={`inline-flex items-center justify-center min-w-[26px] px-2 py-0.5 rounded-full text-xs font-bold ${u.clothing_count > 0 ? 'bg-purple-500/20 text-purple-300' : 'bg-white/5 text-gray-500'}`}>
                          {u.clothing_count}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        {u.is_premium ? (
                          <span title={u.premium_until ? `jusqu'au ${fmtDate(u.premium_until)}` : ''}>
                            <Crown className="w-4 h-4 text-amber-400 inline-block" />
                          </span>
                        ) : (
                          <span className="text-gray-700">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-400">{fmtDate(u.created_at)}</td>
                      <td className="px-5 py-3 text-right">
                        <button onClick={() => handleDelete(u.id, u.prenom)} disabled={deletingId === u.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-red-500/10 text-red-400 text-xs font-bold rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-50">
                          <Trash2 className="w-3 h-3" /> Supprimer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
