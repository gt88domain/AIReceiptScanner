/**
 * Native upload uses a dedicated helper because React Native's default fetch/File handling
 * is not reliable with the generated oRPC file upload request. We still target the same
 * `/rpc/storage/upload` procedure and keep server-side validation/business logic unchanged,
 * but build the multipart payload explicitly so the native runtime can send the file body
 * correctly.
 */
import type { StorageUploadPurpose } from "@repo/app-config";
import type { NativeUploadFile } from "@/lib/image-picker/image-picker";
import { baseUrl, createNativeRequestHeaders } from "@/lib/orpc";

type StorageUploadResponse = {
  url: string;
  key: string;
  size: number;
  contentType: string;
};

type RpcResponse<T> = {
  json: T;
  meta?: unknown;
};

/**
 * Uploads a file to the storage service using the oRPC multipart upload contract.
 *
 * @param file - The file to upload, created from an image picker asset
 * @param purpose - The storage purpose (e.g., "avatar")
 * @returns The upload response with URL, key, size, and content type
 */
export async function uploadNativeStorageFile(
  file: NativeUploadFile,
  purpose: StorageUploadPurpose,
): Promise<StorageUploadResponse> {
  const headers = createNativeRequestHeaders();

  headers.set("accept", "application/json");

  const formData = new FormData();
  // oRPC expects multipart uploads in two parts:
  // 1. "data" carries the JSON payload plus blob path mappings.
  // 2. Numeric keys ("0", "1", ...) carry the actual file bodies referenced by maps.
  formData.append(
    "data",
    JSON.stringify({
      json: {
        file: {},
        purpose,
      },
      maps: [["file"]],
    }),
  );
  // The first uploaded file is referenced by maps[0] -> ["file"], so the field name must be "0".
  formData.append("0", file as never);

  const response = await fetch(`${baseUrl}/rpc/storage/upload`, {
    method: "POST",
    headers,
    body: formData,
  });

  const payload = (await response.json()) as RpcResponse<StorageUploadResponse> & {
    json?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(payload.json?.message || response.statusText);
  }

  return payload.json as StorageUploadResponse;
}
