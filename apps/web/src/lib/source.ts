// https://www.fumadocs.dev/docs/mdx/vite
import { docs } from "fumadocs-mdx:collections/server";
import { loader } from "fumadocs-core/source";
import { icons } from "lucide-react";
import { createElement } from "react";
import { fumadocsI18n } from "./fumadocs-i18n";

export const source = loader({
  baseUrl: "/docs",
  i18n: fumadocsI18n,
  source: docs.toFumadocsSource(),
  icon(icon) {
    if (!icon) {
      // You may set a default icon
      return;
    }
    if (icon in icons) return createElement(icons[icon as keyof typeof icons]);
  },
});
