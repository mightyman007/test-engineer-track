import type { ReactNode } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

export function markdownToHtml(body: string): string {
  const raw = marked.parse(body, { async: false });
  return DOMPurify.sanitize(raw, { ADD_ATTR: ['target', 'rel'] });
}

/** React element from sanitized HTML with diagram inlining + link hardening. */
export function htmlToPostProcessed(html: string, diagrams: Record<string, string>): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  for (const img of Array.from(doc.querySelectorAll('img'))) {
    const src = img.getAttribute('src') ?? '';
    if (src.startsWith('diagrams/') && diagrams[src]) {
      const tpl = document.createElement('template');
      tpl.innerHTML = diagrams[src]!;
      const svg = tpl.content.firstElementChild;
      if (svg) img.replaceWith(svg);
    }
  }
  for (const a of Array.from(doc.querySelectorAll('a[href]'))) {
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener noreferrer');
  }
  return doc.body.innerHTML;
}

export function renderMarkdown(body: string, opts: { diagrams: Record<string, string> }): ReactNode {
  const html = htmlToPostProcessed(markdownToHtml(body), opts.diagrams);
  return <div className="lesson-body" dangerouslySetInnerHTML={{ __html: html }} />;
}
