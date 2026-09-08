import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Footer } from "@/components/layout/tailark/footer/footer";
import { Header } from "@/components/layout/tailark/header/header";

export const Route = createFileRoute("/_public")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="relative min-h-screen w-full overflow-x-clip">
      <Header />
      <Outlet />
      <Footer />
    </div>
  );
}
