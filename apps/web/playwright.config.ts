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
  // Wipes the throwaway smoke DB before the servers boot, so the cohort
  // test's bootstrap-admin registration (first user) works on every run.
  globalSetup: './tests/global-setup.ts',
  webServer: [
    {
      command: 'pnpm --filter tet-server start',
      cwd: repoRoot,
      port: 8787,
      // Reuse a dev-started server locally; in CI always boot fresh so the
      // throwaway DB and the bootstrap-admin registration are deterministic.
      reuseExistingServer: !process.env.CI,
      env: { DB_PATH: smokeDb, SESSION_SECRET: 'smoke-secret' },
    },
    // Serves apps/web/dist — `pnpm smoke` builds content + web first.
    // --host 127.0.0.1: vite otherwise binds ::1 only, and the tests (plus the
    // same-site session cookie against the API) speak IPv4.
    { command: 'pnpm --filter tet-web preview --host 127.0.0.1', port: 4173, reuseExistingServer: !process.env.CI },
  ],
  use: { baseURL: 'http://127.0.0.1:4173' },
});
