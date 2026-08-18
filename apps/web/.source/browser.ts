// @ts-nocheck
/// <reference types="vite/client" />
import { browser } from 'fumadocs-mdx/runtime/browser';
import type * as Config from '../source.config';

const create = browser<typeof Config, import("fumadocs-mdx/runtime/types").InternalTypeConfig & {
  DocData: {
  }
}>();
const browserCollections = {
  author: create.doc("author", import.meta.glob(["./**/*.mdx"], {
    "base": "./../content/author",
    "query": {
      "collection": "author"
    },
    "eager": false
  })),
  blog: create.doc("blog", import.meta.glob(["./**/*.mdx"], {
    "base": "./../content/blog",
    "query": {
      "collection": "blog"
    },
    "eager": false
  })),
  category: create.doc("category", import.meta.glob(["./**/*.mdx"], {
    "base": "./../content/category",
    "query": {
      "collection": "category"
    },
    "eager": false
  })),
  docs: create.doc("docs", import.meta.glob(["./**/*.mdx"], {
    "base": "./../content/docs",
    "query": {
      "collection": "docs"
    },
    "eager": false
  })),
};
export default browserCollections;