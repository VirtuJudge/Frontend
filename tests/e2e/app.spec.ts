import { test, expect } from '@playwright/test';

test.describe('Application Shell & Layouts', () => {
  test('public landing shell renders locally', async ({ page }) => {
    await page.goto('/');

    // Check title and brand
    await expect(page).toHaveTitle(/VirtuJudge/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Welcome to VirtuJudge',
    );

    // Check public navigation
    await expect(page.getByRole('link', { name: /Home/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /About/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Pricing/i })).toBeVisible();
  });

  test('unauthorized routes redirect safely to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*auth\/login.*redirect/);
    await expect(page.getByText('Welcome Back')).toBeVisible();
    await expect(page.getByRole('button', { name: /^login$/i })).toBeVisible();
  });

  test('authenticated workspace shell renders with sidebar layout', async ({
    page,
  }) => {
    await page.goto('/auth/login?redirect=%2Fdashboard');
    await page.getByPlaceholder(/enter your email/i).fill('alex@example.com');
    await page.getByPlaceholder(/enter your password/i).fill('password123');
    await page.getByRole('button', { name: /^login$/i }).click();

    await expect(page).toHaveURL(/.*dashboard/);

    // Check authenticated sidebar
    await expect(page.getByLabel('Application Navigation')).toBeVisible();
    await expect(page.getByText('Workspace')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /Hello, Dashboard/i }),
    ).toBeVisible();
  });

  test('navigation between public and authenticated layouts functions cleanly', async ({
    page,
  }) => {
    await page.goto('/auth/login');
    await page.getByPlaceholder(/enter your email/i).fill('alex@example.com');
    await page.getByPlaceholder(/enter your password/i).fill('password123');
    await page.getByRole('button', { name: /^login$/i }).click();
    await expect(page).toHaveURL(/.*dashboard/);

    await page.goto('/');
    const enterButton = page.getByRole('link', { name: /Enter Workspace/i });
    await enterButton.click();

    await expect(page).toHaveURL(/.*dashboard/);
    await expect(
      page.getByRole('heading', { name: /Hello, Dashboard/i }),
    ).toBeVisible();
  });

  test('access journey: team roster, safe Gmail delivery status, and invitations', async ({
    page,
  }) => {
    await page.goto('/auth/login');
    await page.getByPlaceholder(/enter your email/i).fill('alex@example.com');
    await page.getByPlaceholder(/enter your password/i).fill('password123');
    await page.getByRole('button', { name: /^login$/i }).click();
    await expect(page).toHaveURL(/.*dashboard/);

    await page.goto('/teams/01J6GZ2B000000000000000002');
    await expect(
      page.getByRole('heading', { name: /VirtuJudge Pitch Team/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /Team Members/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('table').first().getByText('Alex Presenter'),
    ).toBeVisible();
    await expect(page.getByText(/Pending Invitations/i)).toBeVisible();

    // Verify safe delivery status without exposing provider details
    await expect(page.getByText(/sent successfully/i)).toBeVisible();
    await expect(
      page.getByText(/dispatching via mail server/i),
    ).toBeVisible();
    await expect(page.getByText(/delivery failed/i)).toBeVisible();

    const bodyContent = await page.locator('body').innerText();
    expect(bodyContent).not.toMatch(/accepted_by_gmail/i);
    expect(bodyContent).not.toMatch(/smtp/i);
    expect(bodyContent).not.toMatch(/raw_response/i);
  });

  test('public invitation preview screen renders safely with masked email', async ({
    page,
  }) => {
    await page.goto('/invitations/mock_invite_token');
    await expect(
      page.getByRole('heading', { name: /Join VirtuJudge Pitch Team/i }),
    ).toBeVisible();
    await expect(page.getByText('a***@example.com')).toBeVisible();
    await expect(
      page.getByRole('link', { name: /Sign In to Accept Invitation/i }),
    ).toBeVisible();
  });
});
