import { ORPCError } from "@orpc/server";

type BackofficePreviewEnv = Pick<Cloudflare.Env, "BACKOFFICE_PREVIEW">;
type ProductionPreviewEnv = BackofficePreviewEnv & Pick<Cloudflare.Env, "NODE_ENV">;

/** True only for the deliberately isolated local backoffice preview Worker. */
export function isBackofficePreview(env: BackofficePreviewEnv) {
  return env.BACKOFFICE_PREVIEW === "1";
}

export function assertBackofficePreviewNotInProduction(env: ProductionPreviewEnv) {
  if (env.NODE_ENV === "production" && isBackofficePreview(env)) {
    throw new Error("BACKOFFICE_PREVIEW must not be enabled in production");
  }
}

/** Keeps a preview click from ever reaching an email or payment provider. */
export function assertBackofficePreviewAllowsExternalActions(env: BackofficePreviewEnv) {
  if (!isBackofficePreview(env)) return;

  throw new ORPCError("FORBIDDEN", {
    message: "External actions are disabled in Backoffice preview.",
    data: { code: "BACKOFFICE_PREVIEW_EXTERNAL_ACTION_DISABLED" },
  });
}
