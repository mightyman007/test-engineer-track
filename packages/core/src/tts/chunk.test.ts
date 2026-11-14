import { describe, expect, it } from 'vitest';
import { chunkText } from './chunk.js';

describe('chunkText', () => {
  it('should keep every chunk within the cap when one unbroken token exceeds it', () => {
    // The cap is load-bearing for kokoro's per-generate memory: a bare URL,
    // hash, or unbroken CJK token must never yield an oversize chunk.
    const chunks = chunkText('x'.repeat(2000), 300);
    expect(chunks.length).toBe(7);
    expect(Math.max(...chunks.map((c) => c.length))).toBeLessThanOrEqual(300);
    expect(chunks.join('')).toBe('x'.repeat(2000));
  });

  it('should keep a URL inside prose within the cap', () => {
    const chunks = chunkText(`Read https://example.com/${'a'.repeat(900)} now.`, 300);
    expect(Math.max(...chunks.map((c) => c.length))).toBeLessThanOrEqual(300);
    expect(chunks.join(' ')).toContain('Read https://example.com/');
  });

  it('should keep intact sentences whole when they fit the cap', () => {
    const chunks = chunkText('One short sentence. Another short one.', 300);
    expect(chunks).toEqual(['One short sentence. Another short one.']);
  });

  it('should split long sentences at word boundaries without exceeding the cap', () => {
    const chunks = chunkText('word '.repeat(80).trim(), 300);
    expect(chunks.length).toBeGreaterThan(1);
    expect(Math.max(...chunks.map((c) => c.length))).toBeLessThanOrEqual(300);
  });

  it('should return no chunks for empty or whitespace-only text', () => {
    expect(chunkText('', 300)).toEqual([]);
    expect(chunkText('   \n  ', 300)).toEqual([]);
  });
});
