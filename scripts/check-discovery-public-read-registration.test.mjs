import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
import { promisify } from "node:util";
import path from "node:path";
import test from "node:test";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { validatePublicReadRegistrationFixture } from "./check-discovery-public-read-registration.mjs";

const execFileAsync = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixtures = path.join(root, "template-kit/fixtures/discovery-public-read-registration");
const validatorScript = fileURLToPath(new URL("./check-discovery-public-read-registration.mjs", import.meta.url));
const allowedDependencies = ["d1", "read-repository", "product-config", "request-log", "request-id"];

async function fixture(group, name) {
  return JSON.parse(await readFile(path.join(fixtures, group, `${name}.json`), "utf8"));
}

function codes(errors) {
  return errors.map((error) => error.code);
}

function registration(overrides = {}) {
  return {
    schemaVersion: 1,
    product: "candidate-directory",
    operation: "public-read-registration",
    transport: "hono",
    mountBefore: "before-rpc-api-catchall",
    routeOwner: "downstream",
    registrationMode: "static-explicit",
    initializationMode: "request-lazy",
    contextMode: "hono-request-only",
    methods: ["GET"],
    dependencies: [],
    defaultRegistry: [],
    ...overrides,
  };
}

test("accepts the minimal public-read registration fixture", async () => {
  assert.deepEqual(validatePublicReadRegistrationFixture(await fixture("valid", "minimal-registration")), []);
});

test("accepts GET, HEAD, allowed dependency subsets, and an empty default registry", () => {
  for (const methods of [["GET"], ["HEAD"], ["GET", "HEAD"]]) {
    assert.deepEqual(validatePublicReadRegistrationFixture(registration({ methods })), []);
  }
  for (const dependencies of [[], ...allowedDependencies.map((dependency) => [dependency])]) {
    assert.deepEqual(validatePublicReadRegistrationFixture(registration({ dependencies })), []);
  }
});

test("rejects invalid fixture shapes and route-bearing fields", () => {
  for (const overrides of [
    { schemaVersion: 2 },
    { product: "" },
    { operation: "public-read" },
    { dependencies: "d1" },
    { methods: "GET" },
    { methods: [] },
    { defaultRegistry: "empty" },
    { unexpected: true },
    { path: "/directory" },
    { route: "/directory" },
    { pattern: "/directory/:slug" },
    { endpoint: "directory" },
  ]) {
    assert.deepEqual(codes(validatePublicReadRegistrationFixture(registration(overrides))), [
      "DISCOVERY_PUBLIC_READ_REGISTRATION_FIXTURE_INVALID",
    ]);
  }
});

test("rejects every non-Hono transport", () => {
  for (const transport of ["orpc", "rpc", "openapi-handler", "framework-auto", "dynamic-plugin", "dynamic", "unknown"]) {
    assert.deepEqual(codes(validatePublicReadRegistrationFixture(registration({ transport }))), [
      "DISCOVERY_PUBLIC_READ_REGISTRATION_FIXTURE_INVALID",
    ]);
  }
});

test("requires mounting before the RPC and API catch-all", () => {
  for (const mountBefore of ["after-rpc-api-catchall", "inside-rpc-handler", "inside-create-context", "unordered", "unknown"]) {
    assert.deepEqual(codes(validatePublicReadRegistrationFixture(registration({ mountBefore }))), [
      "DISCOVERY_PUBLIC_READ_REGISTRATION_ORDER_INVALID",
    ]);
  }
});

test("requires downstream route ownership", () => {
  for (const routeOwner of ["foundation", "platform", "shared", "unknown"]) {
    assert.deepEqual(codes(validatePublicReadRegistrationFixture(registration({ routeOwner }))), [
      "DISCOVERY_PUBLIC_READ_REGISTRATION_ROUTE_OWNER_INVALID",
    ]);
  }
});

