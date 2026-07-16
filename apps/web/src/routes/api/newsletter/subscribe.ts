import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";

export const Route = createFileRoute("/api/newsletter/subscribe")({
  server: {
    handlers: {
      POST: ({ request }) =>
        env.API_SERVICE.fetch(
          new Request("https://api.demo.aiarticles.com/api/newsletter/subscribe", request),
        ),
    },
  },
});
