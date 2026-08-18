import { defineCollections, defineDocs, frontmatterSchema } from "fumadocs-mdx/config";
import { z } from "zod";

export const docs = defineDocs({
  dir: "content/docs",
  docs: { files: ["**/*.mdx"] },
  meta: { files: ["**/meta.json"] },
});

export const author = defineCollections({
  type: "doc",
  dir: "content/author",
  files: ["**/*.mdx"],
  schema: z.object({
    name: z.string(),
    avatar: z.string().optional(),
    description: z.string().optional(),
    position: z.string().optional(),
  }),
});

export const category = defineCollections({
  type: "doc",
  dir: "content/category",
  files: ["**/*.mdx"],
  schema: z.object({
    name: z.string(),
    description: z.string().optional(),
  }),
});

export const blog = defineCollections({
  type: "doc",
  dir: "content/blog",
  files: ["**/*.mdx"],
  schema: frontmatterSchema.extend({
    date: z.string(),
    published: z.boolean().default(true),
    featured: z.boolean().optional().default(false),
    readTime: z.string().optional(),
    thumbnail: z.string().optional(),
    author: z.string(),
    categories: z.array(z.string()),
    tags: z.array(z.string()).optional().default([]),
  }),
});
