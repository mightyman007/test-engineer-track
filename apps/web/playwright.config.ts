import { defineConfig } from '@playwright/test';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Repo root: webServer commands run through the pnpm workspace. */
const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
// Absolute: pnpm runs scripts with the package dir as cwd, so a relative
// DB_PATH would land in apps/server/data — not the file globalSetup wipes.
const smokeDb = join(repoRoot, 'data', 'smoke.sqlite3');

export default defineConfig({
  testDir: 'tests',
  timeout: 60_000,
  // One local retry (two in CI): the M2 verification saw a 1-in-5 transient
  // whose output was lost to the default list reporter — retries plus the
  // html report below keep both the result and the evidence.
  retries: process.env.CI ? 2 : 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  // Pinned to 1 (NOT Playwright's default "50% of CPUs"): the specs share one
  // throwaway DB whose bootstrap-admin registration assumes a clean wipe, and
  // Task 4 adds API-writing specs against it — parallel workers would race
  // those writes.
  workers: 1,
  // Wipes the throwaway smoke DB before the servers boot, so the cohort
  // test's bootstrap-admin registration (first user) works on every run.
  globalSetup: './tests/global-setup.ts',
  webServer: [
    {
      command: 'pnpm --filter tet-server start',
      cwd: repoRoot,
      port: 8787,
      // Always boot fresh: adopting a dev-started server would point the
      // smoke at whatever DB that server holds (the M2 review's Minor #3),
      // and the wiped throwaway DB + bootstrap-admin flow assume OUR env.
      reuseExistingServer: false,
      env: { DB_PATH: smokeDb, SESSION_SECRET: 'smoke-secret' },
    },
    // Serves apps/web/dist — `pnpm smoke` builds content + web first.
    // --host 127.0.0.1: vite otherwise binds ::1 only, and the tests (plus the
    // same-site session cookie against the API) speak IPv4.
    { command: 'pnpm --filter tet-web preview --host 127.0.0.1', port: 4173, reuseExistingServer: false },
  ],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    // Failure forensics: the M2 transient (and its 2026-11-07 recurrence)
    // left nothing behind — a retained trace shows exactly which action
    // stalled, and the built-in error-context page snapshot survives in
    // test-results/ alongside it.
    trace: 'retain-on-failure',
  },
});
