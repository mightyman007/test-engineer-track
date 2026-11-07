import { describe, expect, it } from 'vitest';
import { stripMarkdownForTts } from './index.js';

describe('stripMarkdownForTts', () => {
  it('keeps link anchor text but drops image syntax and URLs', () => {
    const body = 'Learn about [CNNs](https://example.com/cnn) today.';
    const out = stripMarkdownForTts(body);
    expect(out).toContain('CNNs');
    expect(out).not.toContain('https://example.com/cnn');
    expect(out).not.toContain('(');
  });

  it('removes images entirely (alt text is decoration)', () => {
    const body = 'Before ![diagram](diagrams/x.svg) after.';
    const out = stripMarkdownForTts(body);
    expect(out).not.toContain('![diagram]');
    expect(out).not.toContain('diagrams/x.svg');
    expect(out).toContain('Before');
    expect(out).toContain('after.');
  });

  it('strips bold/italic/heading/code punctuation', () => {
    const body = '## Heading\n\nThis is **bold**, *italic*, and `code` text.';
    const out = stripMarkdownForTts(body);
    expect(out).not.toMatch(/[#*_>`]/);
    expect(out).toContain('Heading');
    expect(out).toContain('bold');
    expect(out).toContain('italic');
    expect(out).toContain('code');
  });

  it('handles a lesson-shaped body with image, links, and emphasis', () => {
    const body = [
      '## What [software testing](https://en.wikipedia.org/wiki/Software_testing) actually is',
      '',
      '![overview](diagrams/testing-vs-debugging.svg)',
      '',
      '**Static testing** examines a [work product](https://example.com/wp) *without* running it.',
    ].join('\n');
    const out = stripMarkdownForTts(body);
    expect(out).toContain('software testing');
    expect(out).toContain('work product');
    expect(out).toContain('Static testing');
    expect(out).not.toContain('https://');
    expect(out).not.toContain('diagrams/');
    expect(out).not.toMatch(/[#*_>`\[\]!]/);
  });
});
