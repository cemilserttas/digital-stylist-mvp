'use client';

import { motion } from 'framer-motion';
import { computeBadges, getDigitalStyleScore, getScoreTier, type UserStats } from '@/lib/badges';

interface BadgesSectionProps {
  stats: UserStats;
}

export default function BadgesSection({ stats }: BadgesSectionProps) {
  const badges = computeBadges(stats);
  const score = getDigitalStyleScore(stats);
  const tier = getScoreTier(score);
  const earnedCount = badges.filter(b => b.earned).length;

  return (
    <div className="space-y-6">
      {/* Score card */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-white">Digital Style Score</h3>
            <p className="text-xs text-gray-500">Ton niveau de styliste IA</p>
          </div>
          <div className="text-right">
            <p className={`text-2xl font-black ${tier.color}`}>{score}</p>
            <p className={`text-xs font-bold ${tier.color}`}>{tier.label}</p>
          </div>
        </div>

        {/* Progress bar to next tier */}
        {tier.next !== null && (
          <div>
            <div className="flex justify-between text-[10px] text-gray-600 mb-1">
              <span>{score} pts</span>
              <span>{tier.next} pts pour {tier.label === 'Bronze' ? 'Silver' : tier.label === 'Silver' ? 'Gold' : 'Diamond'}</span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(score / tier.next) * 100}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="h-full bg-linear-to-r from-purple-500 to-pink-500 rounded-full"
              />
            </div>
          </div>
        )}

        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          <div className="bg-white/5 rounded-xl p-2">
            <p className="text-lg font-black text-white">{stats.itemsCount}</p>
            <p className="text-[10px] text-gray-500">Vêtements</p>
          </div>
          <div className="bg-white/5 rounded-xl p-2">
            <p className="text-lg font-black text-orange-400">{stats.streakMax}j</p>
            <p className="text-[10px] text-gray-500">Streak record</p>
          </div>
          <div className="bg-white/5 rounded-xl p-2">
            <p className="text-lg font-black text-purple-400">{earnedCount}/{badges.length}</p>
            <p className="text-[10px] text-gray-500">Badges</p>
          </div>
        </div>
      </div>

      {/* Badges grid */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h3 className="text-sm font-bold text-gray-400 mb-4">
          Mes badges — {earnedCount} obtenus sur {badges.length}
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {badges.map((badge, i) => (
            <motion.div
              key={badge.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04, duration: 0.2 }}
              className={`relative flex items-center gap-3 p-3 rounded-xl border transition-all
                ${badge.earned
                  ? 'bg-white/8 border-white/15'
                  : 'bg-white/3 border-white/5 opacity-50'
                }`}
            >
              <span className={`text-2xl ${badge.earned ? '' : 'grayscale'}`}>
                {badge.emoji}
              </span>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-bold truncate ${badge.earned ? 'text-white' : 'text-gray-500'}`}>
                  {badge.label}
                </p>
                <p className="text-[10px] text-gray-600 truncate">{badge.description}</p>
                {/* Progress bar for unearned badges */}
                {!badge.earned && badge.progress !== undefined && badge.progress > 0 && (
                  <div className="mt-1 h-0.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500 rounded-full"
                      style={{ width: `${badge.progress * 100}%` }}
                    />
                  </div>
                )}
              </div>
              {badge.earned && (
                <span className="shrink-0 w-4 h-4 bg-green-500/20 rounded-full flex items-center justify-center">
                  <span className="text-[8px] text-green-400">✓</span>
                </span>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
