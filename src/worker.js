// Nut N But Prius — serves the static site (index.html, assets/) on nutnbutprius.com.
// Logic: www.nutnbutprius.com → nutnbutprius.com (one address for Google), the Search Console verification file, everything
// else is a file. The verification file is served here and not as an asset because assets turn /file.html into /file and
// Google needs the exact address (same lesson as homethatshines.net).
const GOOGLE_VERIFICATION = 'google0ec3fca49f063bff.html'; // Search Console, account martinezc2017, 24 nov 2026

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
    return env.ASSETS.fetch(request);
  },
};
