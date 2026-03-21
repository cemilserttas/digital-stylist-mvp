import { test, expect } from '@playwright/test';
import { mockAPIs, setLoggedInUser, MOCK_USER } from './helpers/api-mocks';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await mockAPIs(page);
    await setLoggedInUser(page);
  });

  test('shows main app header when authenticated', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('DIGITALSTYLIST')).toBeVisible();
    await expect(page.getByText(MOCK_USER.prenom)).toBeVisible();
  });

  test('bottom nav shows all 4 tabs', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Accueil' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Dressing' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Planning' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Wishlist' })).toBeVisible();
  });

  test('navigates to Dressing tab', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Dressing' }).click();
    await expect(page.getByText('Ajouter un vêtement')).toBeVisible({ timeout: 3000 });
  });

  test('navigates to Planning tab', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Planning' }).click();
    await expect(page.getByText('Planning Tenues')).toBeVisible({ timeout: 3000 });
  });

  test('navigates to Wishlist tab', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Wishlist' }).click();
    await expect(page.getByText('Ajouter une inspiration')).toBeVisible({ timeout: 3000 });
  });

  test('settings button opens settings panel', async ({ page }) => {
    await page.goto('/');
    await page.getByTitle('Paramètres').click();
    // Settings panel renders UserSettings with the user's name
    await expect(page.getByText(/Paramètres|Profil|Mon compte/i)).toBeVisible({ timeout: 3000 });
  });

  test('logout clears session and shows auth form', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(MOCK_USER.prenom)).toBeVisible();

    await page.getByTitle('Déconnexion').click();

    await expect(page.getByRole('button', { name: 'Connexion' })).toBeVisible({ timeout: 3000 });
    const stored = await page.evaluate(() => localStorage.getItem('stylist_user'));
    expect(stored).toBeNull();
  });

  test('home tab is active on load', async ({ page }) => {
    await page.goto('/');
    // Accueil button should have the active styling (white text)
    const homeBtn = page.getByRole('button', { name: 'Accueil' });
    await expect(homeBtn).toBeVisible();
    // The active indicator dot is only rendered for the active tab
    await expect(homeBtn.locator('div.absolute.-top-3')).toBeVisible();
  });
});
