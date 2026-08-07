import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { validateRouteOwnershipFixture } from "./check-discovery-route-ownership.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixtures = path.join(root, "template-kit/fixtures/discovery-route-ownership");

async function fixture(group, name) {
  return JSON.parse(await readFile(path.join(fixtures, group, `${name}.json`), "utf8"));
}

function codes(errors) {
  return errors.map((error) => error.code);
}

function validFixture(claims) {
  return {
    schemaVersion: 1,
    product: "candidate-directory",
    sourceRepository: "gt88domain/easystarter-template",
    sourceCommit: "eb36f970e7ddc8ba499e4c2b6e25f591a4ab2f97",
    claims,
  };
}

function proposedClaim(overrides = {}) {
  return {
    pattern: "/catalogue/:slug",
    owner: "candidate-directory",
    kind: "product-route",
    status: "proposed",
    ...overrides,
  };
}

test("accepts frozen AIBranding and Prompt Dir route facts", async () => {
  assert.deepEqual(validateRouteOwnershipFixture(await fixture("valid", "aibranding")), []);
  assert.deepEqual(validateRouteOwnershipFixture(await fixture("valid", "prompt-dir")), []);
});

test("rejects Foundation root dynamic product routes", async () => {
  assert.deepEqual(codes(validateRouteOwnershipFixture(await fixture("invalid", "foundation-root-dynamic"))), [
    "DISCOVERY_ROUTE_ROOT_DYNAMIC_FORBIDDEN",
    "DISCOVERY_ROUTE_ROOT_DYNAMIC_FORBIDDEN",
    "DISCOVERY_ROUTE_ROOT_DYNAMIC_FORBIDDEN",
    "DISCOVERY_ROUTE_ROOT_DYNAMIC_FORBIDDEN",
  ]);
});

test("rejects reserved and unregistered namespaces", async () => {
  assert.deepEqual(codes(validateRouteOwnershipFixture(await fixture("invalid", "reserved-segment"))), [
    "DISCOVERY_ROUTE_NAMESPACE_UNREGISTERED",
    "DISCOVERY_ROUTE_NAMESPACE_UNREGISTERED",
    "DISCOVERY_ROUTE_NAMESPACE_UNREGISTERED",
    "DISCOVERY_ROUTE_RESERVED_SEGMENT",
    "DISCOVERY_ROUTE_RESERVED_SEGMENT",
    "DISCOVERY_ROUTE_RESERVED_SEGMENT",
  ]);
  assert.deepEqual(codes(validateRouteOwnershipFixture(await fixture("invalid", "unregistered-namespace"))), [
    "DISCOVERY_ROUTE_NAMESPACE_UNREGISTERED",
  ]);
});

test("requires complete fixed source metadata", async () => {
  assert.deepEqual(codes(validateRouteOwnershipFixture(await fixture("invalid", "source-missing"))), [
    "DISCOVERY_ROUTE_FIXTURE_SOURCE_REQUIRED",
  ]);
  assert.deepEqual(codes(validateRouteOwnershipFixture(await fixture("invalid", "source-commit-invalid"))), [
    "DISCOVERY_ROUTE_FIXTURE_SOURCE_REQUIRED",
  ]);
});

test("rejects duplicate proposed claims and keeps errors stable", async () => {
  const duplicate = await fixture("invalid", "duplicate-claim");
  assert.deepEqual(codes(validateRouteOwnershipFixture(duplicate)), [
    "DISCOVERY_ROUTE_DUPLICATE_CLAIM",
  ]);
  const reserved = await fixture("invalid", "reserved-segment");
  const errors = validateRouteOwnershipFixture(reserved);
  assert.deepEqual(
    errors,
    validateRouteOwnershipFixture({ ...reserved, claims: [...reserved.claims].reverse() }),
  );
});

test("rejects same-pattern owner, status, and kind conflicts", () => {
  for (const claims of [
    [proposedClaim(), proposedClaim({ owner: "other-owner" })],
    [proposedClaim(), proposedClaim({ status: "frozen-existing" })],
    [
      proposedClaim({ status: "frozen-existing" }),
      proposedClaim({ kind: "resource-route", status: "frozen-existing" }),
    ],
  ]) {
    assert.deepEqual(codes(validateRouteOwnershipFixture(validFixture(claims))), [
      "DISCOVERY_ROUTE_DUPLICATE_CLAIM",
    ]);
  }
});

test("rejects invalid fixture and claim shapes", () => {
  const invalidClaims = [
    proposedClaim({ status: undefined }),
    proposedClaim({ status: "unknown" }),
    proposedClaim({ kind: "unknown" }),
    proposedClaim({ owner: "" }),
    proposedClaim({ pattern: "catalogue/:slug" }),
  ];
  for (const claim of invalidClaims) {
    assert.deepEqual(codes(validateRouteOwnershipFixture(validFixture([claim]))), [
      "DISCOVERY_ROUTE_FIXTURE_INVALID",
    ]);
  }
  assert.deepEqual(
    codes(validateRouteOwnershipFixture({ ...validFixture([]), product: "" })),
    ["DISCOVERY_ROUTE_FIXTURE_INVALID"],
  );
});

test("allows only an explicit duplicate frozen fact for the same product", async () => {
  const aibranding = await fixture("valid", "aibranding");
  assert.deepEqual(
    validateRouteOwnershipFixture({ ...aibranding, claims: [...aibranding.claims, aibranding.claims[0]] }),
    [],
  );
});
