import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProgressBar } from './ProgressBar.js';

// M5 Task 1: the progress bar's accessible contract is behavioral — assistive
// tech must read the role and the value from the accessibility tree, not from
// class names or visual width. These tests assert exactly that contract.
describe('ProgressBar a11y', () => {
  it('exposes role=progressbar with a readable value range and current value', () => {
    render(<ProgressBar fraction={0.4} label="2/5 modules" />);
    const bar = screen.getByRole('progressbar');
    expect(bar.getAttribute('aria-valuemin')).toBe('0');
    expect(bar.getAttribute('aria-valuemax')).toBe('100');
    expect(bar.getAttribute('aria-valuenow')).toBe('40');
  });

  it('clamps out-of-range fractions into the declared value range', () => {
    render(<ProgressBar fraction={1.5} />);
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('100');
    render(<ProgressBar fraction={-1} />);
    expect(screen.getAllByRole('progressbar')[1]!.getAttribute('aria-valuenow')).toBe('0');
  });
});
