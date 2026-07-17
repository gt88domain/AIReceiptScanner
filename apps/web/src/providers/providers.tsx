import { QueryClientProvider } from "@tanstack/react-query";
import { RootProvider } from "fumadocs-ui/provider/tanstack";
import type { ReactNode } from "react";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getCurrentLocale, getMessages, IntlProvider } from "@/i18n";
import { PageViewTracker } from "@/lib/analytics/page-view-tracker";
import { getFumadocsI18nProvider } from "@/lib/fumadocs-i18n";
import { queryClient } from "@/utils/orpc";

export function Providers({ children }: { children: ReactNode }) {
  const locale = getCurrentLocale();
  const messages = getMessages(locale);

  return (
    <IntlProvider locale={locale} messages={messages}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <TooltipProvider>
            <RootProvider i18n={getFumadocsI18nProvider(locale)} theme={{ enabled: false }}>
              <PageViewTracker />
              {children}
            </RootProvider>
          </TooltipProvider>
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </QueryClientProvider>
    </IntlProvider>
  );
}
