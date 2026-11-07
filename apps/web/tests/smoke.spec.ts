import { test, expect } from '@playwright/test';

// The static build uses relative asset paths (Ondana subpath hosting), so the
// app must be entered at its root — deep `page.goto('/quiz/…')` URLs resolve
// `./assets/…` against the deep path and render blank. The specs therefore
// drive the same user flows through real UI navigation.

test('solo learner: lesson → quiz → flashcard review', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
  await page.getByRole('link', { name: /continue/i }).click();
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
  const checkboxes = page.getByRole('checkbox');
  if (await checkboxes.count()) {
    await checkboxes.first().check();
    await page.getByRole('button', { name: /check answer/i }).click();
  } else {
    await page.getByRole('button').first().click();
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
  const res = await request.post('http://127.0.0.1:8787/api/auth/register', {
    data: { username: 'smokeadmin', displayName: 'Smoke Admin', password: 'longenough1' },
  });
  if (!res.ok()) console.error('register failed:', res.status(), await res.text());
  expect(res.ok()).toBeTruthy();

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
