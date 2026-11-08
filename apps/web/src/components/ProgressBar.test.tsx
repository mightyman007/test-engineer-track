import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProgressBar } from './ProgressBar.js';

// M5 Task 1: the progress bar's accessible contract is behavioral — assistive
// tech must read the role, the name, and the value from the accessibility
// tree, not from class names or visual width. These tests assert exactly that
// contract; the accessible name closes the a11y-pass deferral (a progressbar
// without a name is announced as just "progress bar").
describe('ProgressBar a11y', () => {
  it('exposes role=progressbar with a readable name, value range, and current value', () => {
    render(<ProgressBar fraction={0.4} label="2/5 modules" />);
    const bar = screen.getByRole('progressbar', { name: '2/5 modules' });
    expect(bar.getAttribute('aria-valuemin')).toBe('0');
    expect(bar.getAttribute('aria-valuemax')).toBe('100');
    expect(bar.getAttribute('aria-valuenow')).toBe('40');
  });

  it('names unlabeled bars from the clamped percentage', () => {
    render(<ProgressBar fraction={1.5} />);
    expect(screen.getByRole('progressbar', { name: '100% complete' }).getAttribute('aria-valuenow')).toBe('100');
    render(<ProgressBar fraction={-1} />);
    expect(screen.getByRole('progressbar', { name: '0% complete' }).getAttribute('aria-valuenow')).toBe('0');
  });
});
