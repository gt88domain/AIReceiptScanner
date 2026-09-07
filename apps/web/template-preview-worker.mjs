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

    const requestHeaders = new Headers(request.headers);
    requestHeaders.delete("Authorization");
    requestHeaders.delete("Cookie");
    const response = await app.fetch(new Request(request, { headers: requestHeaders }), env, ctx);
    const headers = new Headers(response.headers);
    headers.delete("Set-Cookie");
    for (const [name, value] of Object.entries(noIndexHeaders)) headers.set(name, value);
    return new Response(response.body, {
      headers,
      status: response.status,
      statusText: response.statusText,
    });
  },
};
