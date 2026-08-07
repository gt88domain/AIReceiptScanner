import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ALLOWED_DEPENDENCIES = new Set([
  "d1",
  "read-repository",
  "product-config",
  "request-log",
  "request-id",
]);

function error(code, dependency = "") {
  return { code, dependency };
}

function isValidFixture(fixture) {
  return (
    fixture?.schemaVersion === 1 &&
    typeof fixture.product === "string" &&
    Boolean(fixture.product) &&
    fixture.operation === "public-read" &&
    Array.isArray(fixture.dependencies) &&
    fixture.dependencies.every((dependency) => typeof dependency === "string" && Boolean(dependency))
  );
}

export function validatePublicReadDependencyFixture(fixture) {
  if (!isValidFixture(fixture)) {
    return [error("DISCOVERY_PUBLIC_READ_FIXTURE_INVALID")];
  }

  const errors = [];
  const seenDependencies = new Set();
  for (const dependency of fixture.dependencies) {
    if (seenDependencies.has(dependency)) {
      errors.push(error("DISCOVERY_PUBLIC_READ_DEPENDENCY_DUPLICATE", dependency));
    } else {
      seenDependencies.add(dependency);
    }
    if (!ALLOWED_DEPENDENCIES.has(dependency)) {
      errors.push(error("DISCOVERY_PUBLIC_READ_DEPENDENCY_FORBIDDEN", dependency));
    }
  }
  return errors.sort(compareErrors);
}

function compareErrors(left, right) {
  return left.code.localeCompare(right.code) || left.dependency.localeCompare(right.dependency);
}

async function loadValidFixtures(root) {
  const directory = path.join(root, "template-kit/fixtures/discovery-public-read-dependencies/valid");
  const files = (await readdir(directory)).filter((file) => file.endsWith(".json")).sort();
  return Promise.all(
    files.map(async (file) => ({
      file,
      fixture: JSON.parse(await readFile(path.join(directory, file), "utf8")),
    })),
  );
}

async function main() {
  const errors = (await loadValidFixtures(process.cwd())).flatMap(({ file, fixture }) =>
    validatePublicReadDependencyFixture(fixture).map((value) =>
      `${file}: ${value.code} ${value.dependency}`.trim(),
    ),
  );
  if (errors.length > 0) {
    throw new Error(`Discovery public-read dependency check failed:\n${errors.sort().join("\n")}`);
  }
  console.log("Discovery public-read dependency check passed (1 governance fixture).");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
