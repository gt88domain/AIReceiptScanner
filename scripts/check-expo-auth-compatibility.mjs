import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const packagePaths = {
  server: "apps/server/package.json",
  mobile: "optional/mobile/package.json",
};
const expectedVersion = "1.6.23";

const packages = Object.fromEntries(
  await Promise.all(
    Object.entries(packagePaths).map(async ([name, path]) => [
      name,
      JSON.parse(await readFile(resolve(root, path), "utf8")),
    ]),
  ),
);

const versions = {
  "apps/server better-auth": packages.server.dependencies["better-auth"],
  "optional/mobile better-auth": packages.mobile.dependencies["better-auth"],
  "optional/mobile @better-auth/expo": packages.mobile.dependencies["@better-auth/expo"],
};

const mismatches = Object.entries(versions).filter(([, version]) => version !== expectedVersion);
if (mismatches.length > 0) {
  const details = mismatches.map(([name, version]) => `${name}: ${version}`).join("\n");
  throw new Error(
    `Expo Auth compatibility requires exact ${expectedVersion} pins.\n${details}`,
  );
}

const pluginSource = await readFile(resolve(root, "apps/server/src/auth/expo-plugin.ts"), "utf8");
if (!pluginSource.includes(`EXPO_AUTH_PLUGIN_COMPAT_VERSION = "${expectedVersion}"`)) {
  throw new Error(
    "Expo Auth compatibility version must match the pinned Better Auth package version.",
  );
}

console.log(`Expo Auth compatibility is pinned to Better Auth ${expectedVersion}.`);
