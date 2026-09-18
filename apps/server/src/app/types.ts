import type { Hono } from "hono";

export type ServerApp = Hono<{ Bindings: Cloudflare.Env }>;
