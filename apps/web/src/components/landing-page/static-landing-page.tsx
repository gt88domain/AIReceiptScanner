import { Link } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { webConfig } from "@/configs/web-config";
import { useTranslations } from "@/i18n";

/**
 * Intentionally small starter surface. Downstream products should replace its
 * copy and composition instead of patching a generic upstream marketing page.
 */
export function StaticLandingPage() {
  const t = useTranslations("landingPage.hero");
  const principles = ["foundation", "product", "performance"] as const;

  return (
    <main className="skin-saas-neutral bg-page-skin text-ink">
      <section className="mx-auto grid min-h-[calc(100dvh-var(--header-height))] max-w-7xl grid-cols-[minmax(0,1fr)] items-center gap-16 px-6 pb-20 pt-[var(--page-top-offset)] lg:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.75fr)] lg:px-12">
        <div className="min-w-0 max-w-3xl">
          <p className="mb-6 text-sm font-semibold tracking-[0.18em] text-ink-muted uppercase">
            {t("announcement")}
          </p>
          <h1 className="max-w-[12ch] text-5xl leading-[0.98] font-semibold tracking-[-0.055em] text-balance sm:text-6xl lg:text-7xl">
            {t("title")}
          </h1>
          <p className="mt-8 max-w-[60ch] text-lg leading-8 text-ink-muted">{t("subtitle")}</p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            {webConfig.auth.publicSignupEnabled ? (
              <Button asChild size="lg" className="active:translate-y-px">
                <Link to="/auth/sign-up">
                  {t("startBuilding")}
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            ) : null}
            {webConfig.docsPublic ? (
              <Button asChild size="lg" variant="ghost" className="active:translate-y-px">
                <a href="/docs">{t("requestDemo")}</a>
              </Button>
            ) : null}
          </div>
        </div>

        <aside
          aria-label={t("principlesLabel")}
          className="border-line bg-surface/85 rounded-card min-w-0 border p-7 shadow-raised backdrop-blur-sm sm:p-9"
        >
          <div className="mb-8 flex items-center justify-between gap-4 border-b border-line pb-5">
            <span className="text-sm font-semibold">{webConfig.AppName}</span>
            <span className="rounded-control bg-surface-active px-3 py-1 text-xs font-medium text-ink-muted">
              {t("ready")}
            </span>
          </div>
          <ol className="space-y-7">
            {principles.map((principle) => (
              <li key={principle} className="grid grid-cols-[1.5rem_1fr] gap-3">
                <Check aria-hidden="true" className="mt-0.5 size-5 text-skin-accent-ink" />
                <div>
                  <h2 className="text-sm font-semibold text-ink">{t(`${principle}.title`)}</h2>
                  <p className="mt-1 text-sm leading-6 text-ink-muted">
                    {t(`${principle}.description`)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </aside>
      </section>
    </main>
  );
}
