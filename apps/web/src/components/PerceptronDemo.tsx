import { useEffect, useRef, useState } from 'react';
import {
  errorCount, initialState, meanLoss, score, trainStep,
  type PerceptronState,
} from './perceptron.js';

/** Animation pacing: 2 steps every 20 ms ≈ 100 steps/s, so a full Train press lasts ~1 s. */
const TICK_MS = 20;
const STEPS_PER_TICK = 2;
const STEPS_PER_PRESS = 100;
/** Loss sparkline keeps the most recent readings (one full press fills it exactly). */
const HISTORY_MAX = STEPS_PER_PRESS;

const CANVAS_W = 640;
const CANVAS_H = 400;
const PAD = 28;

/** Demo state + the loss history the sparkline traces. */
interface Snapshot {
  state: PerceptronState;
  losses: number[];
}

function freshSnapshot(): Snapshot {
  const state = initialState();
  return { state, losses: [meanLoss(state)] };
}

/**
 * Module A3's interactive demo: a single perceptron (2 weights + bias) trained
 * by gradient descent on a fixed, linearly separable 2-D dataset. All training
 * math lives in ./perceptron.js (pure, unit-tested); this component only
 * animates it — boundary line, points, loss readout and sparkline.
 */
export function PerceptronDemo() {
  const [snap, setSnap] = useState<Snapshot>(freshSnapshot);
  const [running, setRunning] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // One training press: STEPS_PER_TICK pure steps per tick until the press
  // length is reached, then stop. The updater is pure (trainStep mutates
  // nothing), so StrictMode double-invocation stays harmless.
  useEffect(() => {
    if (!running) return;
    let stepped = 0;
    const id = window.setInterval(() => {
      for (let i = 0; i < STEPS_PER_TICK; i++) {
        setSnap((prev) => {
          const state = trainStep(prev.state);
          return { state, losses: [...prev.losses, meanLoss(state)].slice(-HISTORY_MAX) };
        });
      }
      stepped += STEPS_PER_TICK;
      if (stepped >= STEPS_PER_PRESS) setRunning(false);
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [running]);

  // Redraw on every snapshot; jsdom has no 2D context, so draw() no-ops there.
  useEffect(() => {
    draw(canvasRef.current, snap);
  }, [snap]);

  const { state } = snap;

  return (
    <div className="card" style={{ padding: '1rem', marginTop: '1.5rem' }}>
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        role="img"
        aria-label="Perceptron training demo: two classes of points, the current decision boundary, and the falling loss curve"
        style={{ width: '100%', maxWidth: `${CANVAS_W}px`, height: 'auto', display: 'block' }}
      />
      <p aria-live="polite">
        {`step ${state.step} · loss ${meanLoss(state).toFixed(3)} · errors ${errorCount(state)}/${state.points.length}`}
      </p>
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button className="btn" onClick={() => setRunning(true)} disabled={running}>Train</button>
        <button className="btn secondary" onClick={() => setSnap(freshSnapshot())} disabled={running}>Reset</button>
      </div>
      <p className="muted" style={{ fontSize: '0.85rem', marginBottom: 0 }}>
        Indigo points are class 1, amber points class 0; red rings mark the mistakes. The dark line is the
        perceptron&apos;s current boundary — gradient descent moves it until it separates the classes.
      </p>
    </div>
  );
}

/** Canvas painter, separated from state so it can silently no-op under jsdom. */
function draw(canvas: HTMLCanvasElement | null, snap: Snapshot): void {
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) return;
  const { state, losses } = snap;

  ctx.fillStyle = '#f7f8fb';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Unit-square coordinates → canvas pixels (y flipped: larger y is higher).
  const px = (x: number) => PAD + x * (CANVAS_W - 2 * PAD);
  const py = (y: number) => CANVAS_H - PAD - y * (CANVAS_H - 2 * PAD);

  // Decision boundary: the line w1·x + w2·y + b = 0.
  ctx.strokeStyle = '#1a1a2e';
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (Math.abs(state.w2) > 1e-9) {
    const yAt = (x: number) => -(state.w1 * x + state.b) / state.w2;
    ctx.moveTo(px(0), py(yAt(0)));
    ctx.lineTo(px(1), py(yAt(1)));
  } else if (Math.abs(state.w1) > 1e-9) {
    const xAt = (y: number) => -(state.w2 * y + state.b) / state.w1;
    ctx.moveTo(px(xAt(0)), py(0));
    ctx.lineTo(px(xAt(1)), py(1));
  }
  ctx.stroke();

  // Points, colored by class; mistakes get a red ring so "errors" has a face.
  for (const p of state.points) {
    const predicted: 0 | 1 = score(state, p.x, p.y) > 0 ? 1 : 0;
    ctx.beginPath();
    ctx.arc(px(p.x), py(p.y), 5, 0, Math.PI * 2);
    ctx.fillStyle = p.label === 1 ? '#4f46e5' : '#d97706';
    ctx.fill();
    if (predicted !== p.label) {
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  // Loss sparkline, bottom-right: the "rolling downhill" trace.
  const sw = 180;
  const sh = 56;
  const sx = CANVAS_W - sw - 14;
  const sy = CANVAS_H - sh - 12;
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillRect(sx, sy, sw, sh);
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 1;
  ctx.strokeRect(sx, sy, sw, sh);
  if (losses.length > 1) {
    const max = Math.max(...losses);
    ctx.beginPath();
    losses.forEach((l, i) => {
      const lx = sx + 6 + (i / (losses.length - 1)) * (sw - 12);
      const ly = sy + sh - 6 - (l / max) * (sh - 12);
      if (i === 0) ctx.moveTo(lx, ly);
      else ctx.lineTo(lx, ly);
    });
    ctx.strokeStyle = '#4f46e5';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}
