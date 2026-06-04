// supabase/functions/ai-proxy/index.ts
// =============================================================================
// AI Proxy — Supabase Edge Function
//
// Routes requests to Anthropic or OpenAI on behalf of the browser client.
// API keys are stored as Supabase secrets and never sent to the browser.
//
// Request body:
//   { provider: 'anthropic' | 'openai', ...providerPayload }
//
// Auth: Supabase anon key (standard Authorization: Bearer header).
// =============================================================================
// @ts-nocheck — Deno runtime; no tsconfig in functions dir

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  // Pre-flight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const { provider, ...payload } = body;

  // ── Anthropic ──────────────────────────────────────────────────────────────
  if (provider === 'anthropic') {
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      return json({ error: 'ANTHROPIC_API_KEY not configured in Supabase secrets' }, 500);
    }

    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version':
          (payload['anthropic-version'] as string) || '2023-06-01',
      },
      body: JSON.stringify(payload),
    });

    const data = await upstream.json();
    return json(data, upstream.status);
  }

  // ── OpenAI ─────────────────────────────────────────────────────────────────
  if (provider === 'openai') {
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      return json({ error: 'OPENAI_API_KEY not configured in Supabase secrets' }, 500);
    }

    const upstream = await fetch(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      },
    );

    const data = await upstream.json();
    return json(data, upstream.status);
  }

  // ── Google Gemini ──────────────────────────────────────────────────────────
  // payload.model should be e.g. 'gemini-1.5-flash' or 'gemini-1.5-pro'
  // payload.contents is the Gemini messages array (already in Gemini format).
  if (provider === 'gemini') {
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      return json({ error: 'GEMINI_API_KEY not configured in Supabase secrets' }, 500);
    }
    const model = (payload['model'] as string) || 'gemini-1.5-flash';
    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    );
    const data = await upstream.json();
    return json(data, upstream.status);
  }

  return json({ error: `Unknown provider: ${provider}` }, 400);
});
