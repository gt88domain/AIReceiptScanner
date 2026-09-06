import { createFileRoute } from "@tanstack/react-router";
import { redirectLegacyLibrary } from "@/modules/novels/legacy-redirects";

export const Route = createFileRoute("/library")({
  server: { handlers: { GET: ({ request }) => redirectLegacyLibrary(request) } },
});
