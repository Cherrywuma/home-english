const SITE_ORIGIN = 'https://cherrywuma.github.io';
const SITE_BASE = '/home-english';
const TTS_UPSTREAM = 'https://home-english-teacher-tts.cherryyijiatec.workers.dev';
const COOKIE_NAME = 'home_english_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14;

function htmlResponse(html, status = 200, headers = {}) {
  return new Response(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      ...headers
    }
  });
}

function redirect(location, headers = {}) {
  return new Response(null, {
    status: 302,
    headers: {
      Location: location,
      'Cache-Control': 'no-store',
      ...headers
    }
  });
}

function loginPage(message = '') {
  return htmlResponse(`<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Home English 登录</title>
<style>
  body{margin:0;min-height:100vh;display:grid;place-items:center;background:#FBF8F2;color:#221F1B;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;}
  main{width:min(390px,calc(100vw - 32px));background:#fff;border:1px solid #ECE4D6;border-radius:14px;padding:24px;box-shadow:0 8px 24px rgba(60,45,20,.08);}
  h1{font-family:Georgia,"Times New Roman","Songti SC",serif;font-weight:500;margin:0 0 8px;font-size:1.65rem;}
  p{margin:0 0 16px;color:#7C756B;line-height:1.55;}
  label{display:block;font-size:.82rem;font-weight:800;color:#7C756B;margin-bottom:7px;}
  input{width:100%;box-sizing:border-box;border:1px solid #ECE4D6;border-radius:10px;padding:12px 13px;font:inherit;}
  button{width:100%;margin-top:12px;border:none;border-radius:999px;background:#2E8B6B;color:#fff;font:inherit;font-weight:800;padding:12px 16px;cursor:pointer;}
  .err{margin:0 0 12px;color:#B0573A;background:#FFF4EF;border:1px solid #F0D7CB;border-radius:10px;padding:9px 11px;font-weight:700;}
</style>
</head>
<body>
<main>
  <h1>Home English</h1>
  <p>输入密码后进入学习页面。</p>
  ${message ? `<div class="err">${message}</div>` : ''}
  <form method="post" action="/login">
    <label for="password">密码</label>
    <input id="password" name="password" type="password" autocomplete="current-password" autofocus>
    <button type="submit">进入</button>
  </form>
</main>
</body>
</html>`);
}

function getCookie(request, name) {
  const cookie = request.headers.get('Cookie') || '';
  return cookie.split(';').map(item => item.trim()).find(item => item.startsWith(`${name}=`))?.slice(name.length + 1) || '';
}

async function hmac(secret, value) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return [...new Uint8Array(sig)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

async function makeSession(secret) {
  const expires = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const nonce = crypto.randomUUID();
  const payload = `${expires}.${nonce}`;
  return `${payload}.${await hmac(secret, payload)}`;
}

async function isValidSession(request, secret) {
  const session = getCookie(request, COOKIE_NAME);
  const parts = session.split('.');
  if (parts.length !== 3) return false;
  const [expires, nonce, sig] = parts;
  if (!expires || !nonce || !sig || Number(expires) < Math.floor(Date.now() / 1000)) return false;
  const expected = await hmac(secret, `${expires}.${nonce}`);
  return expected === sig;
}

async function handleLogin(request, env) {
  const form = await request.formData();
  const password = String(form.get('password') || '');
  if (!env.SITE_PASSWORD) return loginPage('还没有配置网站密码。', 500);
  if (password !== env.SITE_PASSWORD) return loginPage('密码不对，请再试一次。', 401);
  const session = await makeSession(env.SITE_PASSWORD);
  return redirect('/', {
    'Set-Cookie': `${COOKIE_NAME}=${session}; Max-Age=${SESSION_TTL_SECONDS}; Path=/; HttpOnly; Secure; SameSite=Lax`
  });
}

async function proxySite(request) {
  const url = new URL(request.url);
  const target = new URL(`${SITE_ORIGIN}${SITE_BASE}${url.pathname === '/' ? '/' : url.pathname}${url.search}`);
  const response = await fetch(target.toString(), {
    method: request.method,
    headers: request.headers
  });
  const headers = new Headers(response.headers);
  headers.delete('Content-Security-Policy');
  headers.set('Cache-Control', response.headers.get('Content-Type')?.includes('text/html') ? 'no-store' : 'public, max-age=600');
  return new Response(response.body, {
    status: response.status,
    headers
  });
}

async function proxyTts(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
    });
  }

  const upstream = await fetch(TTS_UPSTREAM, {
    method: 'POST',
    headers: {
      'Content-Type': request.headers.get('Content-Type') || 'application/json',
      'Origin': 'https://home-english-private.cherryyijiatec.workers.dev'
    },
    body: request.body
  });

  const headers = new Headers();
  headers.set('Content-Type', upstream.headers.get('Content-Type') || 'application/octet-stream');
  headers.set('Cache-Control', 'no-store');
  return new Response(upstream.body, {
    status: upstream.status,
    headers
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/login' && request.method === 'POST') return handleLogin(request, env);
    if (url.pathname === '/logout') {
      return redirect('/login', {
        'Set-Cookie': `${COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`
      });
    }
    if (!env.SITE_PASSWORD) return loginPage('还没有配置网站密码。');
    if (!(await isValidSession(request, env.SITE_PASSWORD))) return loginPage();
    if (url.pathname === '/tts') return proxyTts(request);
    return proxySite(request);
  }
};
