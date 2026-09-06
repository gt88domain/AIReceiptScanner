import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { novelServerClient } from "./server-client";

export const getPublicNovelBySlug = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) =>
    z.object({ slug: z.string().min(1).max(160) }).parse(data),
  )
  .handler(async ({ data }) => novelServerClient.novels.bySlug(data));

export const getPublicNovelChapters = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) =>
    z.object({ slug: z.string().min(1).max(160) }).parse(data),
  )
  .handler(async ({ data }) => novelServerClient.novels.chapters.list(data));

export const getPublicRelatedNovels = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) =>
    z.object({ slug: z.string().min(1).max(160) }).parse(data),
  )
  .handler(async ({ data }) => novelServerClient.novels.related(data));

export const getPublicNovelChapter = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string; number: number }) =>
    z
      .object({
        slug: z.string().min(1).max(160),
        number: z.number().int().positive().max(100_000),
      })
      .parse(data),
  )
  .handler(async ({ data }) => novelServerClient.novels.chapters.byNumber(data));
