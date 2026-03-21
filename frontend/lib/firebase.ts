/**
 * Firebase client-side initialisation.
 *
 * All Firebase config is read from NEXT_PUBLIC_FIREBASE_* env vars.
 * When variables are absent the module exports null helpers so components
 * can gracefully degrade without crashing.
 *
 * Required env vars:
 *   NEXT_PUBLIC_FIREBASE_API_KEY
 *   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
 *   NEXT_PUBLIC_FIREBASE_PROJECT_ID
 *   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
 *   NEXT_PUBLIC_FIREBASE_APP_ID
 *   NEXT_PUBLIC_FIREBASE_VAPID_KEY  (for Web Push)
 */

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

const isConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.messagingSenderId &&
  VAPID_KEY
);

/**
 * Request notification permission and return the FCM registration token,
 * or null if Firebase is not configured / permission denied.
 */
export async function requestPushToken(): Promise<string | null> {
  if (!isConfigured || typeof window === 'undefined') return null;

  try {
    const { initializeApp, getApps } = await import('firebase/app');
    const { getMessaging, getToken } = await import('firebase/messaging');

    const app =
      getApps().length > 0
        ? getApps()[0]
        : initializeApp(firebaseConfig);

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    // Register (or reuse) the Firebase messaging SW and send it the config
    const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    swReg.active?.postMessage({ type: 'FIREBASE_CONFIG', config: firebaseConfig });
    // Also notify any waiting/installing SW
    (swReg.waiting ?? swReg.installing)?.postMessage({ type: 'FIREBASE_CONFIG', config: firebaseConfig });

    const messaging = getMessaging(app);
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swReg,
    });
    return token || null;
  } catch (err) {
    console.warn('FCM token request failed:', err);
    return null;
  }
}

export { isConfigured as isFirebaseConfigured };
