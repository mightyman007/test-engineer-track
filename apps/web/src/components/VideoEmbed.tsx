export function youTubeId(url: string): string | null {
  const m = /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{11})/.exec(url);
  return m ? m[1]! : null;
}

export function VideoEmbed({ url, title }: { url: string; title: string }) {
  const id = youTubeId(url);
  if (!id) {
    return <p><a href={url} target="_blank" rel="noopener noreferrer">▶ {title}</a></p>;
  }
  return (
    <div style={{ position: 'relative', paddingTop: '56.25%', margin: '1rem 0', borderRadius: 8, overflow: 'hidden' }}>
      <iframe
        src={`https://www.youtube.com/embed/${id}`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
        allowFullScreen
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
      />
    </div>
  );
}
