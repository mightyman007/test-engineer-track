import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// RTL's auto-cleanup is inactive under vitest `globals: false` (no global
// afterEach), so every render would leak into the next test in this file.
afterEach(() => cleanup());

// jsdom implements no 2D canvas: calling getContext() throws jsdom's "Not
// implemented" error into the run's stderr. Components that draw must tolerate
// a missing context (PerceptronDemo does — draw() no-ops); stubbing it keeps
// that tolerance exercised while keeping the output quiet.
HTMLCanvasElement.prototype.getContext =
  (() => null) as unknown as HTMLCanvasElement['getContext'];
