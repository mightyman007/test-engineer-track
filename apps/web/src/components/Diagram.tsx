export function Diagram({ svg, title }: { svg: string; title: string }) {
  return (
    <figure style={{ margin: '1rem 0' }}>
      <div dangerouslySetInnerHTML={{ __html: svg }} role="img" aria-label={title} />
      <figcaption className="muted" style={{ fontSize: '0.85rem', textAlign: 'center' }}>{title}</figcaption>
    </figure>
  );
}
