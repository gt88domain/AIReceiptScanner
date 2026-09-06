import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { novelServerClient } from "./server-client";

const rankingInput = z.object({ period: z.enum(["weekly", "monthly", "all"]).default("all") });

export const getPublicNovelRanking = createServerFn({ method: "GET" })
  .inputValidator((data: z.input<typeof rankingInput>) => rankingInput.parse(data))
  .handler(async () => novelServerClient.novels.list({ limit: 20, sort: "popular" }));
