import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { validatePublicReadDependencyFixture } from "./check-discovery-public-read-dependencies.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixtures = path.join(root, "template-kit/fixtures/discovery-public-read-dependencies");

const allowedDependencies = ["d1", "read-repository", "product-config", "request-log", "request-id"];
const forbiddenDependencies = [
  "auth-session",
  "payments",
  "credits",
  "entitlements",
  "jobs",
  "user-storage",
  "email-notification-write",
];

async function fixture(group, name) {
  return JSON.parse(await readFile(path.join(fixtures, group, `${name}.json`), "utf8"));
}

function codes(errors) {
  return errors.map((error) => error.code);
}

function proposal(dependencies) {
  return {
    schemaVersion: 1,
    product: "candidate-directory",
    operation: "public-read",
    dependencies,
  };
}

test("accepts the minimal anonymous read dependency fixture", async () => {
  assert.deepEqual(validatePublicReadDependencyFixture(await fixture("valid", "minimal-read")), []);
});

test("allows each explicitly approved public-read dependency", () => {
  for (const dependency of allowedDependencies) {
    assert.deepEqual(validatePublicReadDependencyFixture(proposal([dependency])), []);
  }
});

test("rejects every forbidden default dependency", () => {
  for (const dependency of forbiddenDependencies) {
    assert.deepEqual(codes(validatePublicReadDependencyFixture(proposal([dependency]))), [
      "DISCOVERY_PUBLIC_READ_DEPENDENCY_FORBIDDEN",
    ]);
  }
});

test("rejects unknown and duplicate dependencies", () => {
  assert.deepEqual(codes(validatePublicReadDependencyFixture(proposal(["unknown-service"]))), [
    "DISCOVERY_PUBLIC_READ_DEPENDENCY_FORBIDDEN",
  ]);
  assert.deepEqual(codes(validatePublicReadDependencyFixture(proposal(["d1", "d1"]))), [
    "DISCOVERY_PUBLIC_READ_DEPENDENCY_DUPLICATE",
  ]);
});

test("requires a well-formed public-read fixture and stable errors", () => {
  const invalid = {
    schemaVersion: 2,
    product: "",
    operation: "write",
    dependencies: "d1",
  };
  assert.deepEqual(codes(validatePublicReadDependencyFixture(invalid)), [
    "DISCOVERY_PUBLIC_READ_FIXTURE_INVALID",
  ]);
  const errors = validatePublicReadDependencyFixture(proposal(["payments", "auth-session"]));
  assert.deepEqual(errors, validatePublicReadDependencyFixture(proposal(["auth-session", "payments"])));
});
