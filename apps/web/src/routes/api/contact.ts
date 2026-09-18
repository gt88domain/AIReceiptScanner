import { env } from "cloudflare:workers";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/contact")({
  server: {
    handlers: {
      POST: ({ request }) => {
        const forwarded = new Request(new URL("/api/contact", request.url), request);
        forwarded.headers.delete("cookie");
        forwarded.headers.delete("authorization");
        return env.API_SERVICE.fetch(forwarded);
      },
    },
  },
});
