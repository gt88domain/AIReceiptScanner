import applicationWorker from "./index";

const publicReadPath = /^(?:\/rpc\/(?:novels|worlds|forums)|\/mobile\/v1)(?:\/|$)/;

/**
 * Remote preview guard.
 *
 * The preview shares the existing public D1 read model, so its external
 * surface is deliberately narrower than the application Worker: no auth,
 * billing, administration, storage, or mutation route is reachable. Cookies
 * and authorization headers are removed before the product handler sees a
 * request, preventing preview traffic from carrying a production session.
 */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (!publicReadPath.test(url.pathname)) {
      return new Response("Not found", { status: 404 });
    }

    const headers = new Headers(request.headers);
    headers.delete("authorization");
    headers.delete("cookie");
    return applicationWorker.fetch!(new Request(request, { headers }) as never, env, ctx);
  },
} satisfies ExportedHandler<Cloudflare.Env>;
