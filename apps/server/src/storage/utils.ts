/**
 * Storage Utilities
 *
 * Helper functions for key generation and validation.
 */

import { resolveCommonConfig } from "@repo/app-config/config";
import type { UploadPurpose } from "@repo/app-config/storage";

export function sniffImageContentType(bytes: Uint8Array): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return "image/gif";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

const MIME_EXTENSION_MAP = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "application/pdf": "pdf",
  "text/plain": "txt",
} as const;

/**
 * Generate a storage key for a file
 *
 * @param purpose - The purpose of the upload
 * @param userId - The user ID to namespace the file
 * @param filename - Original filename
 * @returns A unique storage key
 */
export function generateStorageKey(
  purpose: UploadPurpose,
  userId: string,
  filename: string,
  contentType?: string,
): string {
  const storageConfig = resolveCommonConfig().storage;

  // Validate inputs
  if (!userId || typeof userId !== "string") {
    throw new Error("Valid userId is required for storage key generation");
  }
  if (!filename || typeof filename !== "string") {
    throw new Error("Valid filename is required for storage key generation");
  }

  const mimeType = contentType?.split(";")[0].trim();
  const ext = filename.includes(".")
    ? filename.split(".").pop() || ""
    : mimeType
      ? MIME_EXTENSION_MAP[mimeType as keyof typeof MIME_EXTENSION_MAP] || ""
      : "";

  // Sanitize extension: keep alphanumeric, hyphens, underscores, limit to 10 chars
  const sanitizedExt = ext
    .toLowerCase()
    .replace(/[^\da-z\-_]/g, "")
    .slice(0, 10);

  return `${storageConfig.keyPrefixes[purpose]}/${userId}/${crypto.randomUUID()}.${sanitizedExt}`;
}
