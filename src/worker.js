// Nut N But Prius — serves the static site (index.html, assets/) on nutnbutprius.com, plus:
//   · www → nutnbutprius.com and the Search Console verification file (assets turn /file.html into /file, Google needs it exact)
//   · bookings: by email (POST /api/book) and the ones sent by text (POST /api/book/log) are saved in D1 with their number
//   · counters: visits and taps on Book / Call / Text (POST /api/ev)
//   · the owner's private page /shop (password): calendar of every booking, confirm / done / cancel, add by hand
//   · a daily email at 8 AM Arizona with the day's bookings and the ones still to confirm
const GOOGLE_VERIFICATION = 'google0ec3fca49f063bff.html'; // Search Console, account martinezc2017, 24 nov 2026

// Booking by email (owner, 25 nov: he prefers text, email is the option): the customer's phone is required, the car's location
// optional. It goes to the secret BOOKING_TO (a verified Email Routing address: on the free plan Cloudflare only delivers to
// verified addresses). A test (header x-booking-test = secret BOOKING_TEST_KEY) goes to BOOKING_TEST_TO, never to the owner,
// and is not saved. EMAIL_BOOKING = "on" shows the option on the page.
const FROM = { email: 'bookings@nutnbutprius.com', name: 'Nut N But Prius website' };
const SITE = 'https://nutnbutprius.com';
const LOGO = SITE + '/assets/email-logo.jpg';
const LIMITS = { service: 60, year: 40, day: 60, date: 10, time: 20, name: 60, phone: 30, location: 120, notes: 400 };
const STATUSES = ['new', 'confirmed', 'done', 'no-show', 'canceled'];
const EVENTS = ['book_open', 'call', 'text', 'directions', 'facebook', 'email'];

// Booking number (Carlos, 25 nov): NNB-MMDD-XXXX, Arizona date + 4 characters with no look-alikes. The page makes the same
// kind for bookings sent by text.
const REF_CHARS = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const REF_RE = /^NNB-\d{4}-[2-9A-HJKMNP-Z]{4}$/;
const azDay = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Phoenix', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
function makeRef() {
  const md = azDay().slice(5).replace('-', '');
  return 'NNB-' + md + '-' + [...crypto.getRandomValues(new Uint8Array(4))].map(b => REF_CHARS[b % REF_CHARS.length]).join('');
}

const json = (body, status = 200, extra = {}) => new Response(JSON.stringify(body), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra } });
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ip = request => request.headers.get('cf-connecting-ip') || 'x';
async function limited(env, key) {
  if (!env.BOOK_LIMIT) return false;
  const { success } = await env.BOOK_LIMIT.limit({ key });
  return !success;
}
async function bump(env, key, n = 1) {
  if (!env.DB) return;
  await env.DB.prepare('INSERT INTO stats (day, key, n) VALUES (?1, ?2, ?3) ON CONFLICT (day, key) DO UPDATE SET n = n + ?3')
    .bind(azDay(), key, n).run();
}
function clean(b) {
  const f = {};
  for (const [k, max] of Object.entries(LIMITS)) f[k] = String(b[k] ?? '').replace(/[\r\n]+/g, k === 'notes' ? '\n' : ' ').trim().slice(0, max);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.date)) f.date = '';
  return f;
}
async function save(env, rec) {
  if (!env.DB) return;
  await env.DB.prepare(`INSERT OR IGNORE INTO bookings (ref, created, via, service, car, day, day_iso, slot, name, phone, location, notes, status)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, 'new')`)
    .bind(rec.ref, new Date().toISOString(), rec.via, rec.service, rec.year || null, rec.day || null, rec.date || null, rec.time || null,
      rec.name || null, rec.phone || null, rec.location || null, rec.notes || null).run();
}

