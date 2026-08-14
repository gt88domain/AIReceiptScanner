export const BACKOFFICE_PREVIEW_WORKER = "easystarter-backoffice-preview";
export const BACKOFFICE_PREVIEW_D1_ID = "00000000-0000-0000-0000-000000000000";

/** Refuse any preview command that is not pinned to the dedicated local Worker and D1. */
export function assertBackofficePreviewSafety({
  backofficePreview,
  nodeEnv,
  workerName,
  d1DatabaseId,
  isLocal,
}) {
  if (backofficePreview !== "1") {
    throw new Error("BACKOFFICE_PREVIEW=1 is required to start Backoffice preview.");
  }
  if (nodeEnv === "production") {
    throw new Error("Backoffice preview refuses NODE_ENV=production.");
  }
  if (!isLocal) {
    throw new Error("Backoffice preview only supports Wrangler --local.");
  }
  if (workerName !== BACKOFFICE_PREVIEW_WORKER) {
    throw new Error("Backoffice preview refuses a Worker other than its dedicated local Worker.");
  }
  if (d1DatabaseId !== BACKOFFICE_PREVIEW_D1_ID) {
    throw new Error("Backoffice preview refuses a D1 database other than its dedicated local D1.");
  }
}
