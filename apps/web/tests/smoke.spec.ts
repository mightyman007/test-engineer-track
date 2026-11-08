import { test, expect } from '@playwright/test';

// The app now ships as a Dana app (nginx SPA fallback at a subdomain root):
// deep links resolve correctly on the deployed URL. The specs still drive the
// same user flows through real UI navigation.

test('solo learner: lesson → quiz → flashcard review', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
  // Two-track dashboard (M4): the dashboard renders one track card per track.
  await expect(page.getByRole('heading', { level: 2, name: 'ISTQB Foundation (CTFL v4.0)' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'AI for Test Engineers' })).toBeVisible();
  // Two cards means two "Continue:" buttons — scope to the ISTQB track's card.
  const istqbCard = page.locator('section.card').filter({ has: page.getByRole('heading', { name: 'ISTQB Foundation (CTFL v4.0)' }) });
  await istqbCard.getByRole('link', { name: /continue/i }).click();
  // module page → first lesson
  await page.getByRole('link', { name: /what is testing/i }).first().click();
  const complete = page.getByRole('button', { name: /mark lesson complete/i });
  await expect(complete).toBeVisible();
  await complete.click();
  await expect(page.getByText('complete').first()).toBeVisible();

  // quiz — back to the module page, then its "Module quiz" link. The pool is
  // shuffled per visit: single-choice grades the moment an option button is
  // picked, multi-select renders checkboxes + "Check answer".
  await page.getByRole('link', { name: /fundamentals of testing/i }).first().click();
  await page.getByRole('link', { name: /module quiz/i }).click();
  // Gate the checkbox probe on the question render: probing earlier can see 0
  // checkboxes, and if Q1 is multi-select the else branch then clicks the only
  // button — "Check answer", disabled until a checkbox is picked — and stalls
  // to the 60s timeout. The "Question 1 of N" counter commits with the
  // options in both branches (single and multi), so this closes the race
  // deterministically instead of leaning on the retry.
  await expect(page.getByText(/Question 1 of/)).toBeVisible();
  const checkboxes = page.getByRole('checkbox');
  if (await checkboxes.count()) {
    await checkboxes.first().check();
    await page.getByRole('button', { name: /check answer/i }).click();
  } else {
    // Scope to the quiz card (the .card containing the "Question 1 of N"
    // counter): an unscoped getByRole('button').first() would match the nav's
    // theme-toggle button, whose inner text (🌙) hasNotText cannot see — only
    // its aria-label carries "Switch to…".
    const quizCard = page.locator('.card', { has: page.getByText(/Question 1 of/) });
    await quizCard.getByRole('button').first().click();
  }
  await expect(page.getByText(/correct|not quite/i).first()).toBeVisible();

  // flashcards — enter at the root (safe entry URL), then the nav's
  // Flashcards link and the module deck card.
  await page.goto('/');
  await page.getByRole('link', { name: 'Flashcards', exact: true }).click();
  await page.getByRole('link', { name: /fundamentals of testing/i }).first().click();
  await expect(page.getByText(/card|complete/i).first()).toBeVisible();
});

test('cohort: register → admin roster shows the user', async ({ browser, request }) => {
  // Register through the API directly (first user = bootstrap admin). This
  // request context is cookie-independent; the browser signs in separately.
  // NOTE: the throwaway DB is wiped once per invocation (globalSetup), NOT
  // per retry — so a retry's registration collides with the user the first
  // attempt created and 403s at the invite gate. Accept that outcome; the
  // sign-in below still proves the credentials work.
  const res = await request.post('http://127.0.0.1:8787/api/auth/register', {
    data: { username: 'smokeadmin', displayName: 'Smoke Admin', password: 'longenough1' },
  });
  if (!res.ok() && res.status() !== 403) {
    console.error('register failed:', res.status(), await res.text());
  }
  expect(res.ok() || res.status() === 403).toBeTruthy();

  const page = await browser.newPage();
  await page.goto('/');
  await page.getByRole('link', { name: /sign in/i }).click();
  await page.getByLabel('server url').fill('http://127.0.0.1:8787');
  await page.getByLabel('username').fill('smokeadmin');
  await page.getByLabel('password').fill('longenough1');
  await page.getByRole('button', { name: /sign in/i }).click();
  // Layout header shows `cohort · <displayName>` (registered as "Smoke Admin").
  await expect(page.getByText(/cohort · smoke/i)).toBeVisible();

  // Admin nav link appears for admins; the roster lists the user by username.
  await page.getByRole('link', { name: /admin/i }).click();
  await expect(page.getByText('smokeadmin')).toBeVisible(); // roster username
  await expect(page.getByRole('link', { name: /export csv/i })).toBeVisible();
});

