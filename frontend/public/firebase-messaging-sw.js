// Firebase Cloud Messaging service worker — required for background push on Chrome.
// Firebase SDK is loaded via importScripts at runtime using the version configured here.
// This file must live at /firebase-messaging-sw.js (root of the public directory).

// Read config injected by the app at token registration time via postMessage,
// or fall back to well-known names so the SW can be pre-cached as a static file.
// The real config values are set via NEXT_PUBLIC_FIREBASE_* env vars in the main app;
// we use self.__FIREBASE_CONFIG__ which the app writes via a postMessage on first load.

let _app = null;
let _messaging = null;

self.addEventListener('message', (event) => {
  if (event.data?.type === 'FIREBASE_CONFIG') {
    initFirebase(event.data.config);
  }
});

function initFirebase(config) {
  if (_messaging) return; // already initialised
  if (!config?.apiKey) return;

  try {
    importScripts('https://www.gstatic.com/firebasejs/11.0.0/firebase-app-compat.js');
    importScripts('https://www.gstatic.com/firebasejs/11.0.0/firebase-messaging-compat.js');

    _app = firebase.initializeApp(config);  // eslint-disable-line no-undef
    _messaging = firebase.messaging();       // eslint-disable-line no-undef

    // Handle background messages (app is closed / in background)
    _messaging.onBackgroundMessage((payload) => {
      const title = payload.notification?.title || 'Digital Stylist';
      const options = {
        body: payload.notification?.body || 'Ton look du jour est prêt !',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        vibrate: [200, 100, 200],
        data: payload.data || {},
        actions: [
          { action: 'open', title: 'Voir mon look' },
          { action: 'dismiss', title: 'Plus tard' },
        ],
      };
      self.registration.showNotification(title, options);
    });
  } catch (err) {
    console.warn('[firebase-messaging-sw] init failed:', err);
  }
}
