// https://www.fumadocs.dev/docs/manual-installation/tanstack-start
import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { ThemeSwitch } from "@/components/features/theme-switch";
import { BrandLogo } from "@/components/logos/brand-logo";
import type { Locale } from "@/i18n";
import { fumadocsI18n } from "./fumadocs-i18n";

export function baseOptions(locale: Locale): BaseLayoutProps {
  console.log(locale);
  return {
    i18n: fumadocsI18n,
    themeSwitch: {
      enabled: true,
      mode: "light-dark-system",
      component: <ThemeSwitch />,
    },
    nav: {
      title: <BrandLogo size={30} titleClassName="text-sm" />,
    },
  };
}
