'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Crown, Sparkles, Zap, Check, Loader2, MessageCircle, Image as ImageIcon, Bell, Infinity } from 'lucide-react';
import { createCheckoutSession } from '@/lib/api';
import type { User } from '@/lib/types';

export interface UpgradeModalProps {
  user: User;
  onClose: () => void;
  /** Pre-selects a plan when opened (e.g. from a 429 upsell) */
  defaultPlan?: 'monthly' | 'yearly';
}

const FEATURES = [
  { icon: Infinity,      label: 'Suggestions IA illimitées' },
  { icon: MessageCircle, label: 'Chat styliste illimité' },
  { icon: ImageIcon,     label: 'Garde-robe illimitée (vs 20 pièces)' },
  { icon: Bell,          label: 'Suggestions push matinales' },
  { icon: Zap,           label: 'Suppression de fond automatique' },
  { icon: Sparkles,      label: 'Score de garde-robe IA complet' },
];

export default function UpgradeModal({ user, onClose, defaultPlan = 'monthly' }: UpgradeModalProps) {
  const [plan, setPlan] = useState<'monthly' | 'yearly'>(defaultPlan);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpgrade = async () => {
    setLoading(true);
    setError(null);
    try {
      const { checkout_url } = await createCheckoutSession(user.id, plan);
      window.location.href = checkout_url;
    } catch {
      setError('Erreur lors de la création du paiement. Réessaie.');
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="w-full max-w-md bg-gray-950 border border-white/10 rounded-3xl overflow-hidden shadow-2xl shadow-purple-500/20"
        >
          {/* Header gradient */}
          <div className="bg-linear-to-br from-purple-600 to-blue-600 px-6 pt-8 pb-10 relative overflow-hidden">
            <div className="absolute inset-0 opacity-20"
              style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 0%, transparent 60%)' }} />
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
                <Crown className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-black text-white mb-1">Passe à Premium</h2>
              <p className="text-sm text-white/70">
                Libère tout le potentiel de ton styliste IA
              </p>
            </div>
          </div>

          <div className="px-6 pt-5 pb-6 -mt-5 bg-gray-950 rounded-t-3xl relative z-10">

            {/* Plan toggle */}
            <div className="flex gap-3 mb-6">
              {(['monthly', 'yearly'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPlan(p)}
                  className={`flex-1 py-3 rounded-xl border text-sm font-bold transition-all relative ${
                    plan === p
                      ? 'bg-purple-500/20 border-purple-500/60 text-white'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
                  }`}
                >
                  {p === 'monthly' ? (
                    <>
                      <span className="block text-base">2,99 €</span>
                      <span className="block text-[11px] font-normal opacity-70">par mois</span>
                    </>
                  ) : (
                    <>
                      <span className="block text-base">24,99 €</span>
                      <span className="block text-[11px] font-normal opacity-70">par an</span>
                      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                        −30%
                      </span>
                    </>
                  )}
                </button>
              ))}
            </div>

            {/* Features list */}
            <ul className="space-y-2.5 mb-6">
              {FEATURES.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-3">
                  <div className="w-7 h-7 bg-purple-500/15 rounded-lg flex items-center justify-center shrink-0">
                    <Icon className="w-3.5 h-3.5 text-purple-400" />
                  </div>
                  <span className="text-sm text-gray-300">{label}</span>
                  <Check className="w-3.5 h-3.5 text-emerald-400 ml-auto shrink-0" />
                </li>
              ))}
            </ul>

            {error && (
              <p className="text-xs text-red-400 mb-4 text-center">{error}</p>
            )}

            {/* CTA */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleUpgrade}
              disabled={loading}
              className="w-full py-4 bg-linear-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-60 text-white font-bold rounded-2xl text-base transition-all shadow-lg shadow-purple-500/30 flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Crown className="w-5 h-5" />
                  Passer à Premium
                </>
              )}
            </motion.button>

            <p className="text-[11px] text-gray-600 text-center mt-3">
              Paiement sécurisé par Stripe · Annulation à tout moment
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
