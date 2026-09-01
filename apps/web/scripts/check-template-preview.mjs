const webUrl = "https://easystarter-template-preview.gt88hel.workers.dev";
const serverUrl = "https://easystarter-template-server-preview.gt88hel.workers.dev";

async function expectResponse(url, options, expectedStatus) {
  const response = await fetch(url, options);
  if (response.status !== expectedStatus) {
    throw new Error(
      `${options?.method ?? "GET"} ${url} returned ${response.status}, expected ${expectedStatus}`,
    );
  }
  if (response.headers.get("x-robots-tag") !== "noindex, nofollow") {
    throw new Error(`${url} is missing the preview noindex header`);
  }
  return response;
}

const root = await expectResponse(
  `${webUrl}/`,
  { headers: { Authorization: "Bearer must-not-reach-preview", Cookie: "session=blocked" } },
  200,
);
if (!root.headers.get("content-type")?.includes("text/html")) {
  throw new Error("Template preview root did not return HTML");
}
if (root.headers.has("set-cookie")) {
  throw new Error("Template preview returned a session cookie");
}
const rootHtml = await root.text();
if (/©\s*1970\b/.test(rootHtml)) {
  throw new Error("Template preview Footer rendered the Worker epoch year");
}

const robots = await expectResponse(`${webUrl}/robots.txt`, undefined, 200);
if ((await robots.text()) !== "User-agent: *\nDisallow: /\n") {
  throw new Error("Template preview robots.txt does not block crawlers");
}

await expectResponse(`${webUrl}/sitemap.xml`, undefined, 404);
await expectResponse(`${webUrl}/does-not-exist`, undefined, 404);
await expectResponse(`${webUrl}/auth/sign-in`, undefined, 404);
await expectResponse(`${webUrl}/dashboard`, undefined, 404);
await expectResponse(`${webUrl}/blogger`, undefined, 404);

// The dev-only gallery is exposed on the preview build via VITE_TEMPLATE_PREVIEW=true.
await expectResponse(`${webUrl}/design-system`, undefined, 200);

const server = await expectResponse(`${serverUrl}/`, undefined, 200);
if ((await server.json()).readOnly !== true) {
  throw new Error("Template preview API is not read-only");
}

const session = await expectResponse(
  `${serverUrl}/api/auth/get-session`,
  { headers: { Origin: webUrl } },
  200,
);
if ((await session.json()) !== null) {
  throw new Error("Template preview auth session is not anonymous");
}
if (session.headers.get("access-control-allow-origin") !== webUrl) {
  throw new Error("Template preview auth session is missing its exact CORS origin");
}

const currentUser = await expectResponse(
  `${serverUrl}/rpc/getCurrentUser`,
  {
    body: "{}",
    headers: { "content-type": "application/json", Origin: webUrl },
    method: "POST",
  },
  200,
);
if (JSON.stringify(await currentUser.json()) !== JSON.stringify({ json: null })) {
  throw new Error("Template preview oRPC user is not anonymous");
}
if (currentUser.headers.get("access-control-allow-origin") !== webUrl) {
  throw new Error("Template preview oRPC user is missing its exact CORS origin");
}

await expectResponse(
  `${serverUrl}/rpc/getCurrentUser`,
  { headers: { Origin: webUrl }, method: "OPTIONS" },
  204,
);

const subscribe = await expectResponse(
  `${webUrl}/api/newsletter/subscribe`,
  {
    body: JSON.stringify({ email: "preview-check@example.invalid", turnstileToken: "preview" }),
    headers: { "content-type": "application/json" },
    method: "POST",
  },
  404,
);
if ((await subscribe.json()).error !== "template_preview_read_only") {
  throw new Error("Template preview newsletter route reached a writable API");
}

console.log("Template Cloudflare preview check passed.");