// ---------- booking by email ----------
async function book(request, env, ctx) {
  const test = !!env.BOOKING_TEST_KEY && request.headers.get('x-booking-test') === env.BOOKING_TEST_KEY;
  if (env.EMAIL_BOOKING !== 'on' && !test) return json({ ok: false, error: 'off' }, 503);
  const to = test ? env.BOOKING_TEST_TO : env.BOOKING_TO;
  if (!env.EMAIL || !to) return json({ ok: false, error: 'not configured' }, 503);
  let b;
  try { b = await request.json(); } catch (_) { return json({ ok: false, error: 'bad request' }, 400); }
  if (b.website) return json({ ok: true }); // honeypot: bots fill the hidden field, people never see it
  const f = clean(b);
  const digits = f.phone.replace(/\D/g, '');
  if (!f.service || !f.year || !f.day || !f.name || digits.length < 10 || digits.length > 15) return json({ ok: false, error: 'missing' }, 400);
  if (await limited(env, 'book:' + ip(request))) return json({ ok: false, error: 'slow down' }, 429);
  const ref = makeRef();
  const rows = [['Booking #', ref], ['Service', f.service], [f.service === 'Buy a Prius' ? 'Looking for' : 'Car', f.year],
    ['When', [f.day, f.time].filter(Boolean).join(', ')], ['Name', f.name], ['Phone', f.phone],
    ['Location', f.location || '—'], ['Notes', f.notes || '—']];
  const tel = '+' + (digits.length === 10 ? '1' + digits : digits);
  const text = ['New booking request from nutnbutprius.com', ''].concat(rows.map(([k, v]) => k + ': ' + v),
    ['', 'Text or call the customer at ' + f.phone + ' to confirm the time.', 'All bookings: ' + SITE + '/shop']).join('\n');
  const html = '<div style="font:16px/1.5 Arial,sans-serif;color:#111">'
    + '<img src="' + LOGO + '" width="200" height="154" alt="Nut N But Prius" style="display:block;border-radius:12px;margin:0 0 14px">'
    + '<h2 style="margin:0 0 12px">New booking request</h2><table cellpadding="6" style="border-collapse:collapse">'
    + rows.map(([k, v]) => '<tr><td style="color:#666;vertical-align:top">' + k + '</td><td><b>' + esc(v).replace(/\n/g, '<br>') + '</b></td></tr>').join('')
    + '</table><p style="margin-top:18px"><a href="sms:' + tel + '" style="background:#ff6a00;color:#fff;padding:12px 18px;border-radius:24px;text-decoration:none;font-weight:bold">Text ' + esc(f.phone) + '</a>'
    + ' &nbsp; <a href="tel:' + tel + '" style="color:#ff6a00;font-weight:bold">Call</a> &nbsp; <a href="' + SITE + '/shop" style="color:#ff6a00;font-weight:bold">All bookings</a></p>'
    + '<p style="color:#888;font-size:13px">Sent from the Book Now window on nutnbutprius.com</p></div>';
  try {
    await env.EMAIL.send({ to, from: FROM, subject: (test ? '[TEST] ' : '') + 'New booking #' + ref + ': ' + f.service + ' · ' + f.year + ' · ' + f.name, text, html });
  } catch (e) {
    console.log('booking email failed', e && (e.code || e.message));
    return json({ ok: false, error: 'send failed' }, 502);
  }
  if (!test) ctx.waitUntil(Promise.all([save(env, { ...f, ref, via: 'email' }), bump(env, 'booking_email')]).catch(e => console.log('save failed', e.message)));
  return json({ ok: true, ref });
}

// ---------- booking sent by text: the page records it as the customer taps send (the text itself goes phone to phone) ----------
async function logText(request, env) {
  let b;
  try { b = JSON.parse(await request.text()); } catch (_) { return json({ ok: false }, 400); }
  if (b.website || !REF_RE.test(String(b.ref || ''))) return json({ ok: true });
  const f = clean(b);
  if (!f.service || !f.name) return json({ ok: false }, 400);
  if (await limited(env, 'log:' + ip(request))) return json({ ok: false }, 429);
  await save(env, { ...f, ref: b.ref, via: 'text', phone: '' });
  await bump(env, 'booking_text');
  return json({ ok: true });
}

