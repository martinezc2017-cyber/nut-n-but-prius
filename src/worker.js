// Nut N But Prius — serves the static site (index.html, assets/) on nutnbutprius.com.
// The only logic: www.nutnbutprius.com → nutnbutprius.com (one address for Google), everything else is a file.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname === 'www.nutnbutprius.com') {
      url.hostname = 'nutnbutprius.com';
      return Response.redirect(url.toString(), 301);
    }
    return env.ASSETS.fetch(request);
  },
};
