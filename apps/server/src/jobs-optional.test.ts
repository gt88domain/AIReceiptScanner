import assert from "node:assert/strict";
import test from "node:test";
import {
  createPlatformComposition,
  createProductFeatures,
  productProfiles,
} from "@repo/app-config";
import { ORPCError } from "@orpc/server";
import { requireJobsService } from "./lib/jobs-access";
import { resolveJobQueue } from "./lib/jobs-binding";
import { buildWorkerHandler } from "./lib/worker-handler";

const handlers = {
  fetch() {
    return new Response("ok");
  },
  scheduled: async () => {},
  queue: async () => {},
};

const jobsOff = createProductFeatures({
  jobs: false,
  web: { billing: false, credits: false, creditPurchases: false },
  native: { billing: false, credits: false, creditPurchases: false },
});

const jobsOn = createProductFeatures({
  jobs: true,
  web: { billing: false, credits: false, creditPurchases: false },
  native: { billing: false, credits: false, creditPurchases: false },
});

test("jobs-off Worker omits Queue and scheduled handlers", () => {
  const worker = buildWorkerHandler(jobsOff, handlers);
  assert.equal(Object.hasOwn(worker, "fetch"), true);
  assert.equal(Object.hasOwn(worker, "queue"), false);
  assert.equal(Object.hasOwn(worker, "scheduled"), false);
});

test("directory-lite Worker exports fetch only", () => {
  const features = createPlatformComposition(productProfiles["directory-lite"].features).features;
  const worker = buildWorkerHandler(features, handlers);
  assert.equal(Object.hasOwn(worker, "fetch"), true);
  assert.equal(Object.hasOwn(worker, "queue"), false);
  assert.equal(Object.hasOwn(worker, "scheduled"), false);
});

test("jobs-on Worker retains Queue and scheduled handlers", () => {
  const worker = buildWorkerHandler(jobsOn, handlers);
  assert.equal(Object.hasOwn(worker, "queue"), true);
  assert.equal(Object.hasOwn(worker, "scheduled"), true);
});

test("Jobs procedures fail closed without a service", () => {
  assert.throws(
    () => requireJobsService({ jobs: undefined }),
    (error) => error instanceof ORPCError && error.data?.code === "FEATURE_DISABLED",
  );
});

test("jobs-off context never reads a trap Queue binding", () => {
  const env: Pick<Cloudflare.Env, "JOB_QUEUE"> = {
    get JOB_QUEUE(): Queue {
      throw new Error("JOB_QUEUE must not be accessed");
    },
  };
  assert.equal(resolveJobQueue(jobsOff, env), undefined);
});
