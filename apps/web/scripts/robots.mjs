export function createRobotsTxt(sitemapHost) {
  const lines = ["User-agent: *", "Allow: /", "Disallow: /api/", "Disallow: /rpc/"];
  if (sitemapHost) lines.push("", "Sitemap: " + sitemapHost.replace(/\/+$/, "") + "/sitemap.xml");
  return `${lines.join("\n")}\n`;
}
