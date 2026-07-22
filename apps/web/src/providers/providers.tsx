import { QueryClientProvider } from "@tanstack/react-query";
import { RootProvider } from "fumadocs-ui/provider/tanstack";
import type { QueryClient } from "@tanstack/react-query";
import { useEffect, useRef, type ReactNode } from "react";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getCurrentLocale, getMessages, IntlProvider } from "@/i18n";
import { PageViewTracker } from "@/lib/analytics/page-view-tracker";
import { authClient } from "@/lib/auth/auth-client";
import { getFumadocsI18nProvider } from "@/lib/fumadocs-i18n";
import { resetAuthenticatedQueryState } from "@/utils/orpc";

function AuthenticatedQueryCacheGuard({ queryClient }: { queryClient: QueryClient }) {
  const { data: session } = authClient.useSession();
  const previousUserId = useRef<string | null | undefined>(undefined);
  const userId = session?.user.id ?? null;

  useEffect(() => {
    if (previousUserId.current !== undefined && previousUserId.current !== userId) {
      void resetAuthenticatedQueryState(queryClient);
    }
    previousUserId.current = userId;
  }, [queryClient, userId]);

  return null;
}

export function Providers({
  children,
  queryClient,
}: {
  children: ReactNode;
  queryClient: QueryClient;
}) {
  const locale = getCurrentLocale();
  const messages = getMessages(locale);

  return (
    <IntlProvider locale={locale} messages={messages}>
      <QueryClientProvider client={queryClient}>
        <AuthenticatedQueryCacheGuard queryClient={queryClient} />
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
