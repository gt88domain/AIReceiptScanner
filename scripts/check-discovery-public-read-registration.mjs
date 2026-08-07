import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validatePublicReadDependencyFixture } from "./check-discovery-public-read-dependencies.mjs";

const FIXTURE_FIELDS = new Set([
  "schemaVersion",
  "product",
  "operation",
  "transport",
  "mountBefore",
  "routeOwner",
  "registrationMode",
  "initializationMode",
  "contextMode",
  "methods",
  "dependencies",
  "defaultRegistry",
]);
const READ_METHODS = new Set(["GET", "HEAD"]);

function error(code, subject = "") {
  return { code, subject };
}

function isNonEmptyString(value) {
  return typeof value === "string" && Boolean(value);
}

function isStringArray(value) {
  return Array.isArray(value) && value.every(isNonEmptyString);
}

function isValidFixture(fixture) {
  return (
    fixture &&
    typeof fixture === "object" &&
    Object.keys(fixture).every((field) => FIXTURE_FIELDS.has(field)) &&
    fixture.schemaVersion === 1 &&
    isNonEmptyString(fixture.product) &&
    fixture.operation === "public-read-registration" &&
    isNonEmptyString(fixture.transport) &&
    isNonEmptyString(fixture.mountBefore) &&
    isNonEmptyString(fixture.routeOwner) &&
    isNonEmptyString(fixture.registrationMode) &&
    isNonEmptyString(fixture.initializationMode) &&
    isNonEmptyString(fixture.contextMode) &&
    isStringArray(fixture.methods) &&
    fixture.methods.length > 0 &&
    isStringArray(fixture.dependencies) &&
    Array.isArray(fixture.defaultRegistry)
  );
}

export function validatePublicReadRegistrationFixture(fixture) {
  if (!isValidFixture(fixture)) {
    return [error("DISCOVERY_PUBLIC_READ_REGISTRATION_FIXTURE_INVALID")];
  }

  const errors = [];
  if (fixture.transport !== "hono") {
    errors.push(error("DISCOVERY_PUBLIC_READ_REGISTRATION_FIXTURE_INVALID", "transport"));
  }
  if (fixture.mountBefore !== "before-rpc-api-catchall") {
    errors.push(error("DISCOVERY_PUBLIC_READ_REGISTRATION_ORDER_INVALID", fixture.mountBefore));
  }
  if (fixture.routeOwner !== "downstream") {
    errors.push(error("DISCOVERY_PUBLIC_READ_REGISTRATION_ROUTE_OWNER_INVALID", fixture.routeOwner));
  }
  if (fixture.registrationMode !== "static-explicit") {
    errors.push(error("DISCOVERY_PUBLIC_READ_REGISTRATION_MODE_INVALID", fixture.registrationMode));
  }
  if (fixture.initializationMode !== "request-lazy") {
    errors.push(error("DISCOVERY_PUBLIC_READ_REGISTRATION_INITIALIZATION_INVALID", fixture.initializationMode));
  }
  if (fixture.contextMode !== "hono-request-only") {
    errors.push(error("DISCOVERY_PUBLIC_READ_REGISTRATION_CONTEXT_INVALID", fixture.contextMode));
  }

  const seenMethods = new Set();
  for (const method of fixture.methods) {
    if (seenMethods.has(method)) {
      errors.push(error("DISCOVERY_PUBLIC_READ_REGISTRATION_METHOD_DUPLICATE", method));
    } else {
      seenMethods.add(method);
    }
    if (!READ_METHODS.has(method)) {
      errors.push(error("DISCOVERY_PUBLIC_READ_REGISTRATION_METHOD_FORBIDDEN", method));
    }
  }
  if (fixture.defaultRegistry.length > 0) {
    errors.push(error("DISCOVERY_PUBLIC_READ_REGISTRATION_DEFAULT_REGISTRY_NOT_EMPTY", "defaultRegistry"));
  }

  const dependencyErrors = validatePublicReadDependencyFixture({
    schemaVersion: 1,
    product: fixture.product,
    operation: "public-read",
    dependencies: fixture.dependencies,
  });
  errors.push(...dependencyErrors.map(({ code, dependency }) => error(code, dependency)));
  return errors.sort(compareErrors);
}

function compareErrors(left, right) {
  return left.code.localeCompare(right.code) || left.subject.localeCompare(right.subject);
}

async function loadValidFixtures(root) {
  const directory = path.join(root, "template-kit/fixtures/discovery-public-read-registration/valid");
  const files = (await readdir(directory)).filter((file) => file.endsWith(".json")).sort();
  if (files.length === 0) {
    throw new Error("Discovery public-read registration check requires at least one valid fixture.");
  }
  return Promise.all(
    files.map(async (file) => ({
      file,
      fixture: JSON.parse(await readFile(path.join(directory, file), "utf8")),
    })),
  );
}

async function main() {
  const errors = (await loadValidFixtures(process.cwd())).flatMap(({ file, fixture }) =>
    validatePublicReadRegistrationFixture(fixture).map((value) =>
      `${file}: ${value.code} ${value.subject}`.trim(),
    ),
  );
  if (errors.length > 0) {
    throw new Error(`Discovery public-read registration check failed:\n${errors.sort().join("\n")}`);
  }
  console.log("Discovery public-read registration check passed (1 governance fixture).");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
