import { access, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

export const moduleTodoHeader = [
  "id",
  "area",
  "module_or_feature",
  "slug_or_entry",
  "status",
  "type",
  "priority",
  "when",
  "current_state",
  "problem_or_risk",
  "recommended_action",
  "solo_company_simplification",
  "security_consideration",
  "performance_consideration",
  "evidence",
  "depends_on",
  "acceptance_criteria",
];

export function parseCsv(input) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (quoted) {
      if (character === '"' && input[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (quoted) throw new Error("CSV has an unterminated quoted field.");
  if (field || row.length > 0) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }

  return rows.filter((fields) => fields.some((value) => value.length > 0));
}

function isEvidencePath(value) {
  return (
    /^(?:apps|docs|packages|template-kit)\//.test(value) ||
    ["AGENTS.md", "GOVERNANCE.md", "package.json", "pnpm-lock.yaml"].includes(value)
  );
}

export async function validateModuleTodo(input, options = {}) {
  const root = options.root ?? process.cwd();
  const checkEvidence = options.checkEvidence ?? true;
  const [header, ...records] = parseCsv(input);
  const errors = [];

  if (!header) return ["CSV is empty."];
  if (header.length !== moduleTodoHeader.length) {
    errors.push(`Header has ${header.length} fields; expected ${moduleTodoHeader.length}.`);
  } else if (header.some((value, index) => value !== moduleTodoHeader[index])) {
    errors.push("Header does not match the maintained module TODO schema.");
  }

  const ids = new Set();
  for (const [index, record] of records.entries()) {
    const rowNumber = index + 2;
    if (record.length !== moduleTodoHeader.length) {
      errors.push(
        `Row ${rowNumber} has ${record.length} fields; expected ${moduleTodoHeader.length}.`,
      );
      continue;
    }

    const id = record[0].trim();
    if (!/^[A-Z]+-\d{3}$/.test(id)) errors.push(`Row ${rowNumber} has invalid ID: ${id}.`);
    if (ids.has(id)) errors.push(`Duplicate ID: ${id}.`);
    ids.add(id);
    if (!record[9].trim()) errors.push(`${id || `Row ${rowNumber}`} has no problem_or_risk.`);
    if (!record[14].trim()) errors.push(`${id || `Row ${rowNumber}`} has no evidence.`);
  }

  if (!ids.has("PROD-003")) errors.push("Required product-module decision PROD-003 is missing.");

  const dependencyPattern = /\b[A-Z]+-\d{3}\b/g;
  for (const record of records) {
    if (record.length !== moduleTodoHeader.length) continue;
    const id = record[0];
    for (const dependency of record[15].match(dependencyPattern) ?? []) {
      if (!ids.has(dependency)) errors.push(`${id} references missing dependency ${dependency}.`);
    }

    if (!checkEvidence) continue;
    for (const entry of record[14].split(";")) {
      const evidencePath = entry.trim();
      if (!isEvidencePath(evidencePath)) continue;
      await access(resolve(root, evidencePath)).catch(() =>
        errors.push(`${id} references missing evidence path ${evidencePath}.`),
      );
    }
  }

  return errors;
}

async function main() {
  const root = process.cwd();
  const csvPath = resolve(root, process.argv[2] ?? "docs/module-feature-todo.csv");
  const errors = await validateModuleTodo(await readFile(csvPath, "utf8"), { root });
  if (errors.length > 0) throw new Error(`Module TODO drift:\n${errors.join("\n")}`);
  console.log("Module TODO check passed.");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  await main();
}
