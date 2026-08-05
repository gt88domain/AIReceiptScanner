import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const clientRoot = join(root, "apps", "web", "dist", "client");
const productConfig = await readFile(
  join(root, "packages", "app-config", "src", "product-config.ts"),
  "utf8",
);
const sender = productConfig.match(
  /from:\s*\{\s*localPart:\s*["']([^"']+)["'],\s*domain:\s*["']([^"']+)["']\s*\}/,
);
if (!sender) throw new Error("[public-config] Could not find the configured email sender.");

const files = await readdir(clientRoot, { recursive: true });
const clientFiles = files.filter((file) => typeof file === "string" && file.endsWith(".js"));
// Docs may name environment variable keys, but no configured email identity may reach the client.
const forbidden = [`${sender[1]}@${sender[2]}`, sender[2]];

for (const file of clientFiles) {
  const text = await readFile(join(clientRoot, file), "utf8");
  const leaked = forbidden.find((token) => text.includes(token));
  if (leaked) throw new Error(`[public-config] Client bundle exposes protected token: ${leaked}`);
}
console.log("Public client bundle contains no Email provider or identity configuration.");
