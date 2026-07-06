import { test, expect } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

test.describe('Authentication', () => {
  test('login page renders correctly', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await expect(page.getByText('Sign in')).toBeVisible();
    await expect(page.getByPlaceholder('you@company.com')).toBeVisible();
    await expect(page.getByText('Continue with Google')).toBeVisible();
  });

  test('shows validation errors on empty submit', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText('Invalid email')).toBeVisible();
  });

  test('shows error on wrong credentials', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.getByPlaceholder('you@company.com').fill('wrong@test.com');
    await page.getByPlaceholder('••••••••').fill('WrongPass123!');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText(/Invalid credentials/i)).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Dashboard (authenticated)', () => {
  test.beforeEach(async ({ page }) => {
    // Inject tokens directly to bypass UI login
    await page.goto(`${BASE_URL}/login`);
    await page.evaluate((tokens) => {
      localStorage.setItem('access_token', tokens.access);
      localStorage.setItem('refresh_token', tokens.refresh);
    }, { access: process.env.E2E_ACCESS_TOKEN ?? '', refresh: process.env.E2E_REFRESH_TOKEN ?? '' });
  });

  test('dashboard shows stat cards', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await expect(page.getByText('Total Leads')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Conversion')).toBeVisible();
  });

  test('leads page loads and shows table', async ({ page }) => {
    await page.goto(`${BASE_URL}/leads`);
    await expect(page.getByText(/\d+ total leads/)).toBeVisible({ timeout: 15_000 });
  });
});
