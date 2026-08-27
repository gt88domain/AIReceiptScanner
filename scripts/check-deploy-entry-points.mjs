import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

function issue(packageName, scriptName, message) {
  return `${packageName}#${scriptName}: ${message}`;
}

export function validateDeployEntryPoints(packages) {
  const errors = [];

  for (const [packageName, scripts] of Object.entries(packages)) {
    if (Object.hasOwn(scripts, "deploy:dev")) {
      errors.push(issue(packageName, "deploy:dev", "development deploy aliases are forbidden."));
    }

    for (const [scriptName, command] of Object.entries(scripts)) {
      if (!command.includes("wrangler deploy")) continue;

      if (packageName === "root") {
        errors.push(
          issue(packageName, scriptName, "root scripts must delegate instead of calling Wrangler."),
        );
      } else if (scriptName !== "deploy" && scriptName !== "deploy:preview") {
        errors.push(
          issue(packageName, scriptName, "Wrangler deploy is allowed only in deploy entry points."),
        );
      }
    }
  }

  for (const packageName of ["server", "web"]) {
    const scripts = packages[packageName] ?? {};
    const production = scripts.deploy ?? "";
    const preflightIndex = production.indexOf("preflight:production");
    const wranglerIndex = production.indexOf("wrangler deploy");
    if (preflightIndex === -1 || wranglerIndex === -1 || preflightIndex > wranglerIndex) {
      errors.push(
        issue(
          packageName,
          "deploy",
          "production deploy must run preflight:production before wrangler deploy.",
        ),
      );
    }

    const preview = scripts["deploy:preview"] ?? "";
    if (!preview.includes("wrangler deploy --config wrangler.preview.jsonc")) {
      errors.push(
        issue(
          packageName,
          "deploy:preview",
          "preview deploy must name wrangler.preview.jsonc explicitly.",
        ),
      );
    }
  }

  return errors;
}

async function loadPackageScripts(path) {
  const source = JSON.parse(await readFile(resolve(root, path), "utf8"));
  return source.scripts ?? {};
}

async function selfCheck() {
  const safe = {
    root: { deploy: "pnpm deploy:server && pnpm deploy:web" },
    server: {
      deploy: "pnpm preflight:production && wrangler deploy",
      "deploy:preview": "wrangler deploy --config wrangler.preview.jsonc",
    },
    web: {
      deploy: "pnpm --filter server preflight:production && wrangler deploy",
      "deploy:preview": "pnpm build && wrangler deploy --config wrangler.preview.jsonc",
    },
  };
  assert.deepEqual(validateDeployEntryPoints(safe), []);

  assert.match(
    validateDeployEntryPoints({
      ...safe,
      server: { ...safe.server, deploy: "wrangler deploy && pnpm preflight:production" },
    }).join("\n"),
    /preflight:production before wrangler deploy/,
  );
  assert.match(
    validateDeployEntryPoints({
      ...safe,
      web: { ...safe.web, "deploy:preview": "wrangler deploy" },
    }).join("\n"),
    /wrangler\.preview\.jsonc explicitly/,
  );
  assert.match(
    validateDeployEntryPoints({
      ...safe,
      server: { ...safe.server, "deploy:dev": "wrangler deploy" },
    }).join("\n"),
    /development deploy aliases are forbidden/,
  );
}

async function main() {
  if (process.argv.includes("--self-check")) await selfCheck();

  const errors = validateDeployEntryPoints({
    root: await loadPackageScripts("package.json"),
    server: await loadPackageScripts("apps/server/package.json"),
    web: await loadPackageScripts("apps/web/package.json"),
  });
  if (errors.length > 0) throw new Error(`Unsafe deploy entry points:\n${errors.join("\n")}`);
  console.log("Deploy entry-point checks passed.");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  await main();
}
