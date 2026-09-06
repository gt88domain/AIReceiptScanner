import { createFileRoute } from "@tanstack/react-router";
import { redirectLegacyChapter } from "@/modules/novels/legacy-redirects";

export const Route = createFileRoute("/novel/$slug/chapter/$number")({
  server: {
    handlers: {
      GET: ({ request, params }) => redirectLegacyChapter(request, params.slug, params.number),
    },
  },
});
