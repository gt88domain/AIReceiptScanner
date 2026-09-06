import { createFileRoute } from "@tanstack/react-router";
import { redirectLegacyNovel } from "@/modules/novels/legacy-redirects";

export const Route = createFileRoute("/novel/$slug")({
  server: { handlers: { GET: ({ request, params }) => redirectLegacyNovel(request, params.slug) } },
});
