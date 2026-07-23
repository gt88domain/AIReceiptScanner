export const templatePatterns = [
  { id: "directory", category: "directory", layout: "grid", order: 0 },
  { id: "marketplace", category: "marketplace", layout: "grid", order: 1 },
  { id: "resources", category: "content", layout: "grid", order: 2 },
  { id: "changelog", category: "content", layout: "rows", order: 3 },
  { id: "jobs", category: "directory", layout: "rows", order: 4 },
  { id: "projects", category: "marketplace", layout: "grid", order: 5 },
] as const;

export type TemplatePattern = (typeof templatePatterns)[number];
export type TemplateSlug = TemplatePattern["id"];
export type TemplateCategory = TemplatePattern["category"];
export type TemplateLayout = TemplatePattern["layout"];

export function getTemplatePattern(slug: string): TemplatePattern | undefined {
  return templatePatterns.find((pattern) => pattern.id === slug);
}
