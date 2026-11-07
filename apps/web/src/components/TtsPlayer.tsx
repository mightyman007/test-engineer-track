import { useEffect, useRef, useState } from 'react';
import { pickProvider, type TtsProvider } from 'tet-core';

const RATES = [0.75, 1, 1.25, 1.5];

export function TtsPlayer({ text }: { text: string }) {
  const [provider, setProvider] = useState<TtsProvider | null>(null);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const rateRef = useRef(rate);
  rateRef.current = rate;
  // Mirror + token for playback control: the toggle reads the ref (never a
  // stale render closure), and a superseded speak()'s completion must not
  // clobber a newer run's playing state.
  const playingRef = useRef(false);
  const playToken = useRef(0);

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
    if (playingRef.current) {
      provider!.pause();
      playingRef.current = false;
      setPlaying(false);
      return;
    }
    const myRun = ++playToken.current;
    playingRef.current = true;
    setPlaying(true);
    await provider!.speak(text, { rate: rateRef.current });
    if (playToken.current !== myRun) return; // superseded by a newer run
    playingRef.current = false;
    setPlaying(false);
  }

  return (
    <div className="card" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', padding: '0.6rem 1rem' }}>
      <button className="btn secondary" onClick={() => void play()}>{playing ? '⏸ Pause' : '▶ Listen'}</button>
      <button className="btn secondary" onClick={() => { provider!.stop(); playingRef.current = false; setPlaying(false); }}>⏹ Stop</button>
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
