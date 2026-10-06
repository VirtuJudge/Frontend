import { test, expect, Page } from '@playwright/test';
import { createSyntheticJwt } from '../../lib/auth/jwt';
import { AUTH_COOKIE_NAME, FALLBACK_SESSION_COOKIE_NAME } from '../../lib/auth/middleware';

const MOCK_USER_ID = '01J6GZ2B000000000000000001';
const MOCK_TEAM_ID = '01J6GZ2B000000000000000002';
const MOCK_PROJECT_ID = '01J6GZ2B000000000000000003';
const MOCK_SESSION_ID = '01J6GZ2B000000000000000004';

const MOCK_JWT = createSyntheticJwt({
  sub: MOCK_USER_ID,
  email: 'alex@example.com',
  name: 'Alex Presenter',
  display_name: 'Alex Presenter',
});

async function setupMockNetwork(page: Page) {
  // Supabase Auth endpoints
  await page.route('**/auth/v1/token*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: MOCK_JWT,
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'mock-refresh-token',
        user: {
          id: MOCK_USER_ID,
          email: 'alex@example.com',
          user_metadata: { display_name: 'Alex Presenter' },
        },
      }),
    });
  });

  await page.route('**/auth/v1/user*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: MOCK_USER_ID,
        email: 'alex@example.com',
        user_metadata: { display_name: 'Alex Presenter' },
      }),
    });
  });

  // Current user endpoint (/api/v1/me and /api/v1/users/me)
  const userPayload = {
    id: MOCK_USER_ID,
    email: 'alex@example.com',
    display_name: 'Alex Presenter',
    created_at: '2026-01-01T00:00:00Z',
  };

  await page.route('**/api/v1/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(userPayload),
    });
  });

  await page.route('**/api/v1/users/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(userPayload),
    });
  });

  // Teams list
  await page.route('**/api/v1/teams', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: [
          {
            id: MOCK_TEAM_ID,
            name: 'VirtuJudge Pitch Team',
            role: 'owner',
            member_count: 2,
            created_at: '2026-01-01T00:00:00Z',
            version: 1,
          },
        ],
        has_more: false,
      }),
    });
  });

  // Specific team
  await page.route(`**/api/v1/teams/${MOCK_TEAM_ID}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: MOCK_TEAM_ID,
        name: 'VirtuJudge Pitch Team',
        role: 'owner',
        member_count: 2,
        created_at: '2026-01-01T00:00:00Z',
        version: 1,
      }),
    });
  });

  // Team members
  await page.route(`**/api/v1/teams/${MOCK_TEAM_ID}/members*`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: [
          {
            team_id: MOCK_TEAM_ID,
            user_id: MOCK_USER_ID,
            role: 'owner',
            display_name: 'Alex Presenter',
            joined_at: '2026-01-01T00:00:00Z',
            version: 1,
          },
        ],
        has_more: false,
      }),
    });
  });

  // Team invitations with safe delivery statuses
  await page.route(`**/api/v1/teams/${MOCK_TEAM_ID}/invitations*`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: [
          {
            id: 'inv-1',
            team_id: MOCK_TEAM_ID,
            email: 'delivered@example.com',
            role: 'member',
            status: 'pending',
            delivery_status: 'accepted_by_gmail',
            delivery_attempts: 1,
            created_at: '2026-01-01T00:00:00Z',
            expires_at: '2026-12-31T23:59:59Z',
            version: 1,
          },
          {
            id: 'inv-2',
            team_id: MOCK_TEAM_ID,
            email: 'dispatching@example.com',
            role: 'member',
            status: 'pending',
            delivery_status: 'queued',
            delivery_attempts: 0,
            created_at: '2026-01-01T00:00:00Z',
            expires_at: '2026-12-31T23:59:59Z',
            version: 1,
          },
          {
            id: 'inv-3',
            team_id: MOCK_TEAM_ID,
            email: 'failed@example.com',
            role: 'member',
            status: 'pending',
            delivery_status: 'failed',
            delivery_attempts: 3,
            created_at: '2026-01-01T00:00:00Z',
            expires_at: '2026-12-31T23:59:59Z',
            version: 1,
          },
        ],
        has_more: false,
      }),
    });
  });

  // Public invitation preview
  await page.route('**/api/v1/invitations/mock_invite_token', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        team_name: 'VirtuJudge Pitch Team',
        email_masked: 'a***@example.com',
        expires_at: '2026-12-31T23:59:59Z',
        role: 'member',
      }),
    });
  });

  // Projects list for team
  await page.route(`**/api/v1/teams/${MOCK_TEAM_ID}/projects*`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: [
          {
            id: MOCK_PROJECT_ID,
            team_id: MOCK_TEAM_ID,
            name: 'Pitch Deck Alpha',
            created_by: MOCK_USER_ID,
            created_at: '2026-01-01T00:00:00Z',
            version: 1,
          },
        ],
        has_more: false,
      }),
    });
  });

  // Project details
  await page.route(`**/api/v1/projects/${MOCK_PROJECT_ID}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: MOCK_PROJECT_ID,
        team_id: MOCK_TEAM_ID,
        name: 'Pitch Deck Alpha',
        created_by: MOCK_USER_ID,
        created_at: '2026-01-01T00:00:00Z',
        version: 1,
      }),
    });
  });

  // Project assets
  await page.route(`**/api/v1/projects/${MOCK_PROJECT_ID}/assets*`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: [],
        has_more: false,
      }),
    });
  });
}

