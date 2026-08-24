import app from "./dist/server/index.js";

const noIndexHeaders = {
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow",
};

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);
    if (pathname === "/robots.txt") {
      return new Response("User-agent: *\nDisallow: /\n", { headers: noIndexHeaders });
    }
    if (pathname === "/sitemap.xml") {
      return new Response("Not Found", { headers: noIndexHeaders, status: 404 });
    }

    const response = await app.fetch(request, env, ctx);
    const headers = new Headers(response.headers);
    for (const [name, value] of Object.entries(noIndexHeaders)) headers.set(name, value);
    return new Response(response.body, {
      headers,
      status: response.status,
      statusText: response.statusText,
    });
  },
};
