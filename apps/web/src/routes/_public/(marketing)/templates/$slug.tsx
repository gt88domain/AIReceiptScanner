import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { ArrowLeftIcon, CheckIcon, CopyIcon, LayoutGridIcon, Rows3Icon } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTemplatePattern } from "@/configs/template-catalog";
import { webConfig } from "@/configs/web-config";
import { getCurrentLocale, getMessages, useTranslations } from "@/i18n";
import { buildSeoHead } from "@/utils/seo";

export const Route = createFileRoute("/_public/(marketing)/templates/$slug")({
  loader: ({ params }) => {
    const pattern = getTemplatePattern(params.slug);
    if (!pattern) throw notFound();
    return pattern;
  },
  head: ({ loaderData }) => {
    const locale = getCurrentLocale();
    const messages = getMessages(locale);
    const pattern = loaderData;
    const title = pattern
      ? messages.listingTemplate.items[pattern.id].title
      : messages.listingTemplate.title;
    const description = pattern
      ? messages.listingTemplate.items[pattern.id].description
      : messages.listingTemplate.description;

    return buildSeoHead({
      locale,
      title: `${title} | ${webConfig.AppName}`,
      description,
      canonicalPath: pattern ? `/templates/${pattern.id}` : "/templates/listing",
      siteName: webConfig.AppName,
    });
  },
  component: TemplateDetailPage,
});

function TemplateDetailPage() {
  const pattern = Route.useLoaderData();
  const t = useTranslations("listingTemplate");
  const [copied, setCopied] = useState(false);
  const isGrid = pattern.layout === "grid";

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2_000);
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 pt-28 pb-16 sm:px-6 lg:px-8">
      <Button asChild size="sm" variant="ghost">
        <Link to="/templates/listing">
          <ArrowLeftIcon className="mr-2 size-4" />
          {t("backToListing")}
        </Link>
      </Button>
      <article className="mt-8 space-y-8">
        <header className="space-y-4 border-b pb-8">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{t(`items.${pattern.id}.category`)}</Badge>
            <Badge variant="outline">{t(`items.${pattern.id}.layout`)}</Badge>
          </div>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            {t(`items.${pattern.id}.title`)}
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground">
            {t(`items.${pattern.id}.description`)}
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button onClick={() => void copyLink()} type="button" variant="outline">
              {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
              {copied ? t("detail.copiedLink") : t("detail.copyLink")}
            </Button>
            <Button asChild>
              <Link to="/auth/sign-up">{t("detail.startUsing")}</Link>
            </Button>
          </div>
        </header>
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">{t("detail.previewTitle")}</h2>
          <div className="rounded-xl border bg-muted/30 p-4 shadow-sm sm:p-6">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="h-3 w-28 rounded-full bg-foreground/15" />
              {isGrid ? (
                <LayoutGridIcon className="size-4 text-muted-foreground" />
              ) : (
                <Rows3Icon className="size-4 text-muted-foreground" />
              )}
            </div>
            <div className={isGrid ? "grid gap-3 pt-4 sm:grid-cols-3" : "space-y-3 pt-4"}>
              {Array.from({ length: isGrid ? 6 : 4 }, (_, index) => (
                <div
                  className={
                    isGrid
                      ? "min-h-28 rounded-lg border bg-background p-3"
                      : "flex items-center gap-3 rounded-lg border bg-background p-3"
                  }
                  key={index}
                >
                  <div className="size-8 rounded-md bg-primary/15" />
                  <div className="mt-3 min-w-0 flex-1 space-y-2">
                    <div className="h-2 w-3/4 rounded-full bg-foreground/15" />
                    <div className="h-2 w-1/2 rounded-full bg-foreground/10" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="grid gap-6 md:grid-cols-[0.8fr_1.2fr]">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">{t("detail.useCaseTitle")}</h2>
            <p className="text-muted-foreground">{t(`items.${pattern.id}.category`)}</p>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>{t("detail.includedTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
                <li>{t("detail.includedSearch")}</li>
                <li>{t("detail.includedFilters")}</li>
                <li>{t("detail.includedResponsive")}</li>
                <li>{t("detail.includedEmptyState")}</li>
              </ul>
            </CardContent>
          </Card>
        </section>
      </article>
    </main>
  );
}
