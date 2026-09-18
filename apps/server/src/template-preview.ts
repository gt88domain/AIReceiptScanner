import { os } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";

const previewHeaders = {
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow",
};
const previewWebOrigin = "https://easystarter-template-preview.gt88hel.workers.dev";
const rpcHandler = new RPCHandler({
  getCurrentUser: os.handler(() => null),
});

function responseHeaders(request: Request) {
  const headers = new Headers(previewHeaders);
  if (request.headers.get("Origin") === previewWebOrigin) {
    headers.set("Access-Control-Allow-Credentials", "true");
    headers.set("Access-Control-Allow-Headers", "Content-Type");
    headers.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS, POST");
    headers.set("Access-Control-Allow-Origin", previewWebOrigin);
    headers.set("Vary", "Origin");
  }
  return headers;
}

function withPreviewHeaders(response: Response, headers: Headers) {
  const nextHeaders = new Headers(response.headers);
  for (const [name, value] of headers) nextHeaders.set(name, value);
  return new Response(response.body, {
    headers: nextHeaders,
    status: response.status,
    statusText: response.statusText,
  });
}

export async function handleTemplatePreviewRequest(request: Request) {
  const { pathname } = new URL(request.url);
  const headers = responseHeaders(request);
  if (
    request.method === "OPTIONS" &&
    (pathname === "/api/auth/get-session" || pathname === "/rpc/getCurrentUser")
  ) {
    return new Response(null, { headers, status: 204 });
  }
  if (request.method === "GET" && pathname === "/") {
    return Response.json(
      { status: "ok", service: "EasyStarter template preview API", readOnly: true },
      { headers },
    );
  }
  if (request.method === "GET" && pathname === "/api/auth/get-session") {
    return Response.json(null, { headers });
  }
  if (request.method === "POST" && pathname === "/rpc/getCurrentUser") {
    const result = await rpcHandler.handle(request, { prefix: "/rpc" });
    if (result.matched) return withPreviewHeaders(result.response, headers);
  }

  return Response.json({ error: "template_preview_read_only" }, { headers, status: 404 });
}

export default {
  fetch(request) {
    return handleTemplatePreviewRequest(request);
  },
} satisfies ExportedHandler;
