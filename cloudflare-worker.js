const ALLOWED_ORIGINS = [
  'https://home-english-private.cherryyijiatec.workers.dev',
  'http://127.0.0.1:8010',
  'http://localhost:8010'
];

function isAllowedOrigin(origin) {
  return ALLOWED_ORIGINS.includes(origin);
}

function corsHeaders(origin) {
  const allowOrigin = isAllowedOrigin(origin) ? origin : 'null';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
}

function jsonResponse(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders(origin),
      'Content-Type': 'application/json; charset=utf-8'
    }
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    if (request.method === 'OPTIONS') {
      if (!isAllowedOrigin(origin)) {
        return new Response(null, { status: 403, headers: corsHeaders(origin) });
      }
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (request.method !== 'POST') {
      return jsonResponse({ error: 'POST only' }, 405, origin);
    }

    if (!isAllowedOrigin(origin)) {
      return jsonResponse({ error: 'Origin not allowed' }, 403, origin);
    }

    if (!env.OPENAI_API_KEY) {
      return jsonResponse({ error: 'Missing OPENAI_API_KEY secret' }, 500, origin);
    }

    let body;
    try {
      body = await request.json();
    } catch (error) {
      return jsonResponse({ error: 'Invalid JSON body' }, 400, origin);
    }

    const text = String(body.text || '').trim();
    const language = body.language === 'zh' ? 'zh' : 'en';
    const format = body.format === 'opus' ? 'opus' : 'mp3';
    const maxChars = Number(env.MAX_TTS_CHARS || 700);

    if (!text) return jsonResponse({ error: 'Missing text' }, 400, origin);
    if (text.length > maxChars) return jsonResponse({ error: 'Text is too long' }, 413, origin);

    const model = env.TTS_MODEL || 'gpt-4o-mini-tts';
    const voice = language === 'zh'
      ? (env.TTS_VOICE_ZH || env.TTS_VOICE || 'alloy')
      : (env.TTS_VOICE_EN || env.TTS_VOICE || 'alloy');
    const speed = Number(env.TTS_SPEED || 1);

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        voice,
        input: text,
        response_format: format,
        speed
      })
    });

    if (!response.ok) {
      const message = await response.text();
      return jsonResponse({ error: 'OpenAI TTS failed', detail: message.slice(0, 500) }, response.status, origin);
    }

    return new Response(response.body, {
      status: 200,
      headers: {
        ...corsHeaders(origin),
        'Content-Type': format === 'opus' ? 'audio/ogg' : 'audio/mpeg',
        'Cache-Control': 'no-store'
      }
    });
  }
};
