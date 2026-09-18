import assert from "node:assert/strict";
import test from "node:test";
import {
  moduleTodoHeader,
  parseCsv,
  validateModuleTodo,
} from "./check-module-feature-todo.mjs";

function record(id, overrides = {}) {
  const fields = {
    id,
    area: "area",
    module_or_feature: "feature",
    slug_or_entry: "/entry",
    status: "planned",
    type: "type",
    priority: "P1",
    when: "before launch",
    current_state: "current",
    problem_or_risk: "risk",
    recommended_action: "action",
    solo_company_simplification: "simple",
    security_consideration: "secure",
    performance_consideration: "bounded",
    evidence: "docs",
    depends_on: "",
    acceptance_criteria: "accepted",
    ...overrides,
  };
  return moduleTodoHeader.map((name) => fields[name]);
}

function csv(records) {
  return [moduleTodoHeader, ...records]
    .map((fields) =>
      fields.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","),
    )
    .join("\n");
}

test("parses quoted commas, quotes, and embedded newlines", () => {
  const [fields] = parseCsv('"one, two","a ""quote""","line 1\nline 2"\n');
  assert.deepEqual(fields, ["one, two", 'a "quote"', "line 1\nline 2"]);
});

test("accepts the maintained shape and existing dependencies", async () => {
  const errors = await validateModuleTodo(
    csv([
      record("PROD-003"),
      record("WEB-001", { depends_on: "PROD-003" }),
    ]),
    { checkEvidence: false },
  );
  assert.deepEqual(errors, []);
});

test("reports width, duplicate, risk, and dependency drift together", async () => {
  const broken = csv([
    record("PROD-003", { problem_or_risk: "" }),
    record("PROD-003", { depends_on: "AUTH-999" }),
    [...record("WEB-001"), "extra"],
  ]);
  const errors = await validateModuleTodo(broken, { checkEvidence: false });
  assert.match(errors.join("\n"), /fields; expected 17/);
  assert.match(errors.join("\n"), /Duplicate ID: PROD-003/);
  assert.match(errors.join("\n"), /has no problem_or_risk/);
  assert.match(errors.join("\n"), /missing dependency AUTH-999/);
});
