import { createFileRoute } from "@tanstack/react-router";
import { redirectLegacyCategory } from "@/modules/novels/legacy-redirects";

export const Route = createFileRoute("/novels/categories/$slug")({
  server: {
    handlers: { GET: ({ request, params }) => redirectLegacyCategory(request, params.slug) },
  },
});
