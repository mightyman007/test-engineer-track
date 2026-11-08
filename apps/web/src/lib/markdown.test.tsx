import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { renderMarkdown } from './markdown.js';

const diagrams = { 'diagrams/x.svg': '<svg id="thesvg" xmlns="http://www.w3.org/2000/svg"></svg>' };

describe('renderMarkdown', () => {
  it('renders basic markdown', () => {
    const { container } = render(renderMarkdown('# Hi\n\nsome **bold**', { diagrams }));
    expect(container.querySelector('h1')!.textContent).toBe('Hi');
    expect(container.querySelector('strong')!.textContent).toBe('bold');
  });

  it('replaces diagram images with inline SVG from the bundle', () => {
    const { container } = render(
      renderMarkdown('![D](diagrams/x.svg)', { diagrams }),
    );
    expect(container.querySelector('svg#thesvg')).toBeTruthy();
    expect(container.querySelector('img')).toBeNull();
  });

  it('carries the img alt onto the inlined SVG as its accessible name (M5 Task 1)', () => {
    const { container } = render(
      renderMarkdown('![Data flow of a perceptron](diagrams/x.svg)', { diagrams }),
    );
    const svg = container.querySelector('svg#thesvg')!;
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toBe('Data flow of a perceptron');
    // Behavioral assertion: the name is reachable through the accessibility
    // tree, not just present as an attribute.
    screen.getByRole('img', { name: 'Data flow of a perceptron' });
  });

  it('leaves an alt-less (decorative) diagram unlabelled', () => {
    const { container } = render(
      renderMarkdown('![](diagrams/x.svg)', { diagrams }),
    );
    const svg = container.querySelector('svg#thesvg')!;
    // role=img with no accessible name would be an a11y violation — an empty
    // alt means decorative, so neither attribute is set.
    expect(svg.getAttribute('role')).toBeNull();
    expect(svg.getAttribute('aria-label')).toBeNull();
  });

  it('external links get target=_blank and rel=noopener', () => {
    const { container } = render(
      renderMarkdown('[CNNs](https://www.youtube.com/watch?v=aircAruvnKk)', { diagrams }),
    );
    const a = container.querySelector('a')!;
    expect(a.getAttribute('target')).toBe('_blank');
    expect(a.getAttribute('rel')).toContain('noopener');
  });

  it('sanitizes script injection', () => {
    const { container } = render(renderMarkdown('<script>alert(1)</script>ok', { diagrams }));
    expect(container.querySelector('script')).toBeNull();
    expect(container.textContent).toContain('ok');
  });
});
