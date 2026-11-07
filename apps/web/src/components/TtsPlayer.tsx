import { useEffect, useRef, useState } from 'react';
import { pickProvider, type TtsProvider } from 'tet-core';

const RATES = [0.75, 1, 1.25, 1.5];

export function TtsPlayer({ text }: { text: string }) {
  const [provider, setProvider] = useState<TtsProvider | null>(null);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const rateRef = useRef(rate);
  rateRef.current = rate;

  useEffect(() => {
    let alive = true;
    void pickProvider().then((p) => { if (alive) setProvider(p); });
    return () => { alive = false; };
  }, []);

  useEffect(() => () => provider?.stop(), [provider]);

  if (!provider) {
    return <p className="muted" style={{ fontSize: '0.9rem' }}>🔊 voice not available in this browser</p>;
  }

  async function play() {
    if (playing) { provider!.pause(); setPlaying(false); return; }
    setPlaying(true);
    await provider!.speak(text, { rate: rateRef.current });
    setPlaying(false);
  }

  return (
    <div className="card" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', padding: '0.6rem 1rem' }}>
      <button className="btn secondary" onClick={() => void play()}>{playing ? '⏸ Pause' : '▶ Listen'}</button>
      <button className="btn secondary" onClick={() => { provider!.stop(); setPlaying(false); }}>⏹ Stop</button>
      <label className="muted" style={{ fontSize: '0.9rem' }}>
        speed{' '}
        <select value={rate} onChange={(e) => setRate(Number(e.target.value))}>
          {RATES.map((r) => <option key={r} value={r}>{r}×</option>)}
        </select>
      </label>
      <span className="muted" style={{ fontSize: '0.85rem' }}>voice: {provider.id}</span>
    </div>
  );
}
