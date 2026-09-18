import { execFileSync } from "node:child_process";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { measureHomepageAssets } from "./lib/measure-homepage-assets.mjs";

const root = process.cwd();
const officialProfiles = ["full-saas", "account-app", "directory", "directory-lite"];
const requestedProfile = process.argv
  .find((argument) => argument.startsWith("--profile="))
  ?.slice(10);
if (requestedProfile && !officialProfiles.includes(requestedProfile)) {
  throw new Error(`Unknown profile '${requestedProfile}'.`);
}
const profiles = requestedProfile ? [requestedProfile] : officialProfiles;
const budget = JSON.parse(await readFile(join(root, "apps/web/performance-budget.json"), "utf8"));

function run(args, env) {
  try {
    execFileSync("pnpm", args, { cwd: root, env, stdio: "pipe" });
  } catch (error) {
    const output = [error.stdout, error.stderr]
      .map((value) => (value ? String(value) : ""))
      .filter((value) => value.length > 0)
      .join("\n");
    throw new Error(`pnpm ${args.join(" ")} failed.\n${output}`);
  }
}

function descriptor(profileId) {
  const output = execFileSync(
    "pnpm",
    ["exec", "tsx", "scripts/profile-build-report.ts", profileId],
    { cwd: root, encoding: "utf8" },
  );
  return JSON.parse(output);
}

async function readAssetStats(webOutput) {
  const directory = join(webOutput, "client", "assets");
  const assets = await readdir(directory);
  const loaded = await Promise.all(
    assets.map(async (name) => ({ name, contents: await readFile(join(directory, name)) })),
  );
  const commonEntry = loaded
    .filter(({ name }) => name.startsWith("index-") && name.endsWith(".js"))
    .sort((left, right) => right.contents.length - left.contents.length)[0];
  const globalCss = loaded
    .filter(
      ({ name, contents }) => name.endsWith(".css") && !contents.toString("utf8").includes("--fd"),
    )
    .sort((left, right) => right.contents.length - left.contents.length)[0];
  if (!commonEntry || !globalCss)
    throw new Error("Web build lacks its common entry or global CSS asset.");
  const homepage = await measureHomepageAssets({
    clientAssetsDirectory: directory,
    serverAssetsDirectory: join(webOutput, "server", "assets"),
  });
  return {
    commonEntryGzipBytes: gzipSync(commonEntry.contents).length,
    initialJavaScriptGzipBytes: homepage.initialJavaScriptGzipBytes,
    globalCssGzipBytes: gzipSync(globalCss.contents).length,
    forbiddenAssets: homepage.initialRequests.filter((name) =>
      budget.forbiddenInitialRequestTokens.some((token) => name.includes(token)),
    ),
  };
}

const temporaryRoot = await mkdtemp(join(tmpdir(), "easystarter-profile-build-"));
const results = [];
try {
  for (const profileId of profiles) {
    const profile = descriptor(profileId);
    const environment = { ...process.env, EASYSTARTER_PROFILE_BUILD: profileId };
    const serverOutput = join(temporaryRoot, profileId, "server");
    const webOutput = join(temporaryRoot, profileId, "web");

    console.log(`\n[profile:${profileId}] checksum=${profile.checksum}`);
    run(
      [
        "--filter",
        "server",
        "exec",
        "tsdown",
        "--config",
        "tsdown.profile.config.ts",
        "--out-dir",
        serverOutput,
        "--no-dts",
      ],
      environment,
    );
    const serverEntry = await readFile(join(serverOutput, "index.js"), "utf8");
    if (serverEntry.includes('"@repo/app-config"') || serverEntry.includes("'@repo/app-config'")) {
      throw new Error(`${profileId} server build left the profile configuration external.`);
    }
    run(["--filter", "web", "exec", "vite", "build", "--outDir", webOutput], environment);
    run(
      [
        "--filter",
        "server",
        "exec",
        "wrangler",
        "deploy",
        join(root, "apps/server/src/index.ts"),
        "--dry-run",
        "--tsconfig",
        join(root, "apps/server/tsconfig.json"),
        "--define",
        `__EASYSTARTER_PROFILE_BUILD__:${JSON.stringify(profileId)}`,
        "--config",
        join(root, "template-kit/profiles", profileId, "wrangler.server.example.jsonc"),
      ],
      environment,
    );
    run(
      [
        "--filter",
        "web",
        "exec",
        "wrangler",
        "deploy",
        join(webOutput, "server/index.js"),
        "--assets",
        join(webOutput, "client"),
        "--dry-run",
        "--tsconfig",
        join(root, "apps/web/tsconfig.json"),
        "--config",
        join(root, "template-kit/profiles", profileId, "wrangler.web.example.jsonc"),
      ],
      environment,
    );

    const performance = await readAssetStats(webOutput);
    if (performance.initialJavaScriptGzipBytes > budget.initialJavaScriptGzipBytes) {
      throw new Error(`${profileId} initial homepage JavaScript exceeds the shared gzip budget.`);
    }
    if (performance.globalCssGzipBytes > budget.globalCssGzipBytes) {
      throw new Error(`${profileId} global CSS exceeds the shared gzip budget.`);
    }
    if (performance.forbiddenAssets.length > 0) {
      throw new Error(
        `${profileId} has forbidden initial assets: ${performance.forbiddenAssets.join(", ")}.`,
      );
    }
    results.push({ profileId, checksum: profile.checksum, performance, wranglerDryRun: true });
  }
} finally {
  await rm(temporaryRoot, { force: true, recursive: true });
}

console.log(`\nProfile build matrix passed.\n${JSON.stringify(results, null, 2)}`);
