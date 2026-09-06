import { createServerFn } from "@tanstack/react-start";
import { novelServerClient } from "./server-client";

export const getPublicNovelHome = createServerFn({ method: "GET" }).handler(async () => {
  const [featured, ranking, worlds] = await Promise.all([
    novelServerClient.novels.list({ limit: 6, sort: "latest" }),
    novelServerClient.novels.list({ limit: 5, sort: "popular" }),
    novelServerClient.worlds.list({ limit: 6, sort: "popular" }),
  ]);
  return { featured: featured.items, ranking: ranking.items, worlds: worlds.items };
});
