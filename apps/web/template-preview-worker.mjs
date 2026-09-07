import app from "./dist/server/index.js";

const noIndexHeaders = {
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow",
};

// AINovel preview allowlist: the public reader surface must be reachable for
// acceptance testing before the domain switch (docs/plans/ainovel-v2-rebuild.md).
const allowedPreviewRoutes = new Set(["/", "/design-system", "/sitemap.xml"]);
const allowedPreviewPrefixes = [
  "/announcements",
  "/categories",
  "/forums",
  "/help",
  "/library",
  "/novels",
  "/ranking",
  "/resources",
  "/tags",
  "/worlds",
];

function isAllowedPreviewRoute(pathname) {
  const normalizedPath = pathname.length > 1 ? pathname.replace(/\/+$/u, "") : pathname;
  return (
    allowedPreviewRoutes.has(normalizedPath) ||
    normalizedPath === "/blog" ||
    normalizedPath === "/docs" ||
    allowedPreviewPrefixes.some((prefix) => `${normalizedPath}/`.startsWith(prefix))
  );
}

function previewResponse(body, init = {}) {
  const headers = new Headers(init.headers);
  for (const [name, value] of Object.entries(noIndexHeaders)) headers.set(name, value);
  return new Response(body, { ...init, headers });
}

function readOnlyResponse() {
  return previewResponse(JSON.stringify({ error: "template_preview_read_only" }), {
    headers: { "Content-Type": "application/json" },
    status: 404,
  });
}

// The preview surface is anonymous and read-only (cookies and Authorization
// are stripped below), so SSR output is safe to serve from the edge cache.
// Browsers keep no-store; only the edge copy gets a TTL.
const EDGE_CACHE_TTL_SECONDS = 300;
const cacheableContentTypes = ["text/html", "application/xml", "text/xml"];

function isCacheableResponse(response) {
  if (response.status !== 200) return false;
  const contentType = response.headers.get("Content-Type") ?? "";
  return cacheableContentTypes.some((type) => contentType.includes(type));
}

async function handleGet(request, env, ctx) {
  const cacheKey = new Request(request.url, { method: "GET" });
  const cache = caches.default;

  const cached = await cache.match(cacheKey);
  if (cached) {
    const headers = new Headers(cached.headers);
    headers.set("Cache-Control", noIndexHeaders["Cache-Control"]);
    headers.set("X-Edge-Cache", "HIT");
    return new Response(cached.body, { headers, status: cached.status });
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete("Authorization");
  requestHeaders.delete("Cookie");
  const response = await app.fetch(new Request(request, { headers: requestHeaders }), env, ctx);
  const headers = new Headers(response.headers);
  headers.delete("Set-Cookie");
  for (const [name, value] of Object.entries(noIndexHeaders)) headers.set(name, value);
  headers.set("X-Edge-Cache", "MISS");

  if (isCacheableResponse(response)) {
    const cacheHeaders = new Headers(headers);
    cacheHeaders.set(
      "Cache-Control",
      `public, max-age=${EDGE_CACHE_TTL_SECONDS}, stale-while-revalidate=${EDGE_CACHE_TTL_SECONDS * 2}`,
    );
    const edgeCopy = new Response(response.clone().body, {
      headers: cacheHeaders,
      status: response.status,
    });
    ctx.waitUntil(cache.put(cacheKey, edgeCopy));
  }

  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
}

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);
    if (pathname === "/robots.txt") {
      // Keep search engines away from the preview deployment entirely; the
      // real robots.txt only goes live with the production worker.
      return previewResponse("User-agent: *\nDisallow: /\n");
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      return readOnlyResponse();
    }
    if (!isAllowedPreviewRoute(pathname)) {
      return previewResponse("Not Found", { status: 404 });
    }
    return handleGet(request, env, ctx);
  },
};
