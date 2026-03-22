'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Shield, Trash2, Users, Shirt, LogOut, AlertTriangle,
  RefreshCw, MousePointerClick, TrendingUp, Euro, Crown,
  Cpu, Zap, Activity, DollarSign, BarChart3, ShoppingBag,
  ChevronRight, Flame, MessageCircle, Image as ImageIcon,
  Check, AlertCircle, Clock,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface UserRow {
  id: number; prenom: string; email: string | null; morphologie: string;
  genre: string; age: number; style_prefere: string | null;
  created_at: string; clothing_count: number;
  is_premium: boolean; premium_until: string | null;
  streak_current: number; streak_max: number;
  referral_count: number; suggestions_count_today: number;
  chat_count_today: number; ai_requests_total: number;
}

interface AdminStats {
  users: {
    total: number; new_7d: number; new_30d: number;
    premium: number; active_7d: number;
    signups_by_day: { date: string; count: number }[];
  };
  wardrobe: { total_items: number; wardrobe: number; wishlist: number; avg_per_user: number };
  monetization: {
    total_clicks: number;
    top_brands: { marque: string; clicks: number }[];
    estimated_revenue_eur: number; mrr_premium: number;
  };
}

interface AIStats {
  overview: {
    total_requests: number; requests_today: number;
    requests_7d: number; requests_30d: number;
    total_input_tokens: number; total_output_tokens: number;
    total_tokens: number; estimated_cost_usd: number; error_rate: number;
  };
  by_type: { type: string; count: number; input_tokens: number; output_tokens: number; avg_duration_ms: number }[];
  by_model: { model: string; count: number; input_tokens: number; output_tokens: number }[];
  by_status: Record<string, number>;
  top_users: { user_id: number; prenom: string; requests: number; total_tokens: number }[];
  requests_by_day: { date: string; count: number }[];
  active_model: string;
}

interface AIModel {
  model_id: string; name: string; description: string; tier: string;
  input_price_per_m: number; output_price_per_m: number;
  rpm_free: number; rpd_free: number; tpm_free: number;
  is_active: boolean;
}

interface AILimits {
  active_model: string; model_name: string; tier: string;
  limits: { rpd: number; rpm: number; tpm: number };
  usage: { requests_today: number; requests_last_minute: number; tokens_last_hour: number };
  utilization: { rpd_percent: number; rpm_percent: number; tpm_percent: number };
  pricing: { input_per_m_tokens: number; output_per_m_tokens: number };
}

interface ProductsData {
  top_products: { product_name: string; marque: string; clicks: number; avg_prix: number; estimated_revenue: number }[];
  top_brands: { marque: string; clicks: number; total_value: number; estimated_commission: number }[];
  clicks_by_day: { date: string; count: number }[];
}

type AdminTab = 'overview' | 'ai' | 'users' | 'products';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ---------------------------------------------------------------------------
// Shared components
// ---------------------------------------------------------------------------
function Sparkline({ data, color = '#a855f7' }: { data: { date: string; count: number }[]; color?: string }) {
  const max = Math.max(...data.map(d => d.count), 1);
  const w = 240; const h = 48; const n = data.length;
  const pts = data.map((d, i) => `${(i / (n - 1)) * w},${h - (d.count / max) * h}`).join(' ');
  return (
    <svg width={w} height={h} className="w-full" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <polyline fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" points={pts} />
      {data.map((d, i) => d.count > 0 && (
        <circle key={i} cx={(i / (n - 1)) * w} cy={h - (d.count / max) * h} r="3" fill={color} />
      ))}
    </svg>
  );
}

function KPI({ icon: Icon, label, value, sub, color = 'text-white' }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color?: string;
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{label}</span>
      </div>
      <p className={`text-2xl font-black ${color}`}>{value}</p>
      {sub && <p className="text-[10px] text-gray-600 mt-0.5">{sub}</p>}
    </div>
  );
}

