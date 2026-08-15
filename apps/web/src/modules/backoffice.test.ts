import { describe, expect, it, vi } from "vitest";
const { requireAdminRouteAccess } = vi.hoisted(() => ({ requireAdminRouteAccess: vi.fn() }));

vi.mock("@/lib/auth/admin-route", () => ({ requireAdminRouteAccess }));

import { createAdminModuleRoute } from "@/lib/auth/create-admin-module-route";
import { createAdministrationNavGroup, createSidebarData } from "@/configs/data/sidebar-data";
import { resolveBackofficeModules, type BackofficeModule } from "./backoffice";

const enabledFeatures = { billing: true, credits: true, tickets: true };

describe("backoffice modules", () => {
  it("leaves upstream navigation empty when no module is registered", () => {
    expect(resolveBackofficeModules([], enabledFeatures)).toEqual({
      adminModules: [],
      userApps: [],
    });
    expect(
      createSidebarData(
        {
          billingEnabled: true,
          creditsEnabled: true,
          creditPurchasesEnabled: true,
          ticketsEnabled: true,
        },
        [],
      )
        .navGroups.flatMap((group) => group.items)
        .some((item) => item.title === "dashboard.nav.apps"),
    ).toBe(false);
  });

  it("sorts registered Apps and Modules and hides disabled capabilities", () => {
    const manifests: BackofficeModule[] = [
      {
        id: "urls-submit",
        userApp: { titleKey: "urls.submit", routeId: "/submit" },
        adminModule: { titleKey: "urls.admin", routeId: "/admin/urls" },
      },
      {
        id: "billing-tools",
        userApp: { titleKey: "billing.tools", routeId: "/billing-tools" },
        requiresFeature: "billing",
      },
      {
        id: "ticket-tools",
        userApp: { titleKey: "tickets.tools", routeId: "/ticket-tools" },
        requiresFeature: "tickets",
      },
    ];
    const modules = resolveBackofficeModules(manifests, { ...enabledFeatures, tickets: false });

    expect(modules.userApps.map((entry) => entry.id)).toEqual(["billing-tools", "urls-submit"]);
    expect(modules.adminModules.map((entry) => entry.id)).toEqual(["urls-submit"]);
    const apps = createSidebarData(
      {
        billingEnabled: true,
        creditsEnabled: true,
        creditPurchasesEnabled: true,
        ticketsEnabled: false,
      },
      manifests,
    )
      .navGroups.flatMap((group) => group.items)
      .find((item) => item.title === "dashboard.nav.apps");
    const admin = createAdministrationNavGroup(
      { billingEnabled: true, creditPurchasesEnabled: true, ticketsEnabled: false },
      manifests,
    );

    expect(apps?.items?.map((item) => item.title)).toEqual(["billing.tools", "urls.submit"]);
    expect(admin.items.map((item) => item.title)).toContain("urls.admin");
  });

  it("rejects duplicate module ids", () => {
    expect(() =>
      resolveBackofficeModules(
        [
          { id: "duplicate", userApp: { titleKey: "one", routeId: "/one" } },
          { id: "duplicate", adminModule: { titleKey: "two", routeId: "/admin/two" } },
        ],
        enabledFeatures,
      ),
    ).toThrow("Duplicate backoffice module id: duplicate");
  });

  it("always installs the existing admin route guard", () => {
    const route = createAdminModuleRoute("/_authed/(dashboard)/admin/analytics")({
      component: () => null,
    });

    expect(route.options.beforeLoad).toBe(requireAdminRouteAccess);
  });
});
