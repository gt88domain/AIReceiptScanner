import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { novelServerClient } from "./server-client";

const novelListInput = z.object({
  audience: z.enum(["for-male", "for-female", "for-lgbt"]).optional(),
  category: z.string().max(80).optional(),
  limit: z.number().int().min(1).max(48).default(48),
  q: z.string().max(120).optional(),
  sort: z.enum(["latest", "popular", "updated", "chapters"]).default("latest"),
  status: z.enum(["ongoing", "completed", "hiatus"]).optional(),
  tag: z.string().max(80).optional(),
  words: z.enum(["lt300k", "300k-1m", "gt1m"]).optional(),
});

export type PublicNovelListResult = Awaited<ReturnType<typeof getPublicNovelList>>;

/** Server-render the first list state; later URL changes call the same public oRPC procedure. */
export const getPublicNovelList = createServerFn({ method: "GET" })
  .inputValidator((data: z.input<typeof novelListInput>) => novelListInput.parse(data))
  .handler(async ({ data }) => novelServerClient.novels.list(data));
