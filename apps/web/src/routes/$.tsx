import { createFileRoute, notFound } from "@tanstack/react-router";
import { NotFound404 } from "@/components/feedback/404/not-found-404";

/**
 * Convert the explicit splat match into the router's native not-found state so
 * SSR returns HTTP 404 instead of a visually correct soft 404.
 */
export const Route = createFileRoute("/$")({
  beforeLoad: () => {
    throw notFound();
  },
  notFoundComponent: () => <NotFound404 />,
});
