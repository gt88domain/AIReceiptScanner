import { readdir, readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";

const homepageRouteIds = [
  "__root__",
  "/_public",
  "/_public/(marketing)/(landing-page)/",
];

export async function measureHomepageAssets({ clientAssetsDirectory, serverAssetsDirectory }) {
  const [clientAssetNames, serverAssetNames] = await Promise.all([
    readdir(clientAssetsDirectory),
    readdir(serverAssetsDirectory),
  ]);
  const manifestName = serverAssetNames.find((name) =>
    name.startsWith("_tanstack-start-manifest_v-"),
  );
  if (!manifestName) throw new Error("Web build lacks the TanStack Start route manifest.");

  const manifestUrl = pathToFileURL(join(serverAssetsDirectory, manifestName));
  const { tsrStartManifest } = await import(`${manifestUrl.href}?measured=${Date.now()}`);
  const routes = tsrStartManifest().routes;
  const routePreloads = Object.fromEntries(
    homepageRouteIds.map((routeId) => {
      const route = routes[routeId];
      if (!route) throw new Error(`TanStack Start manifest lacks homepage route ${routeId}.`);
      return [routeId, route.preloads ?? []];
    }),
  );

  const assets = new Map(
    await Promise.all(
      clientAssetNames.map(async (name) => [name, await readFile(join(clientAssetsDirectory, name))]),
    ),
  );
  const initialRequests = new Set(
    Object.values(routePreloads)
      .flat()
      .map((request) => basename(request)),
  );

  function collectStaticImports(name) {
    const contents = assets.get(name);
    if (!contents || !name.endsWith(".js")) return;
    for (const match of contents
      .toString("utf8")
      .matchAll(/(?:from|import)\s*["']\.\/([^"']+\.js)["']/g)) {
      if (initialRequests.has(match[1])) continue;
      initialRequests.add(match[1]);
      collectStaticImports(match[1]);
    }
  }
  for (const name of initialRequests) collectStaticImports(name);

  const initialJavaScript = [...initialRequests].filter((name) => name.endsWith(".js"));
  return {
    initialJavaScriptGzipBytes: initialJavaScript.reduce((total, name) => {
      const contents = assets.get(name);
      if (!contents) throw new Error(`Homepage preload ${name} is missing from the client build.`);
      return total + gzipSync(contents).length;
    }, 0),
    initialRequestCount: initialRequests.size,
    initialRequests: [...initialRequests].sort(),
    routePreloads,
  };
}
