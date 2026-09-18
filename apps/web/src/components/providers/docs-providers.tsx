import { RootProvider } from "fumadocs-ui/provider/tanstack";
import type { ReactNode } from "react";
import type { Locale } from "@/i18n";
import { getFumadocsI18nProvider } from "@/lib/fumadocs-i18n";

export function DocsProviders({ children, locale }: { children: ReactNode; locale: Locale }) {
  return (
    <RootProvider i18n={getFumadocsI18nProvider(locale)} theme={{ enabled: false }}>
      {children}
    </RootProvider>
  );
}
