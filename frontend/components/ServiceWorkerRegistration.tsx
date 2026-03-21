'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => {
          // Check for updates every time the app loads
          reg.update().catch(() => {/* ignore update errors */});
        })
        .catch((err) => {
          // SW registration failure is non-fatal
          console.warn('Service worker registration failed:', err);
        });
    }
  }, []);

  return null;
}
