import { createFileRoute, Outlet } from "@tanstack/react-router";
import { NovelPublicShell } from "@/modules/novels/novel-public-shell";

export const Route = createFileRoute("/_public")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <NovelPublicShell>
      <Outlet />
    </NovelPublicShell>
  );
}
