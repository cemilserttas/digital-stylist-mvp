'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface StreakBadgeProps {
  streak: number;
  streakMax?: number;
}

export default function StreakBadge({ streak, streakMax }: StreakBadgeProps) {
  if (streak <= 0) return null;

  const isRecord = streakMax !== undefined && streak >= streakMax && streak > 1;
  const isMilestone = [3, 7, 14, 30].includes(streak);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        title={`${streak} jours consécutifs${streakMax ? ` · Record : ${streakMax}j` : ''}`}
        className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border transition-all cursor-default select-none
          ${isMilestone
            ? 'bg-orange-500/25 text-orange-300 border-orange-500/40 animate-pulse'
            : isRecord
            ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
            : 'bg-orange-500/15 text-orange-400 border-orange-500/20'
          }`}
      >
        🔥 {streak}j
      </motion.div>
    </AnimatePresence>
  );
}
