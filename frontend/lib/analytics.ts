/**
 * Analytics wrapper — PostHog
 * No-op gracefully if NEXT_PUBLIC_POSTHOG_KEY is not set.
 * All events are typed to prevent drift.
 */

type EventName =
  | 'user_signed_up'
  | 'user_logged_in'
  | 'onboarding_completed'
  | 'wardrobe_item_uploaded'
  | 'suggestion_viewed'
  | 'suggestion_refreshed'
  | 'product_link_clicked'
  | 'chat_message_sent'
  | 'chat_limit_reached'
  | 'paywall_seen'
  | 'upgrade_clicked'
  | 'upgrade_completed'
  | 'referral_code_copied'
  | 'referral_link_shared'
  | 'push_notifications_enabled'
  | 'tab_changed'
  | 'outfit_plan_created'
  | 'wardrobe_score_viewed'
  | 'share_look_clicked'
  | 'streak_milestone'
  | 'badge_earned';

type EventProperties = Record<string, string | number | boolean | null | undefined>;

let _posthog: typeof import('posthog-js').default | null = null;
let _initialized = false;

async function getPosthog() {
  if (_initialized) return _posthog;
  _initialized = true;

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com';

  if (!key || typeof window === 'undefined') return null;

  try {
    const { default: posthog } = await import('posthog-js');
    posthog.init(key, {
      api_host: host,
      capture_pageview: true,
      capture_pageleave: true,
      persistence: 'localStorage',
      autocapture: false, // manual events only — controlled tracking
    });
    _posthog = posthog;
    return posthog;
  } catch {
    return null;
  }
}

/** Identify a user after login/signup */
export async function identifyUser(userId: number, properties?: {
  prenom?: string;
  genre?: string;
  morphologie?: string;
  is_premium?: boolean;
  has_referral?: boolean;
}) {
  const ph = await getPosthog();
  if (!ph) return;
  ph.identify(String(userId), {
    prenom: properties?.prenom,
    genre: properties?.genre,
    morphologie: properties?.morphologie,
    is_premium: properties?.is_premium ?? false,
    has_referral_code: properties?.has_referral ?? false,
  });
}

/** Track a typed event */
export async function track(event: EventName, properties?: EventProperties) {
  const ph = await getPosthog();
  if (!ph) return;
  ph.capture(event, properties);
}

/** Update user properties without tracking an event */
export async function setUserProperties(properties: EventProperties) {
  const ph = await getPosthog();
  if (!ph) return;
  ph.setPersonProperties(properties);
}

/** Reset on logout */
export async function resetAnalytics() {
  const ph = await getPosthog();
  if (!ph) return;
  ph.reset();
}
