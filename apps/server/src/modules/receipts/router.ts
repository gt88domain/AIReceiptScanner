import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { requireUser } from "@/auth/guards";
import { protectedProcedure } from "@/lib/orpc";
import {
  createReceipt,
  deleteReceipt,
  getReceipt,
  listReceipts,
  ReceiptIdempotencyConflictError,
  ReceiptVersionConflictError,
  updateReceipt,
} from "./service";

const amountMinorSchema = z
  .number()
  .int()
  .safe()
  .min(-1_000_000_000_000)
  .max(1_000_000_000_000);
const optionalAmountMinorSchema = amountMinorSchema.nullable();
const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    );
  }, "Invalid purchase date");

const merchantNameSchema = z.string().trim().min(1).max(200);
const purchaseTimeSchema = z.string().regex(/^\d{2}:\d{2}(?::\d{2})?$/);
const currencySchema = z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/);
const paymentMethodSchema = z.string().trim().max(64);
const paymentLast4Schema = z.string().regex(/^\d{4}$/);
const categorySchema = z.string().trim().max(64);

const receiptSchema = z.object({
  id: z.string(),
  captureId: z.string(),
  merchantName: z.string(),
  purchaseDate: z.string(),
  purchaseTime: z.string().nullable(),
  currency: z.string(),
  subtotalMinor: z.number().nullable(),
  taxMinor: z.number().nullable(),
  tipMinor: z.number().nullable(),
  totalMinor: z.number(),
  paymentMethod: z.string().nullable(),
  paymentLast4: z.string().nullable(),
  category: z.string().nullable(),
  verificationStatus: z.literal("verified"),
  extractionSource: z.enum(["apple-vision", "manual", "cloud"]),
  localQuality: z.enum(["LOCAL_PASS", "LOCAL_REVIEW", "LOCAL_FAIL"]).nullable(),
  extractionDurationMs: z.number().nullable(),
  engineVersion: z.string().nullable(),
  version: z.number().int(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const createReceiptInputSchema = z.object({
  captureId: z.string().trim().min(8).max(128),
  merchantName: merchantNameSchema,
  purchaseDate: dateSchema,
  purchaseTime: purchaseTimeSchema.nullable().default(null),
  currency: currencySchema,
  subtotalMinor: optionalAmountMinorSchema.default(null),
  taxMinor: optionalAmountMinorSchema.default(null),
  tipMinor: optionalAmountMinorSchema.default(null),
  totalMinor: amountMinorSchema,
  paymentMethod: paymentMethodSchema.nullable().default(null),
  paymentLast4: paymentLast4Schema.nullable().default(null),
  category: categorySchema.nullable().default(null),
  extractionSource: z.enum(["apple-vision", "manual", "cloud"]).default("apple-vision"),
  localQuality: z.enum(["LOCAL_PASS", "LOCAL_REVIEW", "LOCAL_FAIL"]).nullable().default(null),
  extractionDurationMs: z.number().int().min(0).max(300_000).nullable().default(null),
  engineVersion: z.string().trim().max(128).nullable().default(null),
});

const updateReceiptInputSchema = z.object({
  id: z.string(),
  expectedVersion: z.number().int().min(1),
  merchantName: merchantNameSchema.optional(),
  purchaseDate: dateSchema.optional(),
  purchaseTime: purchaseTimeSchema.nullable().optional(),
  currency: currencySchema.optional(),
  subtotalMinor: optionalAmountMinorSchema.optional(),
  taxMinor: optionalAmountMinorSchema.optional(),
  tipMinor: optionalAmountMinorSchema.optional(),
  totalMinor: amountMinorSchema.optional(),
  paymentMethod: paymentMethodSchema.nullable().optional(),
  paymentLast4: paymentLast4Schema.nullable().optional(),
  category: categorySchema.nullable().optional(),
}).refine(
  (input) =>
    Object.entries(input).some(
      ([key, value]) => key !== "id" && key !== "expectedVersion" && value !== undefined,
    ),
  { message: "At least one receipt field must be updated" },
);

export const receiptsRouter = {
  create: protectedProcedure
    .input(createReceiptInputSchema)
    .output(receiptSchema)
    .handler(async ({ context, input }) => {
      const user = await requireUser(context);
      try {
        return await createReceipt(context.db, {
          userId: user.id,
          captureId: input.captureId,
          merchantName: input.merchantName,
          purchaseDate: input.purchaseDate,
          purchaseTime: input.purchaseTime,
          currency: input.currency,
          subtotalMinor: input.subtotalMinor,
          taxMinor: input.taxMinor,
          tipMinor: input.tipMinor,
          totalMinor: input.totalMinor,
          paymentMethod: input.paymentMethod,
          paymentLast4: input.paymentLast4,
          category: input.category,
          verificationStatus: "verified",
          extractionSource: input.extractionSource,
          localQuality: input.localQuality,
          extractionDurationMs: input.extractionDurationMs,
          engineVersion: input.engineVersion,
        });
      } catch (error) {
        if (error instanceof ReceiptIdempotencyConflictError) {
          throw new ORPCError("CONFLICT", {
            message: "This receipt capture was already saved with different data.",
          });
        }
        throw error;
      }
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .output(receiptSchema)
    .handler(async ({ context, input }) => {
      const user = await requireUser(context);
      const record = await getReceipt(context.db, user.id, input.id);
      if (!record) throw new ORPCError("NOT_FOUND");
      return record;
    }),

  list: protectedProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        perPage: z.number().int().min(1).max(50).default(20),
      }),
    )
    .output(
      z.object({
        data: z.array(receiptSchema),
        total: z.number(),
        page: z.number(),
        pageCount: z.number(),
      }),
    )
    .handler(async ({ context, input }) => {
      const user = await requireUser(context);
      return listReceipts(context.db, {
        ownerId: user.id,
        page: input.page,
        perPage: input.perPage,
      });
    }),

  update: protectedProcedure
    .input(updateReceiptInputSchema)
    .output(receiptSchema)
    .handler(async ({ context, input }) => {
      const user = await requireUser(context);
      const { id, expectedVersion, ...changes } = input;
      try {
        const record = await updateReceipt(context.db, {
          ownerId: user.id,
          id,
          expectedVersion,
          changes,
        });
        if (!record) throw new ORPCError("NOT_FOUND");
        return record;
      } catch (error) {
        if (error instanceof ReceiptVersionConflictError) {
          throw new ORPCError("CONFLICT", {
            message: "Receipt changed; reload before saving again.",
          });
        }
        throw error;
      }
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .output(z.object({ success: z.literal(true) }))
    .handler(async ({ context, input }) => {
      const user = await requireUser(context);
      const deleted = await deleteReceipt(context.db, user.id, input.id);
      if (!deleted) throw new ORPCError("NOT_FOUND");
      return { success: true as const };
    }),
};
