'use client';

import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  // Computed once at mount via lazy initializer — never mutated
  const [isIOS] = useState(() =>
    typeof window !== 'undefined' &&
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as unknown as { MSStream?: unknown }).MSStream
  );
  const [isStandalone] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches
  );

  useEffect(() => {
    if (isStandalone) return;

    const dismissed = localStorage.getItem('pwa_install_dismissed');
    if (dismissed) return;

    if (isIOS) {
      // Show iOS banner after 5s
      const t = setTimeout(() => setShowBanner(true), 5000);
      return () => clearTimeout(t);
    }

    // Chrome / Android — listen for native prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [isIOS, isStandalone]);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowBanner(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('pwa_install_dismissed', '1');
  };

  if (isStandalone || !showBanner) return null;

  return (
    <div className="fixed bottom-22 left-4 right-4 z-50 pointer-events-none flex justify-center">
      <div
        className="pointer-events-auto flex items-center gap-3 bg-gray-900 border border-white/10 rounded-2xl px-4 py-3 shadow-2xl max-w-sm w-full"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="shrink-0 w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center">
          <Download className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white">Installer l&apos;app</p>
          {isIOS ? (
            <p className="text-xs text-gray-400 leading-tight">
              Appuyez sur <span className="text-white font-medium">Partager</span> puis{' '}
              <span className="text-white font-medium">Sur l&apos;écran d&apos;accueil</span>
            </p>
          ) : (
            <p className="text-xs text-gray-400">Accès rapide depuis votre téléphone</p>
          )}
        </div>
        {!isIOS && (
          <button
            onClick={handleInstall}
            className="text-xs font-bold text-purple-400 hover:text-purple-300 transition-colors whitespace-nowrap"
          >
            Installer
          </button>
        )}
        <button
          onClick={handleDismiss}
          className="p-1 text-gray-600 hover:text-gray-400 transition-colors"
          aria-label="Fermer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
