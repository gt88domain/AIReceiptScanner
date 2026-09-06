import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { novelServerClient } from "./server-client";

const forumListInput = z.object({
  limit: z.number().int().min(1).max(24).default(12),
  section: z.string().max(80).optional(),
});

export type PublicForumListResult = Awaited<ReturnType<typeof getPublicForumList>>;

export const getPublicForumList = createServerFn({ method: "GET" })
  .inputValidator((data: z.input<typeof forumListInput>) => forumListInput.parse(data))
  .handler(async ({ data }) => novelServerClient.forums.list(data));

export const getPublicForumThread = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) =>
    z.object({ slug: z.string().trim().min(1).max(240) }).parse(data),
  )
  .handler(async ({ data }) => novelServerClient.forums.bySlug(data));

export const getPublicForumThreadById = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => novelServerClient.forums.byId(data));
