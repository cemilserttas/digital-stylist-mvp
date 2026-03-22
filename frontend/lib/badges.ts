/**
 * Badges/gamification — Digital Stylist
 * Computed client-side from user stats. No extra API call needed.
 */

export interface Badge {
  id: string;
  emoji: string;
  label: string;
  description: string;
  earned: boolean;
  /** 0-1 progress toward earning (for unearned badges) */
  progress?: number;
  tier: 'bronze' | 'silver' | 'gold' | 'diamond';
}

export interface UserStats {
  itemsCount: number;
  chatMessages: number;
  streakCurrent: number;
  streakMax: number;
  isPremium: boolean;
  referralCount: number;
}

export function computeBadges(stats: UserStats): Badge[] {
  const { itemsCount, chatMessages, streakCurrent, streakMax, isPremium, referralCount } = stats;

  return [
    {
      id: 'newbie',
      emoji: '🌱',
      label: 'Newbie',
      description: 'Premier vêtement ajouté à ta garde-robe',
      earned: itemsCount >= 1,
      progress: Math.min(1, itemsCount / 1),
      tier: 'bronze',
    },
    {
      id: 'style',
      emoji: '👗',
      label: 'Stylé(e)',
      description: '10 vêtements dans ta garde-robe',
      earned: itemsCount >= 10,
      progress: Math.min(1, itemsCount / 10),
      tier: 'bronze',
    },
    {
      id: 'collector',
      emoji: '🧥',
      label: 'Collectionneur',
      description: '20 pièces dans ta garde-robe',
      earned: itemsCount >= 20,
      progress: Math.min(1, itemsCount / 20),
      tier: 'silver',
    },
    {
      id: 'chatterbox',
      emoji: '💬',
      label: 'Bavard(e)',
      description: '20 messages envoyés au styliste',
      earned: chatMessages >= 20,
      progress: Math.min(1, chatMessages / 20),
      tier: 'bronze',
    },
    {
      id: 'streak3',
      emoji: '🔥',
      label: 'En feu',
      description: 'Streak de 3 jours consécutifs',
      earned: streakMax >= 3,
      progress: Math.min(1, streakMax / 3),
      tier: 'bronze',
    },
    {
      id: 'streak7',
      emoji: '⚡',
      label: 'Accroché(e)',
      description: 'Streak de 7 jours consécutifs',
      earned: streakMax >= 7,
      progress: Math.min(1, streakMax / 7),
      tier: 'silver',
    },
    {
      id: 'premium',
      emoji: '💎',
      label: 'Premium',
      description: 'Membre Premium Digital Stylist',
      earned: isPremium,
      tier: 'gold',
    },
    {
      id: 'ambassador',
      emoji: '🌟',
      label: 'Ambassadeur',
      description: 'A parrainé 3 ami(e)s',
      earned: referralCount >= 3,
      progress: Math.min(1, referralCount / 3),
      tier: 'gold',
    },
  ];
}

export function getDigitalStyleScore(stats: UserStats): number {
  let score = 0;
  score += Math.min(stats.itemsCount, 20) * 10;   // max 200 pts
  score += Math.min(stats.chatMessages, 50) * 3;   // max 150 pts
  score += Math.min(stats.streakMax, 30) * 5;      // max 150 pts
  score += stats.referralCount * 50;               // 50 pts/referral
  if (stats.isPremium) score += 100;
  return score;
}

export function getScoreTier(score: number): { label: string; color: string; next: number | null } {
  if (score >= 1000) return { label: 'Diamond', color: 'text-cyan-400', next: null };
  if (score >= 500)  return { label: 'Gold',    color: 'text-amber-400', next: 1000 };
  if (score >= 100)  return { label: 'Silver',  color: 'text-gray-300',  next: 500 };
  return               { label: 'Bronze',  color: 'text-amber-700', next: 100 };
}
