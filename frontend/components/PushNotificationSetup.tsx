'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, BellOff, Loader2, Check } from 'lucide-react';
import { isFirebaseConfigured, requestPushToken } from '@/lib/firebase';
import { registerFcmToken, unregisterFcmToken } from '@/lib/api';
import type { User } from '@/lib/types';

export interface PushNotificationSetupProps {
  user: User;
  onUserUpdate: (updated: Partial<User>) => void;
}

export default function PushNotificationSetup({ user, onUserUpdate }: PushNotificationSetupProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derived from props + browser state — no useEffect needed
  const supported = typeof window !== 'undefined'
    && isFirebaseConfigured
    && 'Notification' in window
    && Notification.permission !== 'denied';

  const enabled = !!(user as User & { push_notifications_enabled?: boolean }).push_notifications_enabled;

  if (!supported) return null;

  const handleEnable = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await requestPushToken();
      if (!token) {
        setError('Permission refusée. Autorisez les notifications dans les réglages du navigateur.');
        return;
      }
      const weatherStr = typeof window !== 'undefined' ? localStorage.getItem('stylist_weather') : null;
      const city = weatherStr ? (JSON.parse(weatherStr) as { ville?: string })?.ville : undefined;
      await registerFcmToken(user.id, token, city);
      onUserUpdate({ push_notifications_enabled: true } as Partial<User>);
    } catch (err) {
      console.error(err);
      setError('Erreur lors de l\'activation. Réessaie.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    setLoading(true);
    setError(null);
    try {
      await unregisterFcmToken(user.id);
      onUserUpdate({ push_notifications_enabled: false } as Partial<User>);
    } catch (err) {
      console.error(err);
      setError('Erreur lors de la désactivation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-white">Suggestions matinales</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Reçois ton look du jour chaque matin à 7h30
          </p>
        </div>

        {loading ? (
          <div className="w-10 h-10 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
          </div>
        ) : enabled ? (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleDisable}
            className="flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 rounded-xl px-3 py-2 text-xs font-bold hover:bg-emerald-500/30 transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            Activé
          </motion.button>
        ) : (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleEnable}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl px-3 py-2 text-xs font-bold transition-colors"
          >
            <Bell className="w-3.5 h-3.5" />
            Activer
          </motion.button>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-400 flex items-center gap-1.5">
          <BellOff className="w-3 h-3 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
