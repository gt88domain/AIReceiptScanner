import handler from "@tanstack/react-start/server-entry";
import { extractLocaleFromPath } from "./i18n/config";
import { applyLocaleMiddleware, handleLocaleMiddleware } from "./i18n/server";

const noIndexPathRegex = /^\/(?:auth|billing|credits|dashboard|settings|users)(?:\/|$)/;

function stripLocalePrefix(pathname: string): string {
  const locale = extractLocaleFromPath(pathname);
  if (!locale) {
    return pathname;
  }

  const prefix = `/${locale}`;
  if (pathname === prefix) {
    return "/";
  }

  return pathname.startsWith(`${prefix}/`) ? pathname.slice(prefix.length) : pathname;
}

function shouldApplyNoIndex(pathname: string): boolean {
  return noIndexPathRegex.test(stripLocalePrefix(pathname));
}

function applyNoIndexHeader(response: Response, pathname: string): Response {
  if (!shouldApplyNoIndex(pathname)) {
    return response;
  }

  const nextResponse = new Response(response.body, response);
  nextResponse.headers.set("X-Robots-Tag", "noindex, nofollow");
  return nextResponse;
}

export default {
  async fetch(req: Request): Promise<Response> {
    const pathname = new URL(req.url).pathname;
    const localeResult = handleLocaleMiddleware(req);

    // Handle redirects (e.g., /en/about -> /about)
    if (localeResult.redirect) {
      return applyNoIndexHeader(localeResult.redirect, pathname);
    }

    const response = await handler.fetch(req);

    // Apply cookie if needed
    const localeResponse = applyLocaleMiddleware(response, localeResult);
    return applyNoIndexHeader(localeResponse, pathname);
  },
};
