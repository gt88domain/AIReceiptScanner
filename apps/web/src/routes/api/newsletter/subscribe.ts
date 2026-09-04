import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";

export const Route = createFileRoute("/api/newsletter/subscribe")({
  server: {
    handlers: {
      POST: ({ request }) => {
        const forwarded = new Request(new URL("/api/newsletter/subscribe", request.url), request);
        forwarded.headers.delete("cookie");
        forwarded.headers.delete("authorization");
        return env.API_SERVICE.fetch(forwarded);
      },
    },
  },
});
