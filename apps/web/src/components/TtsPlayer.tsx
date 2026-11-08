import { useEffect, useRef, useState } from 'react';
import { pickProvider, type TtsProvider } from 'tet-core';

const RATES = [0.75, 1, 1.25, 1.5];

export function TtsPlayer({ text }: { text: string }) {
  const [provider, setProvider] = useState<TtsProvider | null>(null);
  // Pick is LAZY: choosing a provider may warm Kokoro (a ~24 MB model fetch),
  // so it must not run just because a lesson mounted — only on the learner's
  // first Play click. Until then the player shows an idle "ready" button, and
  // "warming voice…" while the pick is in flight. "unavailable" is reserved
  // for a pick that RESOLVED to null.
  const [picking, setPicking] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const pickingRef = useRef(false);
  // Alive flag: a pick resolving after unmount must not touch state (the
  // component is gone; provider.stop() already ran via the unmount effect).
  // Re-armed on mount because React StrictMode's dev double-mount (mount →
  // cleanup → re-mount) keeps refs across the simulated remount — without the
  // re-arm the flag stays false forever and the lazy pick can never land.
  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => { aliveRef.current = false; };
  }, []);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const rateRef = useRef(rate);
  rateRef.current = rate;
  // Mirror + token for playback control: the toggle reads the ref (never a
  // stale render closure), and a superseded speak()'s completion must not
  // clobber a newer run's playing state.
  const playingRef = useRef(false);
  const playToken = useRef(0);

  useEffect(() => () => provider?.stop(), [provider]);

  /** First Play click: resolve the provider once and cache it. */
  async function ensureProvider(): Promise<TtsProvider | null> {
    if (provider || pickingRef.current) return provider;
    pickingRef.current = true;
    setPicking(true);
    try {
      const p = await pickProvider();
      if (!aliveRef.current) return p; // unmounted mid-pick: drop silently
      setProvider(p);
      if (!p) setUnavailable(true);
      return p;
    } finally {
      pickingRef.current = false;
      if (aliveRef.current) setPicking(false);
    }
  }

  if (unavailable) {
    return <p className="muted" style={{ fontSize: '0.9rem' }}>🔊 voice not available in this browser</p>;
  }

  if (!provider) {
    return (
      <button
        className="btn secondary muted"
        style={{ fontSize: '0.9rem', opacity: 0.75 }}
        disabled={picking}
        onClick={() => void ensureProvider()}
      >
        {picking ? '⏳ warming voice…' : '🔊 text-to-speech ready'}
      </button>
    );
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
    // Post-unmount guard (M5 Task 2): a provider's speak resolving after the
    // component is gone must not schedule React work against a dead tree —
    // a pending completion firing after test-environment teardown surfaced
    // as an unhandled "window is not defined" rejection (Task 1's flagged
    // latent flake). Nothing observable changes; the state reset is skipped.
    if (!aliveRef.current) return;
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
