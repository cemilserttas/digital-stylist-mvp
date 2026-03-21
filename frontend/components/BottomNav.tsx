'use client';

import { motion } from 'framer-motion';
import { Sparkles, Shirt, Heart, CalendarDays } from 'lucide-react';
import type { TabType } from '@/lib/types';

export interface BottomNavProps {
  activeTab: TabType;
  wardrobeCount: number;
  wishlistCount: number;
  onTabChange: (tab: TabType) => void;
}

const TABS: { key: TabType; icon: React.ElementType; label: string; countKey?: 'wardrobe' | 'wishlist' }[] = [
  { key: 'home',     icon: Sparkles,     label: 'Accueil' },
  { key: 'wardrobe', icon: Shirt,        label: 'Dressing', countKey: 'wardrobe' },
  { key: 'calendar', icon: CalendarDays, label: 'Planning' },
  { key: 'wishlist', icon: Heart,        label: 'Wishlist',  countKey: 'wishlist' },
];

export default function BottomNav({ activeTab, wardrobeCount, wishlistCount, onTabChange }: BottomNavProps) {
  const counts = { wardrobe: wardrobeCount, wishlist: wishlistCount };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-gray-950/80 backdrop-blur-2xl border-t border-white/10 pb-safe shadow-[0_-20px_40px_-15px_rgba(0,0,0,0.5)]">
      <div className="max-w-md mx-auto px-6 py-3 flex justify-between items-center relative">
        {TABS.map(({ key, icon: Icon, label, countKey }) => {
          const isActive = activeTab === key;
          const count = countKey ? counts[countKey] : undefined;
          return (
            <button
              key={key}
              onClick={() => !isActive && onTabChange(key)}
              className="relative flex flex-col items-center gap-1 p-2 group"
            >
              <div className="relative">
                <Icon className={`w-6 h-6 transition-all duration-300 ${isActive ? 'text-white scale-110' : 'text-gray-500 group-hover:text-gray-300'}`} />
                {isActive && (
                  <motion.div
                    layoutId="bottom-nav-indicator"
                    className="absolute -inset-2 bg-white/10 rounded-xl -z-10"
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  />
                )}
                {count !== undefined && count > 0 && (
                  <span className={`absolute -top-1 -right-2 text-[9px] font-black px-1.5 py-0.5 rounded-full ring-2 ring-gray-950 shadow-sm ${isActive ? 'bg-purple-500 text-white' : 'bg-gray-700 text-gray-300'}`}>
                    {count}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-semibold transition-colors ${isActive ? 'text-white' : 'text-gray-500'}`}>
                {label}
              </span>
              {isActive && (
                <div className="absolute -top-3 w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_10px_2px_rgba(255,255,255,0.5)]" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
