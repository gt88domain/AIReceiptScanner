/**
 * @param {string | undefined} sitemapHost
 * @param {readonly string[]} disallowedPrefixes
 */
export function createRobotsTxt(sitemapHost, disallowedPrefixes = []) {
  const lines = [
    "User-agent: *",
    "Allow: /",
    ...disallowedPrefixes.map((prefix) => `Disallow: ${prefix}`),
  ];
  if (sitemapHost) lines.push("", "Sitemap: " + sitemapHost.replace(/\/+$/, "") + "/sitemap.xml");
  return `${lines.join("\n")}\n`;
}
