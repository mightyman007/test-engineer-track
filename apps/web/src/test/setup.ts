import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// RTL's auto-cleanup is inactive under vitest `globals: false` (no global
// afterEach), so every render would leak into the next test in this file.
afterEach(() => cleanup());
