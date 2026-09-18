/**
 * File Serve Handler
 *
 * Handles file download/serving from storage.
 * Supports caching headers for performance.
 */

import type { Context as HonoContext } from "hono";
import { resolveCommonConfig } from "@repo/app-config/config";
import type { ServerRuntimeConfig } from "../lib/runtime-config";
import { resolveStorageBinding } from "../lib/storage-binding";
import { getStorageProvider, parseStoragePath } from "../storage";

const EXECUTABLE_CONTENT_TYPES = new Set([
  "text/html",
  "application/xhtml+xml",
  "image/svg+xml",
  "text/xml",
  "application/xml",
  "text/javascript",
  "application/javascript",
]);

/**
 * Handle file serving/download
 *
 * GET /api/storage/*
 *
 * Serves files from storage with proper content-type and caching headers.
 *
 * Response:
 * - 200: File binary data with appropriate headers
 * - 400: { error: string } - Missing key
 * - 404: { error: string } - File not found
 */
export async function handleFileServe(
  c: HonoContext<{ Bindings: Cloudflare.Env }>,
  runtimeConfig: ServerRuntimeConfig,
): Promise<Response> {
  const storagePath = c.req.path.replace("/api/storage/", "");
  const parsedStoragePath = parseStoragePath(storagePath);
  const storageKeyPrefixes = resolveCommonConfig().storage.keyPrefixes;

  if (!parsedStoragePath) {
    return c.json({ error: "File key is required" }, 400);
  }

  if (!parsedStoragePath.key.startsWith(`${storageKeyPrefixes.avatar}/`)) {
    return c.json({ error: "Public storage only serves avatars" }, 404);
  }

  // Use storage provider for file serving
  const storageBinding = resolveStorageBinding(runtimeConfig.features, c.env);
  if (!storageBinding) return c.notFound();
  const storageProvider = getStorageProvider({
    storage: storageBinding,
    provider: runtimeConfig.storage.provider,
  });
  const file = await storageProvider.get(parsedStoragePath.key);

  if (!file) {
    return c.json({ error: "File not found" }, 404);
  }

  const headers = new Headers();

  const storedContentType = file.httpMetadata?.contentType?.split(";")[0].trim().toLowerCase();
  if (storedContentType && EXECUTABLE_CONTENT_TYPES.has(storedContentType)) {
    headers.set("Content-Type", "application/octet-stream");
    headers.set("Content-Disposition", "attachment");
  } else if (file.httpMetadata?.contentType) {
    headers.set("Content-Type", file.httpMetadata.contentType);
  }

  headers.set("Cache-Control", "public, max-age=300");

  // Set ETag for cache validation
  headers.set("ETag", file.etag);

  return c.newResponse(file.body, {
    status: 200,
    headers,
  });
}
