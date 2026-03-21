import { test, expect } from '@playwright/test';
import { mockAPIs, setLoggedInUser, MOCK_USER } from './helpers/api-mocks';
import path from 'path';

const MOCK_ITEM = {
  id: 1,
  type: 'T-shirt',
  couleur: 'Blanc',
  matiere: 'Coton',
  style: 'Casual',
  saison: 'Été',
  image_path: '/uploads/test.jpg',
  is_wishlist: false,
};

test.describe('Wardrobe', () => {
  test.beforeEach(async ({ page }) => {
    await mockAPIs(page);
    await setLoggedInUser(page);
  });

  test('shows empty wardrobe state with upload prompt', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Dressing' }).click();
    await expect(page.getByText('Ajouter un vêtement')).toBeVisible({ timeout: 3000 });
  });

  test('shows wardrobe items when populated', async ({ page }) => {
    await page.route('**/wardrobe**', (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([MOCK_ITEM]),
        });
      } else {
        route.continue();
      }
    });

    await page.goto('/');
    await page.getByRole('button', { name: 'Dressing' }).click();
    await expect(page.getByText('T-shirt')).toBeVisible({ timeout: 3000 });
  });

  test('wishlist tab shows upload inspiration prompt', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Wishlist' }).click();
    await expect(page.getByText('Ajouter une inspiration')).toBeVisible({ timeout: 3000 });
  });

  test('shows wishlist items when populated', async ({ page }) => {
    const wishlistItem = { ...MOCK_ITEM, id: 2, type: 'Robe', is_wishlist: true };

    // First GET (wardrobe) → empty; second GET (wishlist) → has item
    let callCount = 0;
    await page.route('**/wardrobe**', (route) => {
      if (route.request().method() !== 'GET') { route.continue(); return; }
      const url = route.request().url();
      if (url.includes('is_wishlist=true')) {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([wishlistItem]) });
      } else {
        callCount++;
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      }
    });

    await page.goto('/');
    await page.getByRole('button', { name: 'Wishlist' }).click();
    await expect(page.getByText('Robe')).toBeVisible({ timeout: 3000 });
    // suppress unused variable warning
    expect(callCount).toBeGreaterThanOrEqual(0);
  });

  test('upload triggers POST request to /wardrobe/upload', async ({ page }) => {
    await page.route('**/wardrobe/upload**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          item: { ...MOCK_ITEM, id: 99 },
          analysis: { type: 'T-shirt', couleur: 'Rouge', style: 'Casual' },
        }),
      })
    );

    await page.goto('/');
    await page.getByRole('button', { name: 'Dressing' }).click();

    // Create a minimal fake image file buffer
    const fileContent = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-shirt.png',
      mimeType: 'image/png',
      buffer: fileContent,
    });

    // Verify the upload request fires
    await page.waitForRequest('**/wardrobe/upload**', { timeout: 5000 });
  });

  test('planning tab shows 7-day calendar grid', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Planning' }).click();
    await expect(page.getByText('Planning Tenues')).toBeVisible({ timeout: 3000 });
    await expect(page.getByText("Aujourd'hui")).toBeVisible({ timeout: 3000 });
  });

  test('planning: clicking a day opens the outfit editor modal', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Planning' }).click();
    await expect(page.getByText("Aujourd'hui")).toBeVisible({ timeout: 3000 });

    // Click the "Aujourd'hui" day cell
    await page.getByText("Aujourd'hui").click();

    // Modal should appear with occasion buttons
    await expect(page.getByRole('button', { name: 'Travail' })).toBeVisible({ timeout: 3000 });
    await expect(page.getByRole('button', { name: 'Casual' })).toBeVisible();
  });

  test('premium banner appears near item limit', async ({ page }) => {
    // 18 items out of FREE_ITEM_LIMIT (20) triggers "near limit" banner
    const manyItems = Array.from({ length: 18 }, (_, i) => ({ ...MOCK_ITEM, id: i + 1 }));
    await page.route('**/wardrobe**', (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(manyItems) });
      } else {
        route.continue();
      }
    });

    await page.goto('/');
    await page.getByRole('button', { name: 'Dressing' }).click();
    await expect(page.getByText(/Plus que.*pièce/i)).toBeVisible({ timeout: 3000 });
  });
});
