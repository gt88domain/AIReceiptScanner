import { ORPCError } from "@orpc/server";

type BackofficePreviewEnv = Pick<Cloudflare.Env, "BACKOFFICE_PREVIEW">;

/** True only for the deliberately isolated local backoffice preview Worker. */
export function isBackofficePreview(env: BackofficePreviewEnv) {
  return env.BACKOFFICE_PREVIEW === "1";
}

/** Keeps a preview click from ever reaching an email or payment provider. */
export function assertBackofficePreviewAllowsExternalActions(env: BackofficePreviewEnv) {
  if (!isBackofficePreview(env)) return;

  throw new ORPCError("FORBIDDEN", {
    message: "External actions are disabled in Backoffice preview.",
    data: { code: "BACKOFFICE_PREVIEW_EXTERNAL_ACTION_DISABLED" },
  });
}
