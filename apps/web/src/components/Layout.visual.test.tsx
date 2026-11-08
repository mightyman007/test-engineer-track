import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// jsdom doesn't apply stylesheets, so the dark-default contract is pinned at
// the stylesheet level: :root carries the dark tokens (the default) and
// [data-theme='light'] carries the override.
const css = readFileSync(join(process.cwd(), 'src', 'styles.css'), 'utf8');

function blockFor(selector: string): string {
  const idx = css.indexOf(selector);
  expect(idx, `${selector} block missing`).toBeGreaterThan(-1);
  const open = css.indexOf('{', idx);
  const close = css.indexOf('}', open);
  return css.slice(open, close);
}

describe('dark default (stylesheet contract)', () => {
  it(':root carries the dark palette (the default)', () => {
    const root = blockFor(':root');
    expect(root).toContain('--bg: #12121c');
    expect(root).toContain('--surface: #1c1c2a');
    expect(root).toContain('--ink: #e8e8f2');
    expect(root).not.toContain('--bg: #f7f7f9');
  });

  it('[data-theme=\'light\'] carries the light override', () => {
    const light = blockFor(":root[data-theme='light']");
    expect(light).toContain('--bg: #f7f7f9');
    expect(light).toContain('--surface: #ffffff');
    expect(light).toContain('--ink: #1a1a2e');
  });

  it('components reference tokens, not hardcoded hexes', () => {
    // The dark-mode regression class: inline hexes that assume light. The
    // perceptron canvas is a deliberate light "paper" element (excluded).
    const files = [
      'src/components/ExamRunner.tsx', 'src/components/QuizRunner.tsx',
      'src/components/Layout.tsx', 'src/components/MigrationPrompt.tsx',
      'src/pages/ExamReportPage.tsx', 'src/pages/AdminPage.tsx',
    ];
    for (const f of files) {
      const src = readFileSync(join(process.cwd(), f), 'utf8');
      const hexes = src.match(/#[0-9a-fA-F]{6}\b/g) ?? [];
      expect(hexes, `${f} reintroduced hardcoded hexes: ${hexes.join(',')}`).toEqual([]);
    }
  });
});
