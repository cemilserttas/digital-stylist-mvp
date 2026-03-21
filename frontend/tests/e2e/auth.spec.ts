import { test, expect } from '@playwright/test';
import { mockAPIs, MOCK_USER, MOCK_TOKEN } from './helpers/api-mocks';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await mockAPIs(page);
  });

  test('shows login form for unauthenticated users', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('DIGITALSTYLIST')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Connexion' })).toBeVisible();
    await expect(page.getByRole('button', { name: "S'inscrire" })).toBeVisible();
  });

  test('login mode is shown by default', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByPlaceholder('Entrez votre prénom')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Se connecter' })).toBeVisible();
  });

  test('login with valid credentials shows main app', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder('Entrez votre prénom').fill(MOCK_USER.prenom);
    await page.getByPlaceholder('Votre mot de passe').fill('test1234');
    await page.getByRole('button', { name: 'Se connecter' }).click();

    await expect(page.getByText(MOCK_USER.prenom)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('DIGITALSTYLIST')).toBeVisible();
  });

  test('login stores token in localStorage', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder('Entrez votre prénom').fill(MOCK_USER.prenom);
    await page.getByPlaceholder('Votre mot de passe').fill('test1234');
    await page.getByRole('button', { name: 'Se connecter' }).click();

    await expect(page.getByText(MOCK_USER.prenom)).toBeVisible({ timeout: 5000 });
    const token = await page.evaluate(() => localStorage.getItem('stylist_token'));
    expect(token).toBe(MOCK_TOKEN);
  });

  test('shows error message for unknown user', async ({ page }) => {
    await page.route('**/users/login', (route) =>
      route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Utilisateur introuvable' }),
      })
    );

    await page.goto('/');
    await page.getByPlaceholder('Entrez votre prénom').fill('Inconnu');
    await page.getByPlaceholder('Votre mot de passe').fill('wrong');
    await page.getByRole('button', { name: 'Se connecter' }).click();

    await expect(page.getByText(/Aucun compte trouvé/)).toBeVisible({ timeout: 3000 });
  });

  test('can switch to register mode', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: "S'inscrire" }).click();
    await expect(page.getByPlaceholder('Votre prénom')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Suivant →' })).toBeVisible();
  });

  test('register step 1: validates empty name', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: "S'inscrire" }).click();

    const nextBtn = page.getByRole('button', { name: 'Suivant →' });
    await expect(nextBtn).toBeDisabled();
  });

  test('register step 1: validates short password', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: "S'inscrire" }).click();

    await page.getByPlaceholder('Votre prénom').fill('Alice');
    await page.getByPlaceholder('Choisissez un mot de passe').fill('abc'); // < 4 chars
    await expect(page.getByRole('button', { name: 'Suivant →' })).toBeDisabled();
  });

  test('register step 1: referral code is auto-uppercased', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: "S'inscrire" }).click();

    const input = page.getByPlaceholder('REF_PRENOM_XXXX');
    await input.fill('ref_alice_abcd');
    await expect(input).toHaveValue('REF_ALICE_ABCD');
  });

  test('register: completes full 3-step flow', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: "S'inscrire" }).click();

    // Step 1
    await page.getByPlaceholder('Votre prénom').fill(MOCK_USER.prenom);
    await page.getByPlaceholder('Choisissez un mot de passe').fill('test1234');
    await page.getByRole('button', { name: 'Suivant →' }).click();

    // Step 2: age slider
    await expect(page.getByText('Âge')).toBeVisible();
    await page.getByRole('button', { name: 'Suivant →' }).click();

    // Step 3: morphology
    await expect(page.getByText('Morphologie')).toBeVisible();
    await page.getByRole('button', { name: 'Créer mon profil' }).click();

    await expect(page.getByText(MOCK_USER.prenom)).toBeVisible({ timeout: 5000 });
  });

  test('register: sends referral_code in create request', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: "S'inscrire" }).click();

    await page.getByPlaceholder('Votre prénom').fill(MOCK_USER.prenom);
    await page.getByPlaceholder('Choisissez un mot de passe').fill('test1234');
    await page.getByPlaceholder('REF_PRENOM_XXXX').fill('REF_ALICE_ABCD');
    await page.getByRole('button', { name: 'Suivant →' }).click();
    await page.getByRole('button', { name: 'Suivant →' }).click();

    const [request] = await Promise.all([
      page.waitForRequest('**/users/create'),
      page.getByRole('button', { name: 'Créer mon profil' }).click(),
    ]);

    const body = request.postDataJSON();
    expect(body.referral_code).toBe('REF_ALICE_ABCD');
  });
});
