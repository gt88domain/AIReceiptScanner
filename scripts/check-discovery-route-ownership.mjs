import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RESERVED_SEGMENTS = new Set([
  "admin",
  "api",
  "auth",
  "billing",
  "blog",
  "brand-ideas",
  "category",
  "collection",
  "dashboard",
  "discover",
  "docs",
  "domains",
  "favorites",
  "item",
  "listing",
  "offers",
  "prompt",
  "ranking",
  "rankings",
  "robots.txt",
  "rpc",
  "search",
  "settings",
  "sitemap.xml",
  "tag",
  "templates",
  "tools",
  "topics",
  "websites",
]);

// ponytail: no namespace is approved by Phase 0; add one here only through a later governance decision.
const REGISTERED_RESOURCE_NAMESPACES = new Set();
const CLAIM_KINDS = new Set(["product-route", "resource-route"]);
const CLAIM_STATUSES = new Set(["proposed", "frozen-existing"]);

function error(code, pattern = "") {
  return { code, pattern };
}

function firstSegment(pattern) {
  return pattern.split("/").find(Boolean) ?? "";
}

function isRootDynamic(pattern) {
  return /^\/:[^/]+(?:\/|$)/.test(pattern);
}

function isAllowedFrozenDuplicate(previous, claim, product) {
  return (
    previous.status === "frozen-existing" &&
    claim.status === "frozen-existing" &&
    previous.owner === claim.owner &&
    previous.kind === claim.kind &&
    previous.namespace === claim.namespace &&
    claim.owner === product
  );
}

function isValidClaim(claim) {
  return (
    typeof claim?.pattern === "string" &&
    claim.pattern.startsWith("/") &&
    typeof claim.owner === "string" &&
    Boolean(claim.owner) &&
    CLAIM_KINDS.has(claim.kind) &&
    CLAIM_STATUSES.has(claim.status)
  );
}

export function validateRouteOwnershipFixture(fixture) {
  const errors = [];
  if (
    !fixture ||
    fixture.schemaVersion !== 1 ||
    typeof fixture.product !== "string" ||
    !fixture.product ||
    !Array.isArray(fixture.claims)
  ) {
    errors.push(error("DISCOVERY_ROUTE_FIXTURE_INVALID"));
  }
  if (
    !fixture ||
    typeof fixture.sourceRepository !== "string" ||
    !fixture.sourceRepository ||
    typeof fixture.sourceCommit !== "string" ||
    !/^[a-f0-9]{40}$/.test(fixture.sourceCommit)
  ) {
    errors.push(error("DISCOVERY_ROUTE_FIXTURE_SOURCE_REQUIRED"));
  }
  if (!Array.isArray(fixture?.claims) || typeof fixture?.product !== "string") {
    return errors.sort(compareErrors);
  }

  const seenClaims = new Map();
  for (const claim of fixture.claims) {
    const pattern = typeof claim?.pattern === "string" ? claim.pattern : "";
    if (!isValidClaim(claim)) {
      errors.push(error("DISCOVERY_ROUTE_FIXTURE_INVALID", pattern));
      continue;
    }
    if (claim.owner === "foundation" && isRootDynamic(pattern)) {
      errors.push(error("DISCOVERY_ROUTE_ROOT_DYNAMIC_FORBIDDEN", pattern));
    }

    const previous = seenClaims.get(pattern);
    if (previous && !isAllowedFrozenDuplicate(previous, claim, fixture.product)) {
      errors.push(error("DISCOVERY_ROUTE_DUPLICATE_CLAIM", pattern));
    } else if (!previous) {
      seenClaims.set(pattern, claim);
    }

    if (claim.status === "frozen-existing") continue;
    const segment = firstSegment(pattern);
    if (segment && !segment.startsWith(":")) {
      if (RESERVED_SEGMENTS.has(segment)) {
        errors.push(error("DISCOVERY_ROUTE_RESERVED_SEGMENT", pattern));
      }
      if (claim.kind === "resource-route" && !REGISTERED_RESOURCE_NAMESPACES.has(claim.namespace)) {
        errors.push(error("DISCOVERY_ROUTE_NAMESPACE_UNREGISTERED", pattern));
      }
    }
  }
  return errors.sort(compareErrors);
}

function compareErrors(left, right) {
  return left.code.localeCompare(right.code) || left.pattern.localeCompare(right.pattern);
}

async function loadValidFixtures(root) {
  const directory = path.join(root, "template-kit/fixtures/discovery-route-ownership/valid");
  const files = (await readdir(directory)).filter((file) => file.endsWith(".json")).sort();
  return Promise.all(
    files.map(async (file) => ({
      file,
      fixture: JSON.parse(await readFile(path.join(directory, file), "utf8")),
    })),
  );
}

async function main() {
  const root = process.cwd();
  const errors = (await loadValidFixtures(root)).flatMap(({ file, fixture }) =>
    validateRouteOwnershipFixture(fixture).map((value) => `${file}: ${value.code} ${value.pattern}`.trim()),
  );
  if (errors.length > 0) {
    throw new Error(`Discovery route ownership check failed:\n${errors.sort().join("\n")}`);
  }
  console.log("Discovery route ownership check passed (2 frozen fixtures).");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