function ProgressBar({ percent, color = 'bg-purple-500' }: { percent: number; color?: string }) {
  const clamped = Math.min(percent, 100);
  const barColor = percent > 80 ? 'bg-red-500' : percent > 50 ? 'bg-yellow-500' : color;
  return (
    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${clamped}%` }} />
    </div>
  );
}

function SectionCard({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white/5 border border-white/10 rounded-2xl ${className}`}>
      <div className="px-5 py-3 border-b border-white/5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function fmtDate(s: string): string {
  try { return new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return s; }
}

const TYPE_LABELS: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  analyze: { label: 'Analyse image', icon: ImageIcon, color: 'text-blue-400' },
  suggest: { label: 'Suggestions', icon: Zap, color: 'text-purple-400' },
  chat: { label: 'Chat styliste', icon: MessageCircle, color: 'text-pink-400' },
  score: { label: 'Score garde-robe', icon: BarChart3, color: 'text-emerald-400' },
  push_cron: { label: 'Push cron', icon: Clock, color: 'text-orange-400' },
};

const TIER_COLORS: Record<string, string> = {
  standard: 'text-blue-400 bg-blue-500/15',
  premium: 'text-amber-400 bg-amber-500/15',
  budget: 'text-emerald-400 bg-emerald-500/15',
  legacy: 'text-gray-400 bg-gray-500/15',
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function AdminPage() {
  const [adminKey, setAdminKey] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [keyInput, setKeyInput] = useState('');

  const [users, setUsers] = useState<UserRow[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [aiStats, setAiStats] = useState<AIStats | null>(null);
  const [aiModels, setAiModels] = useState<AIModel[]>([]);
  const [aiLimits, setAiLimits] = useState<AILimits | null>(null);
  const [productsData, setProductsData] = useState<ProductsData | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [changingModel, setChangingModel] = useState(false);

  const headers = useCallback(() => ({ 'x-admin-key': adminKey, 'Content-Type': 'application/json' }), [adminKey]);

  const fetchAll = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [usersRes, statsRes, aiStatsRes, modelsRes, limitsRes, productsRes] = await Promise.all([
        fetch(`${API_URL}/admin/users`, { headers: headers() }),
        fetch(`${API_URL}/admin/stats`, { headers: headers() }),
        fetch(`${API_URL}/admin/ai/stats`, { headers: headers() }),
        fetch(`${API_URL}/admin/ai/models`, { headers: headers() }),
        fetch(`${API_URL}/admin/ai/limits`, { headers: headers() }),
        fetch(`${API_URL}/admin/products/top`, { headers: headers() }),
      ]);
      if (usersRes.status === 403) { setError('Clé admin invalide'); setIsAuthenticated(false); return; }

      const [u, s, ai, m, l, p] = await Promise.all([
        usersRes.json(), statsRes.json(), aiStatsRes.json(),
        modelsRes.json(), limitsRes.json(), productsRes.json(),
      ]);
      setUsers(u.users);
      setStats(s);
      setAiStats(ai);
      setAiModels(m.models);
      setAiLimits(l);
      setProductsData(p);
    } catch { setError('Impossible de contacter le serveur'); }
    finally { setLoading(false); }
  }, [adminKey, headers]);

  useEffect(() => { if (isAuthenticated) fetchAll(); }, [isAuthenticated, fetchAll]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyInput.trim()) return;
    setAdminKey(keyInput.trim()); setIsAuthenticated(true);
  };

  const handleDelete = async (userId: number, name: string) => {
    if (!confirm(`Supprimer "${name}" et toutes ses données ? Action irréversible.`)) return;
    setDeletingId(userId);
    try {
      const res = await fetch(`${API_URL}/admin/users/${userId}`, { method: 'DELETE', headers: headers() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      alert(`${data.message} (${data.deleted_items} vêtement(s) supprimé(s))`);
      fetchAll();
    } catch { alert('Erreur lors de la suppression'); }
    finally { setDeletingId(null); }
  };

  const handleChangeModel = async (modelId: string) => {
    setChangingModel(true);
    try {
      const res = await fetch(`${API_URL}/admin/ai/model`, {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify({ model_id: modelId }),
      });
      if (!res.ok) { const d = await res.json(); alert(d.detail); return; }
      await fetchAll();
    } catch { alert('Erreur lors du changement de modèle'); }
    finally { setChangingModel(false); }
  };

  // Login screen
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

  const TABS: { id: AdminTab; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: BarChart3 },
    { id: 'ai', label: 'IA & Modèles', icon: Cpu },
    { id: 'users', label: 'Utilisateurs', icon: Users },
    { id: 'products', label: 'Produits & Affiliations', icon: ShoppingBag },
  ];

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-3 sticky top-0 z-10 bg-gray-950/90 backdrop-blur">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-green-400" />
            <h1 className="font-bold text-lg hidden sm:block">Admin Panel</h1>
          </div>
          <div className="flex items-center gap-1">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeTab === tab.id
                    ? 'bg-white/10 text-white'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                }`}>
                <tab.icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchAll} disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs hover:bg-white/10 transition-colors disabled:opacity-50">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={() => { setIsAuthenticated(false); setAdminKey(''); setKeyInput(''); }}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs hover:bg-red-500/20 transition-colors">
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ============================================================= */}
        {/* TAB: OVERVIEW */}
        {/* ============================================================= */}
        {activeTab === 'overview' && stats && (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <KPI icon={Users} label="Total users" value={stats.users.total}
                sub={`+${stats.users.new_7d} (7j) · ${stats.users.active_7d} actifs`} color="text-blue-400" />
              <KPI icon={TrendingUp} label="Nouveaux (30j)" value={stats.users.new_30d}
                color="text-emerald-400" />
              <KPI icon={Shirt} label="Vêtements" value={stats.wardrobe.total_items}
                sub={`~${stats.wardrobe.avg_per_user}/user · ${stats.wardrobe.wishlist} wishlist`} color="text-purple-400" />
              <KPI icon={MousePointerClick} label="Clics affiliés" value={stats.monetization.total_clicks}
                color="text-orange-400" />
              <KPI icon={Crown} label="Premium" value={stats.users.premium}
                sub={`${stats.users.total ? Math.round(stats.users.premium / stats.users.total * 100) : 0}% conv.`} color="text-amber-400" />
              <KPI icon={Euro} label="MRR" value={`${stats.monetization.mrr_premium} €`}
                sub={`+ ~${stats.monetization.estimated_revenue_eur} € affil.`} color="text-yellow-400" />
            </div>

            {/* AI quick stats (if loaded) */}
            {aiStats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KPI icon={Cpu} label="Requêtes IA total" value={fmtNum(aiStats.overview.total_requests)}
                  sub={`${aiStats.overview.requests_today} aujourd'hui`} color="text-cyan-400" />
                <KPI icon={Zap} label="Tokens consommés" value={fmtNum(aiStats.overview.total_tokens)}
                  sub={`${fmtNum(aiStats.overview.total_input_tokens)} in · ${fmtNum(aiStats.overview.total_output_tokens)} out`} color="text-violet-400" />
                <KPI icon={DollarSign} label="Coût IA estimé" value={`$${aiStats.overview.estimated_cost_usd}`}
                  sub={`Modèle : ${aiStats.active_model}`} color="text-green-400" />
                <KPI icon={AlertCircle} label="Taux erreur" value={`${aiStats.overview.error_rate}%`}
                  sub={`${aiStats.by_status['error'] || 0} erreurs`} color={aiStats.overview.error_rate > 5 ? 'text-red-400' : 'text-emerald-400'} />
              </div>
            )}

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <SectionCard title="Inscriptions — 14 derniers jours">
                <Sparkline data={stats.users.signups_by_day} />
                <div className="flex justify-between text-[10px] text-gray-600 mt-1">
                  <span>{stats.users.signups_by_day[0]?.date.slice(5)}</span>
                  <span>{stats.users.signups_by_day.at(-1)?.date.slice(5)}</span>
                </div>
              </SectionCard>

              {aiStats && (
                <SectionCard title="Requêtes IA — 14 derniers jours">
                  <Sparkline data={aiStats.requests_by_day} color="#06b6d4" />
                  <div className="flex justify-between text-[10px] text-gray-600 mt-1">
                    <span>{aiStats.requests_by_day[0]?.date.slice(5)}</span>
                    <span>{aiStats.requests_by_day.at(-1)?.date.slice(5)}</span>
                  </div>
                </SectionCard>
              )}
            </div>

            {/* Top brands */}
            <SectionCard title={`Top marques cliquées (${stats.monetization.top_brands.length})`}>
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
                            <span className="text-gray-400">{b.clicks} clics</span>
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
            </SectionCard>
          </>
        )}

        {/* ============================================================= */}
        {/* TAB: AI & MODELS */}
        {/* ============================================================= */}
        {activeTab === 'ai' && (
          <>
            {/* Rate limits gauges */}
            {aiLimits && (
              <SectionCard title={`Limites API — ${aiLimits.model_name}`}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { label: 'Requêtes / jour', used: aiLimits.usage.requests_today, limit: aiLimits.limits.rpd, pct: aiLimits.utilization.rpd_percent },
                    { label: 'Requêtes / min', used: aiLimits.usage.requests_last_minute, limit: aiLimits.limits.rpm, pct: aiLimits.utilization.rpm_percent },
                    { label: 'Tokens / heure', used: aiLimits.usage.tokens_last_hour, limit: aiLimits.limits.tpm, pct: aiLimits.utilization.tpm_percent },
                  ].map(g => (
                    <div key={g.label}>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-400">{g.label}</span>
                        <span className="font-bold">{fmtNum(g.used)} / {fmtNum(g.limit)}</span>
                      </div>
                      <ProgressBar percent={g.pct} />
                      <p className="text-[10px] text-gray-600 mt-1">{g.pct}% utilisé</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-white/5 flex gap-4 text-xs text-gray-500">
                  <span>Tier : <span className={`font-bold ${TIER_COLORS[aiLimits.tier]?.split(' ')[0] || 'text-gray-400'}`}>{aiLimits.tier}</span></span>
                  <span>Input : ${aiLimits.pricing.input_per_m_tokens}/M tokens</span>
                  <span>Output : ${aiLimits.pricing.output_per_m_tokens}/M tokens</span>
                </div>
              </SectionCard>
            )}

            {/* Model selector */}
            <SectionCard title="Sélection du modèle Gemini">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {aiModels.map(m => (
                  <button key={m.model_id} onClick={() => !m.is_active && handleChangeModel(m.model_id)}
                    disabled={changingModel}
                    className={`text-left p-4 rounded-xl border transition-all ${
                      m.is_active
                        ? 'bg-purple-500/15 border-purple-500/40'
                        : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/8'
                    } disabled:opacity-50`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm">{m.name}</span>
                      {m.is_active && <Check className="w-4 h-4 text-purple-400" />}
                    </div>
                    <p className="text-xs text-gray-400 mb-3">{m.description}</p>
                    <div className="flex flex-wrap gap-1.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${TIER_COLORS[m.tier] || 'text-gray-400 bg-white/10'}`}>
                        {m.tier}
                      </span>
                      <span className="text-[10px] text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">
                        ${m.input_price_per_m} / ${m.output_price_per_m} per M
                      </span>
                      <span className="text-[10px] text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">
                        {m.rpm_free} RPM · {m.rpd_free} RPD
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </SectionCard>

            {/* AI usage by type */}
            {aiStats && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <SectionCard title="Requêtes par type">
                  <div className="space-y-3">
                    {aiStats.by_type.map(t => {
                      const meta = TYPE_LABELS[t.type] || { label: t.type, icon: Activity, color: 'text-gray-400' };
                      const max = aiStats.by_type[0]?.count || 1;
                      return (
                        <div key={t.type} className="flex items-center gap-3">
                          <meta.icon className={`w-4 h-4 shrink-0 ${meta.color}`} />
                          <div className="flex-1">
                            <div className="flex justify-between text-sm mb-1">
                              <span>{meta.label}</span>
                              <span className="text-gray-400 font-mono text-xs">
                                {t.count} req · {fmtNum(t.input_tokens + t.output_tokens)} tok · ~{t.avg_duration_ms}ms
                              </span>
                            </div>
                            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${(t.count / max) * 100}%` }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {aiStats.by_type.length === 0 && <p className="text-gray-600 text-sm">Aucune requête enregistrée</p>}
                  </div>
                </SectionCard>

                <SectionCard title="Top utilisateurs IA">
                  <div className="space-y-2">
                    {aiStats.top_users.map((u, i) => (
                      <div key={u.user_id} className="flex items-center gap-3">
                        <span className="text-xs font-bold text-gray-500 w-4">{i + 1}</span>
                        <div className="flex-1 flex justify-between items-center">
                          <span className="text-sm font-medium">{u.prenom} <span className="text-gray-600 text-xs">#{u.user_id}</span></span>
                          <span className="text-xs text-gray-400">{u.requests} req · {fmtNum(u.total_tokens)} tok</span>
                        </div>
                      </div>
                    ))}
                    {aiStats.top_users.length === 0 && <p className="text-gray-600 text-sm">Aucune donnée</p>}
                  </div>
                </SectionCard>
              </div>
            )}

            {/* Status breakdown */}
            {aiStats && Object.keys(aiStats.by_status).length > 0 && (
              <SectionCard title="Statut des requêtes">
                <div className="flex gap-4">
                  {Object.entries(aiStats.by_status).map(([status, count]) => (
                    <div key={status} className="flex items-center gap-2">
                      {status === 'success' ? <Check className="w-4 h-4 text-emerald-400" /> :
                       status === 'error' ? <AlertCircle className="w-4 h-4 text-red-400" /> :
                       <AlertTriangle className="w-4 h-4 text-yellow-400" />}
                      <span className="text-sm">{status}</span>
                      <span className="text-sm font-bold">{count}</span>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}
          </>
        )}

        {/* ============================================================= */}
        {/* TAB: USERS */}
        {/* ============================================================= */}
        {activeTab === 'users' && (
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between">
              <h2 className="font-bold text-sm">Utilisateurs ({users.length})</h2>
              {loading && <RefreshCw className="w-4 h-4 animate-spin text-gray-500" />}
            </div>
            {users.length === 0 && !loading ? (
              <div className="p-12 text-center text-gray-500">Aucun utilisateur</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/5 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                      <th className="px-4 py-2.5 text-left">ID</th>
                      <th className="px-4 py-2.5 text-left">Prénom</th>
                      <th className="px-4 py-2.5 text-left">Email</th>
                      <th className="px-4 py-2.5 text-center">Items</th>
                      <th className="px-4 py-2.5 text-center">IA req</th>
                      <th className="px-4 py-2.5 text-center">Streak</th>
                      <th className="px-4 py-2.5 text-center">Premium</th>
                      <th className="px-4 py-2.5 text-center">Referrals</th>
                      <th className="px-4 py-2.5 text-left">Inscrit</th>
                      <th className="px-4 py-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id}
                        className={`border-b border-white/5 hover:bg-white/5 transition-colors ${deletingId === u.id ? 'opacity-40' : ''}`}>
                        <td className="px-4 py-2.5 text-xs text-gray-500 font-mono">#{u.id}</td>
                        <td className="px-4 py-2.5">
                          <span className="font-semibold text-sm">{u.prenom}</span>
                          <span className="text-[10px] text-gray-600 ml-1">{u.genre} · {u.age}a · {u.morphologie}</span>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-400">{u.email || '—'}</td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={`inline-flex items-center justify-center min-w-[24px] px-1.5 py-0.5 rounded-full text-[10px] font-bold ${u.clothing_count > 0 ? 'bg-purple-500/20 text-purple-300' : 'bg-white/5 text-gray-600'}`}>
                            {u.clothing_count}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span className="text-xs font-mono text-cyan-400">{u.ai_requests_total}</span>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {u.streak_current > 0 ? (
                            <span className="text-xs">
                              <Flame className="w-3 h-3 text-orange-400 inline mr-0.5" />
                              {u.streak_current}j
                              <span className="text-gray-600 ml-0.5">(max {u.streak_max})</span>
                            </span>
                          ) : <span className="text-gray-700 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {u.is_premium ? (
                            <span title={u.premium_until ? `jusqu'au ${fmtDate(u.premium_until)}` : ''}>
                              <Crown className="w-4 h-4 text-amber-400 inline-block" />
                            </span>
                          ) : <span className="text-gray-700 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-2.5 text-center text-xs">{u.referral_count || '—'}</td>
                        <td className="px-4 py-2.5 text-xs text-gray-400">{fmtDate(u.created_at)}</td>
                        <td className="px-4 py-2.5 text-right">
                          <button onClick={() => handleDelete(u.id, u.prenom)} disabled={deletingId === u.id}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/10 text-red-400 text-[10px] font-bold rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-50">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ============================================================= */}
        {/* TAB: PRODUCTS & AFFILIATIONS */}
        {/* ============================================================= */}
        {activeTab === 'products' && productsData && (
          <>
            {/* Clicks sparkline */}
            <SectionCard title="Clics affiliés — 14 derniers jours">
              <Sparkline data={productsData.clicks_by_day} color="#f97316" />
              <div className="flex justify-between text-[10px] text-gray-600 mt-1">
                <span>{productsData.clicks_by_day[0]?.date.slice(5)}</span>
                <span>{productsData.clicks_by_day.at(-1)?.date.slice(5)}</span>
              </div>
            </SectionCard>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Top brands with revenue */}
              <SectionCard title="Top marques (par clics)">
                {productsData.top_brands.length === 0 ? (
                  <p className="text-gray-600 text-sm">Aucun clic enregistré</p>
                ) : (
                  <div className="space-y-3">
                    {productsData.top_brands.map((b, i) => (
                      <div key={b.marque} className="flex items-center gap-3">
                        <span className="text-xs font-bold text-gray-500 w-4">{i + 1}</span>
                        <div className="flex-1">
                          <div className="flex justify-between text-sm mb-0.5">
                            <span className="font-medium">{b.marque}</span>
                            <span className="text-gray-400 text-xs">{b.clicks} clics</span>
                          </div>
                          <div className="flex justify-between text-[10px] text-gray-600">
                            <span>Volume : {b.total_value.toFixed(0)} €</span>
                            <span className="text-emerald-400">~{b.estimated_commission.toFixed(2)} € commission</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>

              {/* Top products */}
              <SectionCard title="Top produits recherchés">
                {productsData.top_products.length === 0 ? (
                  <p className="text-gray-600 text-sm">Aucun produit cliqué</p>
                ) : (
                  <div className="space-y-2">
                    {productsData.top_products.slice(0, 10).map((p, i) => (
                      <div key={`${p.product_name}-${p.marque}`} className="flex items-center gap-3">
                        <span className="text-xs font-bold text-gray-500 w-4">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium truncate mr-2">{p.product_name}</span>
                            <span className="text-gray-400 text-xs shrink-0">{p.clicks}x</span>
                          </div>
                          <div className="flex justify-between text-[10px] text-gray-600">
                            <span>{p.marque} · ~{p.avg_prix.toFixed(0)} €</span>
                            <span className="text-emerald-400">~{p.estimated_revenue.toFixed(2)} €</span>
                          </div>
                        </div>
                        <ChevronRight className="w-3 h-3 text-gray-700 shrink-0" />
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
