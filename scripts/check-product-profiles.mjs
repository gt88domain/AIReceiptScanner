import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const profilesRoot = join(root, "template-kit", "profiles");
const fixturesRoot = join(root, "template-kit", "fixtures", "profiles");
const profileIds = ["full-saas", "account-app", "directory"];
const zeroD1Id = "00000000-0000-0000-0000-000000000000";

function fail(message) {
  throw new Error(`[profiles] ${message}`);
}

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    fail(`${path} must contain valid JSONC-compatible JSON: ${error.message}`);
  }
}

function hasBinding(entries, binding) {
  return Array.isArray(entries) && entries.some((entry) => entry?.binding === binding);
}

function validateServerExample(profile, server) {
  const resources = new Set(profile.expectedResources);
  const d1 = server.d1_databases?.find((entry) => entry?.binding === "DB");
  if (!d1 || d1.database_id !== zeroD1Id)
    fail(`${profile.id} must declare the placeholder DB binding.`);

  const hasStorage = hasBinding(server.r2_buckets, "STORAGE");
  if (resources.has("R2") !== hasStorage)
    fail(`${profile.id} R2 example does not match profile metadata.`);

  const producer = server.queues?.producers?.find((entry) => entry?.binding === "JOB_QUEUE");
  const consumers = server.queues?.consumers ?? [];
  const queueConsumer = producer && consumers.find((entry) => entry?.queue === producer.queue);
  const dlqName = queueConsumer?.dead_letter_queue;
  const hasJobs = Boolean(
    producer && queueConsumer && dlqName && consumers.some((entry) => entry?.queue === dlqName),
  );
  if (resources.has("Queue") !== hasJobs || resources.has("DLQ") !== hasJobs) {
    fail(`${profile.id} Queue/DLQ example does not match profile metadata.`);
  }
  const hasCron = Array.isArray(server.triggers?.crons) && server.triggers.crons.length > 0;
  if (resources.has("Cron") !== hasCron)
    fail(`${profile.id} Cron example does not match profile metadata.`);
}

function validateWebExample(profile, web) {
  if (!hasBinding(web.services, "API_SERVICE"))
    fail(`${profile.id} web example must bind API_SERVICE.`);
  if (!String(web.name ?? "").startsWith(`replace-${profile.id}-web-worker`)) {
    fail(`${profile.id} web worker must retain a non-deployable placeholder name.`);
  }
}

function validatePlaceholders(profile, texts) {
  const combined = texts.join("\n");
  if (!combined.includes("replace-") || !combined.includes(zeroD1Id)) {
    fail(`${profile.id} examples must retain non-deployable resource placeholders.`);
  }
  if (/\b(?:sk_|whsec_|price_|creem_live_)/.test(combined)) {
    fail(`${profile.id} examples must not contain provider secrets or price IDs.`);
  }
  if (
    profile.id !== "full-saas" &&
    /\b(?:stripe|creem|waffo|revenuecat)\b/i.test(texts.slice(0, 2).join("\n"))
  ) {
    fail(`${profile.id} server examples must not declare payment providers.`);
  }
}

for (const id of profileIds) {
  const directory = join(profilesRoot, id);
  const [profileText, serverText, webText] = await Promise.all([
    readFile(join(directory, "profile.json"), "utf8"),
    readFile(join(directory, "wrangler.server.example.jsonc"), "utf8"),
    readFile(join(directory, "wrangler.web.example.jsonc"), "utf8"),
  ]);
  const [profile, server, web, fixture] = await Promise.all([
    readJson(join(directory, "profile.json")),
    readJson(join(directory, "wrangler.server.example.jsonc")),
    readJson(join(directory, "wrangler.web.example.jsonc")),
    readJson(join(fixturesRoot, `${id}.json`)),
  ]);

  if (profile.id !== id || !profile.features || !Array.isArray(profile.expectedResources)) {
    fail(`${id} profile metadata is incomplete.`);
  }
  if ((profile.features.storage === true) !== profile.expectedResources.includes("R2")) {
    fail(`${id} storage feature and expected resources disagree.`);
  }
  if (
    JSON.stringify(profile.features) !== JSON.stringify(fixture.expectedFeatures) ||
    JSON.stringify(profile.expectedResources) !== JSON.stringify(fixture.requiredResources)
  ) {
    fail(`${id} profile metadata and fixture disagree.`);
  }
  if (profile.features.jobs !== true || !profile.expectedResources.includes("Queue")) {
    fail(`${id} must keep Jobs infrastructure in v0.4.1.`);
  }
  validateServerExample(profile, server);
  validateWebExample(profile, web);
  validatePlaceholders(profile, [serverText, webText, profileText]);
}

console.log("Product profile examples passed.");
