import type { Page } from '@playwright/test';

export const MOCK_USER = {
  id: 1,
  prenom: 'TestUser',
  morphologie: 'RECTANGLE',
  genre: 'Homme',
  age: 25,
  style_prefere: 'Casual',
  is_premium: false,
  referral_code: 'REF_TESTUSER_ABCD',
  referral_count: 0,
};

export const MOCK_TOKEN = 'mock-jwt-token-for-testing';

export async function mockAPIs(page: Page) {
  // Auth endpoints
  await page.route('**/users/login', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ token: MOCK_TOKEN, user: MOCK_USER }),
    })
  );

  await page.route('**/users/create', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ token: MOCK_TOKEN, user: MOCK_USER }),
    })
  );

  // Wardrobe
  await page.route('**/wardrobe**', (route) => {
    if (route.request().method() === 'GET') {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    } else {
      route.continue();
    }
  });

  // Suggestions
  await page.route('**/suggestions**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ greeting: `Bonjour ${MOCK_USER.prenom} !`, suggestions: [] }),
    })
  );

  // Outfit plans
  await page.route('**/outfit-plans**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ plans: [] }),
    })
  );

  // External: weather
  await page.route('**/open-meteo.com/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        current: {
          temperature_2m: 20,
          relative_humidity_2m: 50,
          wind_speed_10m: 10,
          weather_code: 0,
          uv_index: 3,
        },
        daily: {
          time: ['2026-03-21', '2026-03-22', '2026-03-23', '2026-03-24', '2026-03-25', '2026-03-26', '2026-03-27'],
          weather_code: [0, 0, 61, 3, 80, 95, 0],
          temperature_2m_max: [22, 21, 18, 16, 14, 12, 20],
          temperature_2m_min: [14, 13, 10, 8, 6, 5, 12],
          precipitation_probability_max: [10, 20, 80, 30, 60, 90, 15],
          uv_index_max: [4, 3, 1, 2, 0, 0, 5],
        },
      }),
    })
  );

  // External: reverse geocoding
  await page.route('**/nominatim.openstreetmap.org/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ address: { city: 'Paris' } }),
    })
  );

  // External: IP geolocation fallback
  await page.route('**/ipapi.co/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ latitude: 48.8566, longitude: 2.3522 }),
    })
  );
}

/** Pre-populate localStorage so the app starts in an authenticated state. */
export async function setLoggedInUser(page: Page) {
  await page.addInitScript(
    ({ user, token }) => {
      localStorage.setItem('stylist_user', JSON.stringify(user));
      localStorage.setItem('stylist_token', token);
      localStorage.setItem('stylist_suggestions', JSON.stringify([]));
    },
    { user: MOCK_USER, token: MOCK_TOKEN }
  );
}
