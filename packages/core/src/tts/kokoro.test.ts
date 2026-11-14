import { describe, expect, it } from 'vitest';
import { pickKokoroDevice } from './kokoro.js';

describe('pickKokoroDevice', () => {
  it('should pick wasm when no webgpu exists', async () => {
    expect(await pickKokoroDevice(undefined)).toBe('wasm');
  });

  it('should pick wasm when the adapter request resolves null — Brave exposes navigator.gpu but refuses the adapter', async () => {
    const braveLikeGpu = { requestAdapter: () => Promise.resolve(null) };
    expect(await pickKokoroDevice(braveLikeGpu)).toBe('wasm');
  });

  it('should pick webgpu when an adapter is actually available', async () => {
    const gpu = { requestAdapter: () => Promise.resolve({}) };
    expect(await pickKokoroDevice(gpu)).toBe('webgpu');
  });

  it('should pick wasm when the adapter request throws', async () => {
    const gpu = { requestAdapter: () => Promise.reject(new Error('denied')) };
    expect(await pickKokoroDevice(gpu)).toBe('wasm');
  });
});
