import { env } from "cloudflare:workers";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/contact")({
  server: {
    handlers: {
      POST: ({ request }) =>
        env.API_SERVICE.fetch(new Request(new URL("/api/contact", request.url), request)),
    },
  },
});
