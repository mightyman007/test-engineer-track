import { Hono } from 'hono';
import type { AppEnv } from '../auth.js';
import { requireAuth } from '../auth.js';

/**
 * Optional cloud-TTS proxy. Inert unless TTS_PROVIDER + TTS_API_KEY are set
 * (the default voice path is client-side kokoro-js; this exists for
 * deployments that prefer a hosted voice). Proxies an OpenAI-compatible
 * `POST /v1/audio/speech` call and streams the audio back untouched.
 */
export function ttsRoutes(): Hono<AppEnv> {
  const r = new Hono<AppEnv>();
  r.use('*', requireAuth());

  r.post('/', async (c) => {
    const provider = process.env.TTS_PROVIDER ?? '';
    const key = process.env.TTS_API_KEY ?? '';
    if (!provider || !key) return c.json({ error: 'tts not configured' }, 404);
    const { text, voice = 'alloy', speed = 1 } = await c.req.json<{ text: string; voice?: string; speed?: number }>();
    const upstream = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-4o-mini-tts', voice, input: text, speed }),
    });
    if (!upstream.ok || !upstream.body) return c.json({ error: 'tts upstream failed' }, 502);
    return new Response(upstream.body, {
      headers: { 'content-type': upstream.headers.get('content-type') ?? 'audio/mpeg' },
    });
  });

  return r;
}
