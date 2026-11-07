import { rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * Throwaway smoke DB lives in the repo-root data/ (gitignored). The cohort
 * smoke registers `smokeadmin` as the bootstrap admin (first user), so the DB
 * must start empty every run or the register would 409.
 */
export default function globalSetup(): void {
  // tests/ → apps/web → apps → repo root
  const dataDir = fileURLToPath(new URL('../../../data', import.meta.url));
  for (const f of ['smoke.sqlite3', 'smoke.sqlite3-wal', 'smoke.sqlite3-shm']) {
    rmSync(`${dataDir}/${f}`, { force: true });
  }
}
