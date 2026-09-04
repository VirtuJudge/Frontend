import { test, expect } from '@playwright/test';

test.describe('Application Shell & Layouts', () => {
  test('public landing shell renders locally', async ({ page }) => {
    await page.goto('/');

    // Check title and brand
    await expect(page).toHaveTitle(/VirtuJudge/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Hello, Home');

    // Check public header and navigation
    await expect(page.getByLabel('Public Navigation')).toBeVisible();
    await expect(page.getByRole('contentinfo')).toBeVisible();
  });

  test('authenticated workspace shell renders with sidebar layout', async ({ page }) => {
    await page.goto('/dashboard');

    // Check authenticated sidebar
    await expect(page.getByLabel('Application Navigation')).toBeVisible();
    await expect(page.getByText('Workspace')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Hello, Dashboard/i })).toBeVisible();
  });

  test('navigation between public and authenticated layouts functions cleanly', async ({ page }) => {
    await page.goto('/');

    const enterButton = page.getByRole('link', { name: /Enter Workspace/i });
    await enterButton.click();

    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.getByRole('heading', { name: /Hello, Dashboard/i })).toBeVisible();
  });
});
