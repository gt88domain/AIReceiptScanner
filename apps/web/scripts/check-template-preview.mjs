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

const root = await expectResponse(`${webUrl}/`, undefined, 200);
if (!root.headers.get("content-type")?.includes("text/html")) {
  throw new Error("Template preview root did not return HTML");
}

const robots = await expectResponse(`${webUrl}/robots.txt`, undefined, 200);
if ((await robots.text()) !== "User-agent: *\nDisallow: /\n") {
  throw new Error("Template preview robots.txt does not block crawlers");
}

await expectResponse(`${webUrl}/sitemap.xml`, undefined, 404);

const server = await expectResponse(`${serverUrl}/`, undefined, 200);
if ((await server.json()).readOnly !== true) {
  throw new Error("Template preview API is not read-only");
}

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
