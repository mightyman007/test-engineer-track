/**
 * Shared TTS chunker (webspeech + kokoro both speak chunk-by-chunk).
 * Sentences stay intact and accumulate up to the cap; a sentence longer than
 * the cap splits at word boundaries; a single TOKEN longer than the cap (bare
 * URL, file path, hash id, unbroken CJK) hard-slices at exactly `max` — the
 * cap is load-bearing for kokoro's per-generate attention/KV memory, so no
 * chunk may ever exceed it.
 */
export function chunkText(text: string, max: number): string[] {
  const chunks: string[] = [];
  let buf = '';
  const flush = (): void => { if (buf.trim()) chunks.push(buf.trim()); buf = ''; };

  for (const sentence of text.split(/(?<=[.!?])\s+/)) {
    if (sentence.length > max) {
      flush();
      for (const word of sentence.split(/\s+/)) {
        if (!word) continue;
        if (word.length > max) {
          flush(); // preceding words must stay ordered BEFORE the token's pieces
          for (let i = 0; i < word.length; i += max) chunks.push(word.slice(i, i + max));
          continue;
        }
        if (buf && (buf + ' ' + word).length > max) flush();
        buf = buf ? `${buf} ${word}` : word;
      }
      flush();
    } else {
      if (buf && (buf + ' ' + sentence).length > max) flush();
      buf = buf ? `${buf} ${sentence}` : sentence;
    }
  }
  flush();
  return chunks;
}
