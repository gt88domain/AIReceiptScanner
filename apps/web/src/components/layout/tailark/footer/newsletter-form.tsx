import { lazy, Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/i18n";

const NewsletterExpandedForm = lazy(() => import("./newsletter-expanded-form"));

export function NewsletterForm() {
  const t = useTranslations("landingPage.footer.newsletter");
  const [expanded, setExpanded] = useState(false);

  if (!expanded) {
    return (
      <div className="pt-2">
        <Button
          aria-controls="footer-newsletter-form"
          aria-expanded="false"
          onClick={() => setExpanded(true)}
          type="button"
        >
          {t("submit")}
        </Button>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div aria-busy="true" aria-live="polite" className="pt-2" id="footer-newsletter-form">
          <h2 className="text-sm font-semibold text-foreground">{t("title")}</h2>
          <div aria-hidden="true" className="mt-3 h-9 rounded-md border bg-muted/40" />
        </div>
      }
    >
      <NewsletterExpandedForm />
    </Suspense>
  );
}
