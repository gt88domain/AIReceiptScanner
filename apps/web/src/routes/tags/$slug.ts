import { createFileRoute } from "@tanstack/react-router";
import { redirectLegacyTag } from "@/modules/novels/legacy-redirects";

export const Route = createFileRoute("/tags/$slug")({
  server: { handlers: { GET: ({ request, params }) => redirectLegacyTag(request, params.slug) } },
});
