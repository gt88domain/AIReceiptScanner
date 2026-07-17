import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { ArrowLeftIcon } from "lucide-react";
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
        </header>
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
      </article>
    </main>
  );
}
