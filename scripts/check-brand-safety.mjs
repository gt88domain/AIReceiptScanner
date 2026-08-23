import { readdir, readFile, stat } from "node:fs/promises";
import { extname, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const reusableComponentRoots = [
  "apps/web/src/components/listing",
  "apps/web/src/components/public",
  "apps/web/src/components/content",
].map((path) => resolve(root, path));
const publicBrandRoots = [
  resolve(root, "apps/web/src"),
  resolve(root, "packages/app-config/src/public-runtime.ts"),
];
const sourceExtensions = new Set([".css", ".js", ".jsx", ".ts", ".tsx"]);

const colorRules = [
  {
    label: "raw hex color",
    pattern: /#[\da-f]{3}(?:[\da-f]|[\da-f]{3}|[\da-f]{5})?(?![\da-f])/iu,
  },
  {
    label: "Tailwind palette color class",
    pattern:
      /(?:^|[^A-Za-z0-9_-])(?:accent|bg|border|caret|decoration|divide|fill|from|outline|ring|shadow|stroke|text|to|via)-(?:amber|blue|cyan|emerald|fuchsia|gray|green|indigo|lime|neutral|orange|pink|purple|red|rose|sky|slate|stone|teal|violet|yellow|zinc)-(?:50|[1-9]00|950)(?:\/(?:\d{1,2}|100))?(?=$|[^A-Za-z0-9_-])/u,
  },
  {
    label: "Tailwind literal black/white class",
    pattern:
      /(?:^|[^A-Za-z0-9_-])(?:accent|bg|border|caret|decoration|divide|fill|from|outline|ring|shadow|stroke|text|to|via)-(?:black|white)(?:\/(?:\d{1,2}|100))?(?=$|[^A-Za-z0-9_-])/u,
  },
];

const brandRules = [
  { label: "template brand copy", pattern: /TanStack Template/u },
  { label: "legacy demo domain", pattern: /demo\.aiarticles\.com/u },
  { label: "Tailark product copy", pattern: /Tailark/u },
];

async function listSourceFiles(path) {
  const entry = await stat(path);
  if (entry.isFile()) return sourceExtensions.has(extname(path)) ? [path] : [];

  const files = [];
  const children = await readdir(path, { withFileTypes: true });
  children.sort((left, right) => left.name.localeCompare(right.name));
  for (const child of children) {
    files.push(...(await listSourceFiles(resolve(path, child.name))));
  }
  return files;
}

function findViolations(source, rules) {
  const violations = [];
  const lines = source.split(/\r?\n/u);
  for (const [index, line] of lines.entries()) {
    for (const rule of rules) {
      if (rule.pattern.test(line)) violations.push({ label: rule.label, line: index + 1 });
    }
  }
  return violations;
}

function runSelfCheck() {
  const unsafeColors = findViolations(
    [
      'style={{ color: "#fff" }}',
      'style={{ color: "#ffff" }}',
      'style={{ color: "#1a2b3c" }}',
      'style={{ color: "#1a2b3cff" }}',
      'className="bg-blue-500"',
      'className="text-white"',
    ].join("\n"),
    colorRules,
  );
  if (unsafeColors.length !== 6) {
    throw new Error("Brand safety self-check failed to detect literal component colors.");
  }
  if (findViolations('className="bg-surface text-ink fill-current"', colorRules).length !== 0) {
    throw new Error("Brand safety self-check rejected semantic component colors.");
  }
  if (findViolations("TanStack Template demo.aiarticles.com Tailark", brandRules).length !== 3) {
    throw new Error("Brand safety self-check failed to detect public brand residue.");
  }
}

async function scanRoots(paths, rules) {
  const violations = [];
  for (const path of paths) {
    for (const file of await listSourceFiles(path)) {
      const source = await readFile(file, "utf8");
      for (const violation of findViolations(source, rules)) {
        violations.push(`${relative(root, file)}:${violation.line}: ${violation.label}`);
      }
    }
  }
  return violations;
}

runSelfCheck();

if (process.argv.includes("--self-check")) {
  console.log("Brand safety self-check passed.");
} else {
  const violations = [
    ...(await scanRoots(reusableComponentRoots, colorRules)),
    ...(await scanRoots(publicBrandRoots, brandRules)),
  ];
  if (violations.length > 0) {
    throw new Error(`Brand safety violations:\n${violations.join("\n")}`);
  }
  console.log("Brand safety check passed.");
}