async function authenticateContext(page: Page) {
  await setupMockNetwork(page);
  await page.context().addCookies([
    {
      name: AUTH_COOKIE_NAME,
      value: MOCK_JWT,
      domain: 'localhost',
      path: '/',
    },
    {
      name: FALLBACK_SESSION_COOKIE_NAME,
      value: MOCK_JWT,
      domain: 'localhost',
      path: '/',
    },
  ]);
}

test.describe('Application Shell & Layouts', () => {
  test('public landing shell renders locally and protected root redirects to login', async ({
    page,
  }) => {
    // Public landing page
    await page.goto('/home');
    await expect(page).toHaveTitle(/VirtuJudge/);
    await expect(
      page.getByRole('heading', { name: 'Be the next one on stage!' }),
    ).toBeVisible();

    // Public navigation
    await expect(page.getByRole('banner').getByRole('link', { name: 'Home' })).toBeVisible();
    await expect(page.getByRole('banner').getByRole('link', { name: 'Pricing' })).toBeVisible();
    await expect(page.getByRole('banner').getByRole('link', { name: /Try Now/i })).toBeVisible();

    // Verify root route is protected and redirects to login
    await page.goto('/');
    await expect(page).toHaveURL(/.*auth\/login/);
  });

  test('unauthorized routes redirect safely to login', async ({ page }) => {
    await page.goto('/me');
    await expect(page).toHaveURL(/.*auth\/login.*redirect/);
    await expect(page.getByText('Welcome Back')).toBeVisible();
    await expect(page.getByRole('button', { name: /^login$/i })).toBeVisible();
  });

  test('authenticated workspace shell renders with profile and action buttons', async ({
    page,
  }) => {
    await setupMockNetwork(page);

    await page.goto('/auth/login?redirect=%2Fme');
    await page.getByPlaceholder(/enter your email/i).fill('alex@example.com');
    await page.getByPlaceholder(/enter your password/i).fill('password123');
    await page.getByRole('button', { name: /^login$/i }).click();

    await expect(page).toHaveURL(/.*me/);

    // Verify authenticated user greeting and profile
    await expect(page.getByRole('heading', { name: 'Alex Presenter' })).toBeVisible();
    await expect(page.getByText('alex@example.com')).toBeVisible();
    await expect(page.getByRole('button', { name: /logout/i })).toBeVisible();
    await expect(page.getByRole('link', { name: 'My Teams' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Start a new session/i })).toBeVisible();
  });

  test('navigation between public and authenticated layouts functions cleanly', async ({
    page,
  }) => {
    await authenticateContext(page);

    await page.goto('/home');
    await expect(
      page.getByRole('heading', { name: 'Be the next one on stage!' }),
    ).toBeVisible();

    // Navigate to authenticated workspace
    await page.goto('/me');
    await expect(page).toHaveURL(/.*me/);
    await expect(page.getByRole('heading', { name: 'Alex Presenter' })).toBeVisible();
  });

  test('access journey: team roster, safe Gmail delivery status, and invitations', async ({
    page,
  }) => {
    await authenticateContext(page);

    await page.goto(`/teams/${MOCK_TEAM_ID}`);
    await expect(page.getByText('VirtuJudge Pitch Team')).toBeVisible();
    await expect(page.getByText('Members')).toBeVisible();
    await expect(page.getByText('Alex Presenter')).toBeVisible();
    await expect(page.getByText('Invitations')).toBeVisible();
    await expect(page.getByText('delivered@example.com')).toBeVisible();

    const bodyContent = await page.locator('body').innerText();
    expect(bodyContent).not.toMatch(/accepted_by_gmail/i);
    expect(bodyContent).not.toMatch(/raw_response/i);
  });

  test('public invitation preview screen renders safely with masked email', async ({
    page,
  }) => {
    await setupMockNetwork(page);

    await page.goto('/invitations/mock_invite_token');
    await expect(
      page.getByRole('heading', { name: /Join VirtuJudge Pitch Team/i }),
    ).toBeVisible();
    await expect(page.getByText('a***@example.com')).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Sign In' }),
    ).toBeVisible();
  });

  test('session preparation and upload journey', async ({ page }) => {
    await authenticateContext(page);

    await page.goto(`/projects/${MOCK_PROJECT_ID}/session/prepare`);
    await expect(page.getByText('Configure Session Settings')).toBeVisible();
    await expect(page.getByText('Show timer')).toBeVisible();
    await expect(page.getByText('Allow pauses')).toBeVisible();
    await expect(page.getByRole('button', { name: /^start$/i })).toBeVisible();
  });

  test('Q&A journey with grounded questions', async ({ page }) => {
    await authenticateContext(page);

    await page.route(`**/api/v1/practice-sessions/${MOCK_SESSION_ID}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: MOCK_SESSION_ID,
          project_id: MOCK_PROJECT_ID,
          team_id: MOCK_TEAM_ID,
          state: 'questions_ready',
          version: 1,
          created_by: MOCK_USER_ID,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        }),
      });
    });

    await page.route(`**/api/v1/practice-sessions/${MOCK_SESSION_ID}/qa`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'qa-1',
          practice_session_id: MOCK_SESSION_ID,
          state: 'in_progress',
          current_question_id: 'q-1',
          follow_up_count: 0,
          version: 1,
          questions: [
            {
              id: 'q-1',
              practice_session_id: MOCK_SESSION_ID,
              kind: 'primary',
              position: 1,
              text: 'How does your solution defend against existing competitors?',
              reason: 'Moat was weakly articulated in slide 5',
              rubric_dimension: 'competition',
              evidence_ids: ['ev-1'],
              state: 'active',
            },
          ],
          answers: [],
        }),
      });
    });

    await page.goto(`/sessions/${MOCK_SESSION_ID}/qa`);
    await expect(
      page.getByText('How does your solution defend against existing competitors?'),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Start recording answer' }),
    ).toBeVisible();
  });

  test('report and retry journey: error recovery and evaluation display', async ({
    page,
  }) => {
    await authenticateContext(page);

    await page.route(`**/api/v1/practice-sessions/${MOCK_SESSION_ID}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: MOCK_SESSION_ID,
          project_id: MOCK_PROJECT_ID,
          team_id: MOCK_TEAM_ID,
          state: 'completed',
          version: 2,
          created_by: MOCK_USER_ID,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        }),
      });
    });

    let simulateFailure = true;
    await page.route(`**/api/v1/practice-sessions/${MOCK_SESSION_ID}/report`, async (route) => {
      if (simulateFailure) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Evaluation backend temporarily unavailable' }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            schema_version: 1,
            report_id: 'rep-1',
            practice_session_id: MOCK_SESSION_ID,
            evaluation_id: 'eval-1',
            title: 'Pitch Deck Alpha Evaluation',
            executive_summary: 'Exceptional pitch presentation with strong delivery.',
            overall_score: 0.88,
            score_components: [],
            team_feedback: {
              summary: 'Exceptional pitch presentation with strong delivery.',
              strengths: [
                {
                  id: 'str-1',
                  title: 'Clear articulate delivery',
                  detail: 'Articulate presentation throughout.',
                  evidence_ids: [],
                  speaker_labels: [],
                },
              ],
              improvements: [
                {
                  id: 'imp-1',
                  title: 'Clarify CAC payback',
                  detail: 'Detail economics on slide 4.',
                  evidence_ids: [],
                  speaker_labels: [],
                },
              ],
              score_components: [],
              limitations: [],
            },
            member_feedback: [],
            markdown: '# Report',
            transcript_timeline: [],
            document_alignment: [],
            qa_review: [],
            recommendations: ['Clarify CAC payback'],
            limitations: [],
            reproducibility: {},
            generated_at: '2026-01-01T01:00:00Z',
          }),
        });
      }
    });

    await page.goto(`/sessions/${MOCK_SESSION_ID}/report`);

    // Verify error state and retry button
    await expect(page.getByText(/Report Unavailable/i)).toBeVisible();
    const tryAgainBtn = page.getByRole('button', { name: /Try Again/i });
    await expect(tryAgainBtn).toBeVisible();

    // Trigger retry recovery
    simulateFailure = false;
    await tryAgainBtn.click();

    // Verify report loaded
    await expect(
      page.getByText('Exceptional pitch presentation with strong delivery.'),
    ).toBeVisible();
    await expect(page.getByText('Score: 88/100')).toBeVisible();
  });

  test('erasure and data privacy journey', async ({ page }) => {
    await page.goto('/company/data-privacy');

    await expect(
      page.getByRole('heading', { name: 'Your Data Privacy' }),
    ).toBeVisible();
    await expect(page.getByText(/Private by Default/i)).toBeVisible();
    await expect(page.getByText(/Zero Model Training/i)).toBeVisible();
    await expect(page.getByText(/Explicit Consent/i)).toBeVisible();
    await expect(page.getByText(/No Bio-metric Profiling/i)).toBeVisible();
  });
});