// ---------- the owner's private page ----------
const enc = new TextEncoder();
async function sign(env, msg) {
  const key = await crypto.subtle.importKey('raw', enc.encode(env.SHOP_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return [...new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(msg)))].map(b => b.toString(16).padStart(2, '0')).join('');
}
function same(a, b) { // compare without stopping at the first difference
  const x = enc.encode(String(a)), y = enc.encode(String(b));
  let d = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) d |= (x[i] || 0) ^ (y[i] || 0);
  return d === 0;
}
async function signedIn(request, env) {
  if (!env.SHOP_SECRET) return false;
  const m = (request.headers.get('cookie') || '').match(/(?:^|;\s*)nnb_shop=(\d+)\.([0-9a-f]{64})/);
  if (!m || Number(m[1]) < Date.now()) return false;
  return same(m[2], await sign(env, 'shop:' + m[1]));
}
const NOINDEX = { 'x-robots-tag': 'noindex, nofollow', 'cache-control': 'no-store' };
function loginPage(error = '') {
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Shop · Nut N But Prius</title><link rel="icon" href="/favicon.ico">
<style>body{margin:0;min-height:100svh;display:grid;place-items:center;background:#060708;color:#f5f7fb;font:16px/1.4 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
form{width:min(360px,88vw);padding:28px;border-radius:22px;background:#11141a;box-shadow:inset 0 0 0 1px rgba(255,255,255,.1)}
img{width:72px;height:72px;border-radius:50%;box-shadow:0 0 0 3px #ff6a00;display:block;margin:0 auto 14px}h1{font-size:22px;text-align:center;margin:0 0 18px}
input{width:100%;box-sizing:border-box;padding:15px 16px;border:0;border-radius:14px;background:#1b1f27;color:#fff;font-size:17px;margin-bottom:14px}
button{width:100%;padding:15px;border:0;border-radius:999px;background:linear-gradient(90deg,#ffd23f,#ff9a1f,#ff6a00);color:#140600;font-weight:800;font-size:17px}
p{color:#ff9d8a;text-align:center;margin:0 0 12px}</style></head><body>
<form method="post" action="/shop/login"><img src="/assets/icon-192.png" alt=""><h1>Shop bookings</h1>${error ? '<p>' + esc(error) + '</p>' : ''}
<input type="password" name="password" placeholder="Password" autocomplete="current-password" required autofocus><button>Open</button></form></body></html>`,
  { status: error ? 401 : 200, headers: { 'content-type': 'text/html; charset=utf-8', ...NOINDEX } });
}
async function login(request, env) {
  if (await limited(env, 'login:' + ip(request))) return loginPage('Too many tries. Wait a minute.');
  const form = await request.formData();
  if (!env.SHOP_PASSWORD || !same(String(form.get('password') || '').trim(), env.SHOP_PASSWORD)) return loginPage('Wrong password.');
  const exp = Date.now() + 180 * 864e5; // 6 months on that phone
  return new Response(null, { status: 303, headers: { location: '/shop/', ...NOINDEX,
    'set-cookie': `nnb_shop=${exp}.${await sign(env, 'shop:' + exp)}; Path=/; Max-Age=${180 * 86400}; HttpOnly; Secure; SameSite=Strict` } });
}

async function shopData(url, env) {
  const today = azDay();
  const from = /^\d{4}-\d{2}-\d{2}$/.test(url.searchParams.get('from') || '') ? url.searchParams.get('from') : today.slice(0, 8) + '01';
  const to = /^\d{4}-\d{2}-\d{2}$/.test(url.searchParams.get('to') || '') ? url.searchParams.get('to') : today.slice(0, 8) + '31';
  const week = azDay(new Date(Date.now() - 6 * 864e5)), month = azDay(new Date(Date.now() - 29 * 864e5));
  const in7 = azDay(new Date(Date.now() + 6 * 864e5));
  const [inRange, pending, noDate, stats, coming] = await env.DB.batch([
    env.DB.prepare('SELECT * FROM bookings WHERE day_iso BETWEEN ?1 AND ?2 ORDER BY day_iso, exact_time, slot').bind(from, to),
    env.DB.prepare("SELECT * FROM bookings WHERE status = 'new' AND (day_iso IS NULL OR day_iso >= ?1) ORDER BY day_iso").bind(today),
    env.DB.prepare("SELECT * FROM bookings WHERE day_iso IS NULL AND status NOT IN ('done','canceled') ORDER BY created DESC LIMIT 50"),
    env.DB.prepare(`SELECT key, SUM(CASE WHEN day = ?1 THEN n ELSE 0 END) AS today, SUM(CASE WHEN day >= ?2 THEN n ELSE 0 END) AS week,
      SUM(n) AS month FROM stats WHERE day >= ?3 GROUP BY key`).bind(today, week, month),
    env.DB.prepare("SELECT COUNT(*) AS n FROM bookings WHERE day_iso BETWEEN ?1 AND ?2 AND status IN ('new','confirmed')").bind(today, in7),
  ]);
  const s = {};
  for (const r of stats.results) s[r.key] = { today: r.today, week: r.week, month: r.month };
  return json({ today, coming: coming.results[0].n, bookings: inRange.results, pending: pending.results, noDate: noDate.results, stats: s }, 200, NOINDEX);
}
async function shopAdd(request, env) {
  let b;
  try { b = await request.json(); } catch (_) { return json({ ok: false }, 400); }
  const f = clean(b);
  if (!f.service || !f.name) return json({ ok: false, error: 'missing' }, 400);
  const ref = makeRef();
  await save(env, { ...f, ref, via: 'manual' });
  if (/^\d{2}:\d{2}$/.test(b.exact_time || '')) {
    await env.DB.prepare("UPDATE bookings SET exact_time = ?1, status = 'confirmed', updated = ?2 WHERE ref = ?3").bind(b.exact_time, new Date().toISOString(), ref).run();
  }
  return json({ ok: true, ref }, 200, NOINDEX);
}
async function shopUpdate(request, env, ref) {
  if (!REF_RE.test(ref)) return json({ ok: false }, 400);
  let b;
  try { b = await request.json(); } catch (_) { return json({ ok: false }, 400); }
  const sets = [], vals = [];
  if (b.status !== undefined) { if (!STATUSES.includes(b.status)) return json({ ok: false }, 400); sets.push('status'); vals.push(b.status); }
  if (b.exact_time !== undefined) { sets.push('exact_time'); vals.push(/^\d{2}:\d{2}$/.test(b.exact_time) ? b.exact_time : null); }
  if (b.day_iso !== undefined) { sets.push('day_iso'); vals.push(/^\d{4}-\d{2}-\d{2}$/.test(b.day_iso) ? b.day_iso : null); }
  if (b.owner_note !== undefined) { sets.push('owner_note'); vals.push(String(b.owner_note).slice(0, 500)); }
  if (b.phone !== undefined) { sets.push('phone'); vals.push(String(b.phone).slice(0, 30)); }
  if (!sets.length) return json({ ok: false }, 400);
  const sql = 'UPDATE bookings SET ' + sets.map((k, i) => k + ' = ?' + (i + 1)).join(', ') + ', updated = ?' + (sets.length + 1) + ' WHERE ref = ?' + (sets.length + 2);
  const r = await env.DB.prepare(sql).bind(...vals, new Date().toISOString(), ref).run();
  return json({ ok: r.meta.changes === 1 }, 200, NOINDEX);
}

// ---------- 8 AM Arizona: the day's bookings + the ones still to confirm ----------
async function dailyEmail(env, to = env.BOOKING_TO, test = false) {
  if (!env.DB || !env.EMAIL || !to) return 'not configured';
  const today = azDay();
  const [day, pend] = await env.DB.batch([
    env.DB.prepare("SELECT * FROM bookings WHERE day_iso = ?1 AND status IN ('new','confirmed') ORDER BY exact_time, slot").bind(today),
    env.DB.prepare("SELECT * FROM bookings WHERE status = 'new' AND (day_iso IS NULL OR day_iso >= ?1) ORDER BY day_iso").bind(today),
  ]);
  if (!day.results.length && !pend.results.length && !test) return 'nothing today'; // nothing to say: no email
  const line = b => `${b.exact_time || b.slot || ''} · ${b.name || ''} · ${b.service}${b.car ? ' · ' + b.car : ''} · #${b.ref}${b.status === 'new' ? ' (to confirm)' : ''}`;
  const lines = ['Good morning! Here is today at Nut N But Prius.', '', 'TODAY (' + today + '):']
    .concat(day.results.length ? day.results.map(line) : ['No bookings for today.'], ['', 'STILL TO CONFIRM:'],
      pend.results.length ? pend.results.map(b => (b.day || 'no day') + ' · ' + line(b)) : ['None.'], ['', 'Open your calendar: ' + SITE + '/shop']);
  const html = '<div style="font:16px/1.5 Arial,sans-serif;color:#111"><img src="' + LOGO + '" width="160" height="123" alt="" style="display:block;border-radius:10px;margin:0 0 12px">'
    + lines.map(l => /^(TODAY|STILL)/.test(l) ? '<h3 style="margin:16px 0 6px">' + esc(l) + '</h3>' : l ? '<div>' + esc(l) + '</div>' : '').join('')
    + '<p><a href="' + SITE + '/shop" style="background:#ff6a00;color:#fff;padding:12px 18px;border-radius:24px;text-decoration:none;font-weight:bold">Open calendar</a></p></div>';
  await env.EMAIL.send({ to, from: FROM, subject: (test ? '[TEST] ' : '') + `Today: ${day.results.length} booking${day.results.length === 1 ? '' : 's'} · ${pend.results.length} to confirm`, text: lines.join('\n'), html });
  return 'sent';
}

const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|lighthouse|headless|pingdom|monitor/i;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    if (url.hostname === 'www.nutnbutprius.com') {
      url.hostname = 'nutnbutprius.com';
      return Response.redirect(url.toString(), 301);
    }
    if (path === '/' + GOOGLE_VERIFICATION) {
      return new Response('google-site-verification: ' + GOOGLE_VERIFICATION, { headers: { 'content-type': 'text/html; charset=utf-8' } });
    }
    // public API
    if (path === '/api/book') {
      if (request.method === 'GET') return json({ email: env.EMAIL_BOOKING === 'on' });
      if (request.method === 'POST') return book(request, env, ctx);
      return json({ ok: false }, 405);
    }
    if (path === '/api/book/log' && request.method === 'POST') return logText(request, env);
    // test of the 8 AM email: goes to BOOKING_TEST_TO, never to the owner
    if (path === '/api/daily-test' && request.method === 'POST') {
      if (!env.BOOKING_TEST_KEY || request.headers.get('x-booking-test') !== env.BOOKING_TEST_KEY) return json({ ok: false }, 403);
      return json({ ok: true, result: await dailyEmail(env, env.BOOKING_TEST_TO, true) });
    }
    if (path === '/api/ev' && request.method === 'POST') {
      const e = (await request.text()).slice(0, 20);
      if (EVENTS.includes(e) && !BOT.test(request.headers.get('user-agent') || '')) ctx.waitUntil(bump(env, e).catch(() => {}));
      return new Response(null, { status: 204 });
    }
    // the owner's page: everything under /shop needs the password
    if (path === '/shop' || path.startsWith('/shop/') || path.startsWith('/api/shop/')) {
      if (path === '/shop/login' && request.method === 'POST') return login(request, env);
      if (path === '/shop/logout') return new Response(null, { status: 303, headers: { location: '/shop/', ...NOINDEX, 'set-cookie': 'nnb_shop=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict' } });
      const ok = await signedIn(request, env);
      if (path.startsWith('/api/shop/')) {
        if (!ok) return json({ ok: false, error: 'login' }, 401, NOINDEX);
        if (!env.DB) return json({ ok: false, error: 'no db' }, 503, NOINDEX);
        if (path === '/api/shop/data' && request.method === 'GET') return shopData(url, env);
        if (path === '/api/shop/booking' && request.method === 'POST') return shopAdd(request, env);
        const m = path.match(/^\/api\/shop\/booking\/([A-Z0-9-]+)$/);
        if (m && request.method === 'PATCH') return shopUpdate(request, env, m[1]);
        return json({ ok: false }, 404, NOINDEX);
      }
      if (path === '/shop') return Response.redirect(url.origin + '/shop/', 301);
      if (!ok) return loginPage();
      const res = await env.ASSETS.fetch(request);
      const out = new Response(res.body, res);
      for (const [k, v] of Object.entries(NOINDEX)) out.headers.set(k, v);
      return out;
    }
    // a visit = a person opening the page (not bots, not reloads of files)
    if (request.method === 'GET' && (path === '/' || path === '/index.html') && !BOT.test(request.headers.get('user-agent') || '')
        && (request.headers.get('accept') || '').includes('text/html')) {
      ctx.waitUntil(bump(env, 'visit').catch(() => {}));
    }
    return env.ASSETS.fetch(request);
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(dailyEmail(env).catch(e => console.log('daily email failed', e.message)));
  },
};
