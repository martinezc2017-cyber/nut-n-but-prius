// Nut N But Prius — serves the static site (index.html, assets/) on nutnbutprius.com.
// Logic: www.nutnbutprius.com → nutnbutprius.com (one address for Google), the Search Console verification file, the booking
// by email (/api/book), everything else is a file. The verification file is served here and not as an asset because assets
// turn /file.html into /file and Google needs the exact address (same lesson as homethatshines.net).
const GOOGLE_VERIFICATION = 'google0ec3fca49f063bff.html'; // Search Console, account martinezc2017, 24 nov 2026

// Booking by email (owner, 25 nov: he prefers text, email is the option): the customer's phone is required, the car's
// location optional. Where it goes is the secret BOOKING_TO (a verified Email Routing address of this account: on the free
// plan Cloudflare only delivers to verified addresses, which is also what keeps this from mailing anyone else). EMAIL_BOOKING
// = "on" shows the option on the page; until the owner verifies his address it stays "off".
const FROM = { email: 'bookings@nutnbutprius.com', name: 'Nut N But Prius website' };
const LIMITS = { service: 60, year: 40, day: 60, time: 20, name: 60, phone: 30, location: 120, notes: 400 };

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

async function book(request, env) {
  if (env.EMAIL_BOOKING !== 'on' && request.headers.get('x-booking-test') !== env.BOOKING_TEST_KEY) {
    return json({ ok: false, error: 'off' }, 503);
  }
  if (!env.EMAIL || !env.BOOKING_TO) return json({ ok: false, error: 'not configured' }, 503);
  let b;
  try { b = await request.json(); } catch (_) { return json({ ok: false, error: 'bad request' }, 400); }
  if (b.website) return json({ ok: true }); // honeypot: bots fill the hidden field, people never see it
  const f = {};
  for (const [k, max] of Object.entries(LIMITS)) f[k] = String(b[k] ?? '').replace(/[\r\n]+/g, k === 'notes' ? '\n' : ' ').trim().slice(0, max);
  const digits = f.phone.replace(/\D/g, '');
  if (!f.service || !f.year || !f.day || !f.name || digits.length < 10 || digits.length > 15) {
    return json({ ok: false, error: 'missing' }, 400);
  }
  if (env.BOOK_LIMIT) {
    const { success } = await env.BOOK_LIMIT.limit({ key: request.headers.get('cf-connecting-ip') || 'x' });
    if (!success) return json({ ok: false, error: 'slow down' }, 429);
  }
  const rows = [['Service', f.service], [f.service === 'Buy a Prius' ? 'Looking for' : 'Car', f.year],
    ['When', [f.day, f.time].filter(Boolean).join(', ')], ['Name', f.name], ['Phone', f.phone],
    ['Location', f.location || '—'], ['Notes', f.notes || '—']];
  const tel = '+' + (digits.length === 10 ? '1' + digits : digits);
  const text = ['New booking request from nutnbutprius.com', '']
    .concat(rows.map(([k, v]) => k + ': ' + v), ['', 'Text or call the customer at ' + f.phone + ' to confirm the time.']).join('\n');
  const html = '<div style="font:16px/1.5 Arial,sans-serif;color:#111"><h2 style="margin:0 0 12px">New booking request</h2>'
    + '<table cellpadding="6" style="border-collapse:collapse">'
    + rows.map(([k, v]) => '<tr><td style="color:#666;vertical-align:top">' + k + '</td><td><b>' + esc(v).replace(/\n/g, '<br>') + '</b></td></tr>').join('')
    + '</table><p style="margin-top:18px"><a href="sms:' + tel + '" style="background:#ff6a00;color:#fff;padding:12px 18px;border-radius:24px;text-decoration:none;font-weight:bold">Text ' + esc(f.phone) + '</a>'
    + ' &nbsp; <a href="tel:' + tel + '" style="color:#ff6a00;font-weight:bold">Call</a></p>'
    + '<p style="color:#888;font-size:13px">Sent from the Book Now window on nutnbutprius.com</p></div>';
  try {
    await env.EMAIL.send({ to: env.BOOKING_TO, from: FROM, subject: 'New booking: ' + f.service + ' · ' + f.year + ' · ' + f.name, text, html });
  } catch (e) {
    console.log('booking email failed', e && (e.code || e.message));
    return json({ ok: false, error: 'send failed' }, 502);
  }
  return json({ ok: true });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname === 'www.nutnbutprius.com') {
      url.hostname = 'nutnbutprius.com';
      return Response.redirect(url.toString(), 301);
    }
    if (url.pathname === '/' + GOOGLE_VERIFICATION) {
      return new Response('google-site-verification: ' + GOOGLE_VERIFICATION, { headers: { 'content-type': 'text/html; charset=utf-8' } });
    }
    if (url.pathname === '/api/book') {
      if (request.method === 'GET') return json({ email: env.EMAIL_BOOKING === 'on' });
      if (request.method === 'POST') return book(request, env);
      return json({ ok: false }, 405);
    }
    return env.ASSETS.fetch(request);
  },
};
