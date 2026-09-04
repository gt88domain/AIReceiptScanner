import { ORPCError } from "@orpc/server";
import { SUPPORTED_STORAGE_PROVIDERS } from "@repo/app-config";
import { z } from "zod";
import { storageProcedure } from "@/lib/orpc";
import { requireStorageService } from "@/lib/storage-access";
import { backfillCurrentAvatarAsset, createAsset, deleteAsset } from "@/modules/assets/service";
import { listOwnedAssets } from "@/modules/assets/repository";
import {
  generateStorageKey,
  getMaxFileSize,
  getPublicUrl,
  getStoragePublicBaseUrl,
  getUserStoragePrefix,
  isAllowedFileSize,
  isAllowedFileType,
  resolveStorageProviderKey,
  sniffImageContentType,
} from "@/storage";

const uploadPurposeSchema = z.literal("avatar");
const storageProviderSchema = z.enum(SUPPORTED_STORAGE_PROVIDERS);

const uploadInputSchema = z.object({
  file: z.file(),
  purpose: uploadPurposeSchema,
  provider: storageProviderSchema.optional(),
});

const listInputSchema = z
  .object({
    limit: z.number().int().min(1).max(100).default(100),
    provider: storageProviderSchema.optional(),
    purpose: uploadPurposeSchema.optional(),
  })
  .optional();

const uploadOutputSchema = z.object({
  assetId: z.string(),
  url: z.string(),
  key: z.string(),
  size: z.number(),
  contentType: z.string(),
  provider: storageProviderSchema,
});

const listOutputSchema = z.object({
  files: z.array(uploadOutputSchema.extend({ uploadedAt: z.string().nullable() })),
});

export const storageRouter = {
  upload: storageProcedure
    .input(uploadInputSchema)
    .output(uploadOutputSchema)
    .handler(async ({ context, input }) => {
      const storageProvider = requireStorageService(context);
      const { session, t } = context;
      const { file, purpose } = input;
      const provider = resolveStorageProviderKey(input.provider);

      const userId = session?.user.id;
      if (!userId) {
        throw new ORPCError("UNAUTHORIZED", {
          message: t("errors.unauthorized"),
        });
      }

      const contentType = sniffImageContentType(
        new Uint8Array(await file.slice(0, 16).arrayBuffer()),
      );

      if (!contentType || !isAllowedFileType(purpose, contentType)) {
        throw new ORPCError("BAD_REQUEST", {
          message: t("errors.invalidFileType"),
        });
      }

      // Validate file size
      if (!isAllowedFileSize(purpose, file.size)) {
        const maxSize = getMaxFileSize(purpose);
        const maxSizeMB = Math.round(maxSize / 1024 / 1024);
        throw new ORPCError("BAD_REQUEST", {
          message: t("errors.fileTooLarge", { maxSizeMB }),
        });
      }

      // Generate storage key
      const key = generateStorageKey(purpose, userId, file.name, contentType);
      const assetRecord = await createAsset(context.db, storageProvider, {
        ownerId: userId,
        visibility: "public",
        storageKey: key,
        mimeType: contentType,
        data: file,
      });

      // Build the public URL
      const publicBaseUrl = getStoragePublicBaseUrl(context.env.SERVER_URL);
      const url = getPublicUrl(publicBaseUrl, key, provider);

      return {
        assetId: assetRecord.id,
        url,
        key,
        size: file.size,
        contentType,
        provider,
      };
    }),

  list: storageProcedure
    .input(listInputSchema)
    .output(listOutputSchema)
    .handler(async ({ context, input }) => {
      const storageProvider = requireStorageService(context);
      const { session, t } = context;
      const provider = resolveStorageProviderKey(input?.provider);

      const userId = session?.user.id;
      if (!userId) {
        throw new ORPCError("UNAUTHORIZED", {
          message: t("errors.unauthorized"),
        });
      }

      const publicBaseUrl = getStoragePublicBaseUrl(context.env.SERVER_URL);
      await backfillCurrentAvatarAsset(context.db, storageProvider, {
        ownerId: userId,
        publicBaseUrl,
      });
      const records = await listOwnedAssets(context.db, {
        ownerId: userId,
        storagePrefix: input?.purpose
          ? getUserStoragePrefix(input.purpose, userId)
          : undefined,
        limit: input?.limit ?? 100,
      });

      return {
        files: records.map((record) => ({
          assetId: record.id,
          url: getPublicUrl(publicBaseUrl, record.storageKey, provider),
          key: record.storageKey,
          size: record.size,
          contentType: record.mimeType,
          provider,
          uploadedAt: record.createdAt.toISOString(),
        })),
      };
    }),

  delete: storageProcedure
    .input(z.object({ assetId: z.string().min(1) }))
    .output(z.object({ success: z.boolean() }))
    .handler(async ({ context, input }) => {
      const storageProvider = requireStorageService(context);
      const { session, t } = context;
      const userId = session?.user.id;
      if (!userId) {
        throw new ORPCError("UNAUTHORIZED", {
          message: t("errors.unauthorized"),
        });
      }

      const deleted = await deleteAsset(context.db, storageProvider, {
        assetId: input.assetId,
        ownerId: userId,
      });
      if (!deleted) {
        throw new ORPCError("FORBIDDEN", {
          message: t("errors.forbidden"),
        });
      }

      return { success: true };
    }),
};
