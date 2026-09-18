import { Link } from "@tanstack/react-router";
import { useTranslations } from "@/i18n";

export function TermsAgreement() {
  const t = useTranslations();

  return (
    <p className="text-muted-foreground text-center text-xs text-balance [&>a:hover]:text-primary [&>a]:underline [&>a]:underline-offset-4">
      {t.rich("auth.termsAgreement", {
        termsLink: (chunks) => <Link to="/terms">{chunks}</Link>,
        privacyLink: (chunks) => <Link to="/privacy">{chunks}</Link>,
      })}
    </p>
  );
}
