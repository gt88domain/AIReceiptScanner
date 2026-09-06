import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { novelServerClient } from "./server-client";

const worldListInput = z.object({
  audience: z.enum(["male", "female", "lgbt", "general"]).optional(),
  complexity: z.enum(["starter", "balanced", "advanced", "expert"]).optional(),
  facet: z.enum(["theme", "character", "plot", "rule-system"]).optional(),
  limit: z.number().int().min(1).max(48).default(24),
  q: z.string().max(120).optional(),
  sort: z.enum(["popular", "latest", "forks", "novels"]).default("popular"),
  status: z.enum(["active", "mature", "archived"]).optional(),
  tag: z.string().max(80).optional(),
});

export const getPublicWorldList = createServerFn({ method: "GET" })
  .inputValidator((data: z.input<typeof worldListInput>) => worldListInput.parse(data))
  .handler(({ data }) => novelServerClient.worlds.list(data));