test("requires static explicit registration", () => {
  for (const registrationMode of [
    "auto-discovery",
    "filesystem-scan",
    "glob",
    "dynamic-import",
    "network-discovery",
    "environment-selected",
    "plugin-registry",
  ]) {
    assert.deepEqual(codes(validatePublicReadRegistrationFixture(registration({ registrationMode }))), [
      "DISCOVERY_PUBLIC_READ_REGISTRATION_MODE_INVALID",
    ]);
  }
});

test("requires request-lazy initialization", () => {
  for (const initializationMode of [
    "app-eager",
    "registration-eager",
    "worker-startup",
    "global-singleton",
    "full-context",
  ]) {
    assert.deepEqual(codes(validatePublicReadRegistrationFixture(registration({ initializationMode }))), [
      "DISCOVERY_PUBLIC_READ_REGISTRATION_INITIALIZATION_INVALID",
    ]);
  }
});

test("requires native Hono request context only", () => {
  for (const contextMode of ["full-context", "orpc-context", "auth-context", "user-context", "platform-context"]) {
    assert.deepEqual(codes(validatePublicReadRegistrationFixture(registration({ contextMode }))), [
      "DISCOVERY_PUBLIC_READ_REGISTRATION_CONTEXT_INVALID",
    ]);
  }
});

test("limits public reads to distinct uppercase GET and HEAD methods", () => {
  for (const method of ["POST", "PUT", "PATCH", "DELETE", "OPTIONS", "get", "head", "UNKNOWN"]) {
    assert.deepEqual(codes(validatePublicReadRegistrationFixture(registration({ methods: [method] }))), [
      "DISCOVERY_PUBLIC_READ_REGISTRATION_METHOD_FORBIDDEN",
    ]);
  }
  assert.deepEqual(codes(validatePublicReadRegistrationFixture(registration({ methods: ["GET", "GET"] }))), [
    "DISCOVERY_PUBLIC_READ_REGISTRATION_METHOD_DUPLICATE",
  ]);
});

test("requires a deliberately empty default registry", () => {
  for (const defaultRegistry of [["discovery"], ["prompt"], ["domain"], ["other"]]) {
    assert.deepEqual(codes(validatePublicReadRegistrationFixture(registration({ defaultRegistry }))), [
      "DISCOVERY_PUBLIC_READ_REGISTRATION_DEFAULT_REGISTRY_NOT_EMPTY",
    ]);
  }
});

test("inherits Phase 1B dependency errors without another allow-list", () => {
  for (const dependency of ["auth-session", "payments", "credits", "jobs", "unknown-service"]) {
    assert.deepEqual(codes(validatePublicReadRegistrationFixture(registration({ dependencies: [dependency] }))), [
      "DISCOVERY_PUBLIC_READ_DEPENDENCY_FORBIDDEN",
    ]);
  }
  assert.deepEqual(codes(validatePublicReadRegistrationFixture(registration({ dependencies: ["d1", "d1"] }))), [
    "DISCOVERY_PUBLIC_READ_DEPENDENCY_DUPLICATE",
  ]);
});

test("sorts method and dependency errors deterministically", () => {
  const first = registration({ methods: ["get", "POST"], dependencies: ["payments", "auth-session"] });
  const second = registration({ methods: ["POST", "get"], dependencies: ["auth-session", "payments"] });
  assert.deepEqual(validatePublicReadRegistrationFixture(first), validatePublicReadRegistrationFixture(second));
  assert.deepEqual(validatePublicReadRegistrationFixture(first), validatePublicReadRegistrationFixture(first));
});

test("CLI accepts local valid fixtures and rejects an empty valid directory", async () => {
  const success = await execFileAsync(process.execPath, [validatorScript], { cwd: root });
  assert.match(success.stdout, /passed/);

  const emptyRoot = await mkdtemp(path.join(tmpdir(), "discovery-public-read-registration-"));
  await mkdir(path.join(emptyRoot, "template-kit/fixtures/discovery-public-read-registration/valid"), {
    recursive: true,
  });
  try {
    await assert.rejects(
      execFileAsync(process.execPath, [validatorScript], { cwd: emptyRoot }),
      /requires at least one valid fixture/,
    );
  } finally {
    await rm(emptyRoot, { recursive: true, force: true });
  }
});
