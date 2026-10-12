/**
 * Entry point for hosting on Cloudflare Workers.
 * Everything is static, so the asset binding serves the whole site.
 * Unknown paths fall back to index (single-page site).
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const res = await env.ASSETS.fetch(request);
    if (res.status === 404 && !url.pathname.includes('.')) {
      return env.ASSETS.fetch(new Request(new URL('/index.html', url.origin), request));
    }
    return res;
  }
};
