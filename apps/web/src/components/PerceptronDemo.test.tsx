import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { PerceptronDemo } from './PerceptronDemo.js';

describe('PerceptronDemo', () => {
  it('renders the canvas, controls, and a step-0 readout', () => {
    render(<PerceptronDemo />);
    expect(document.querySelector('canvas')).toBeTruthy();
    expect(screen.getByRole('button', { name: /train/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /reset/i })).toBeTruthy();
    expect(screen.getByText(/step 0 · loss/)).toBeTruthy();
  });

  it('training runs visible steps to zero errors, and Reset restores the start', async () => {
    const user = userEvent.setup();
    render(<PerceptronDemo />);
    await user.click(screen.getByRole('button', { name: /train/i }));
    // A full press is 100 steps over ~1 s of ticks; Train stays disabled while it runs.
    await waitFor(
      () => expect((screen.getByRole('button', { name: /train/i }) as HTMLButtonElement).disabled).toBe(false),
      { timeout: 4000 },
    );
    expect(screen.getByText(/step 100 · .*errors 0\/40/)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(screen.getByText(/step 0 · loss/)).toBeTruthy();
  });
});