test('cohort: module 8 readiness → mock exam 1 → report', async ({ browser, request }) => {
  // Same tolerant registration preamble as the cohort spec above: the invite
  // gate 403s any registration after the bootstrap admin, so this passes both
  // when the user already exists (normal order — the spec above registered
  // first) and when this spec runs first on the wiped DB (creates it). Either
  // way the credentials below sign in.
  const res = await request.post('http://127.0.0.1:8787/api/auth/register', {
    data: { username: 'smokeadmin', displayName: 'Smoke Admin', password: 'longenough1' },
  });
  if (!res.ok() && res.status() !== 403) {
    console.error('register failed:', res.status(), await res.text());
  }
  expect(res.ok() || res.status() === 403).toBeTruthy();

  const page = await browser.newPage();
  await page.goto('/');
  await page.getByRole('link', { name: /sign in/i }).click();
  await page.getByLabel('server url').fill('http://127.0.0.1:8787');
  await page.getByLabel('username').fill('smokeadmin');
  await page.getByLabel('password').fill('longenough1');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page.getByText(/cohort · smoke/i)).toBeVisible();

  // Module 8 hosts no quiz link — its readiness hub lists the mock exams — so
  // the flow must reach it through real UI clicks: dashboard (ISTQB card — two
  // tracks now render "Continue:" buttons) → module 1 → track page →
  // "8. Exam Readiness".
  await page.goto('/');
  await page.locator('section.card').filter({ has: page.getByRole('heading', { name: 'ISTQB Foundation (CTFL v4.0)' }) }).getByRole('link', { name: /continue/i }).click();
  await page.getByRole('link', { name: 'ISTQB Foundation (CTFL v4.0)' }).click();
  await page.getByRole('link', { name: /exam readiness/i }).click();
  await expect(page.getByRole('heading', { name: /take a mock exam/i })).toBeVisible();
  // exact match: the "Recent attempts" list (present on a retry after a
  // recorded attempt) renders the same title inside longer link names.
  await page.getByRole('link', { name: 'ISTQB CTFL Mock Exam 1', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: /mock exam 1/i })).toBeVisible();
  await expect(page.getByText(/40 questions · pass at 65%/i)).toBeVisible();

  // Every question renders on one page (M1 design). Singles grade nothing at
  // rest — the first option button sits before the flag button in the section;
  // multi-selects mark themselves with checkboxes ("Select N.") — pick 2.
  const sections = page.locator('section[id^="exam-q-"]');
  await expect(sections).toHaveCount(40);
  for (let i = 0; i < 40; i++) {
    const section = sections.nth(i);
    const checkboxes = section.getByRole('checkbox');
    if (await checkboxes.count()) {
      await checkboxes.nth(0).check();
      await checkboxes.nth(1).check();
    } else {
      await section.getByRole('button').first().click();
    }
  }

  // The report is the outcome: the score line (/40 · %), the per-chapter bars
  // (ch1–ch6, one bar each), and a review row per answered question — 40 rows
  // prove no question was skipped. No score/pass value assertions: the
  // assembly seed (hence the drawn questions) differs per run.
  await page.getByRole('button', { name: /submit exam/i }).click();
  await expect(page).toHaveURL(/\/exam\/istqb-mock-1\/report\//);
  await expect(page.getByRole('heading', { name: /— report/i })).toBeVisible();
  await expect(page.getByText(/\/40 · \d+% · /)).toBeVisible();
  const byTopic = page.locator('section.card').filter({ has: page.getByRole('heading', { name: 'By topic' }) });
  for (const ch of ['ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6']) {
    await expect(byTopic.getByText(ch, { exact: true })).toBeVisible();
  }
  await expect(byTopic.locator('div.bar')).toHaveCount(6);
  await expect(page.getByText(/^correct$|^missed$/)).toHaveCount(40);
});
