import handler from "@tanstack/react-start/server-entry";
import { shouldNoIndexResponse } from "./configs/publication-paths";
import { supportedLocales } from "./i18n/config";
import { applyLocaleMiddleware, handleLocaleMiddleware } from "./i18n/server";
import { applySecurityHeaders } from "./server/security-headers";

function applyResponseHeaders(response: Response, pathname: string): Response {
  const nextResponse = applySecurityHeaders(response);
  if (shouldNoIndexResponse(response.status, pathname, supportedLocales)) {
    nextResponse.headers.set("X-Robots-Tag", "noindex, nofollow");
  }

  return nextResponse;
}

export default {
  async fetch(req: Request): Promise<Response> {
    const pathname = new URL(req.url).pathname;
    const localeResult = handleLocaleMiddleware(req);

    // Handle redirects (e.g., /en/about -> /about)
    if (localeResult.redirect) {
      return applyResponseHeaders(localeResult.redirect, pathname);
    }

    const response = await handler.fetch(req);

    // Apply cookie if needed
    const localeResponse = applyLocaleMiddleware(response, localeResult);
    return applyResponseHeaders(localeResponse, pathname);
  },
};
