import { clearReceiptDraft } from "./draft-storage";
import { decimalToMinorUnits } from "./parser/receipt-parser";
import type { ReceiptDraft } from "./types";
import { client } from "@/lib/orpc";
import { deleteDraftImage } from "@/modules/receipt-vision";

const SUPPORTED_MOBILE_CURRENCIES = new Set([
  "USD",
  "SGD",
  "EUR",
  "GBP",
  "JPY",
  "AUD",
  "CAD",
  "CNY",
  "HKD",
  "NZD",
  "CHF",
  "INR",
  "KRW",
]);

export class UnsupportedReceiptCurrencyError extends Error {
  constructor(currency: string) {
    super(`Receipt currency ${currency} is not supported for account sync yet`);
    this.name = "UnsupportedReceiptCurrencyError";
  }
}

function amountToSafeNumber(value: string, currency: string, required: boolean) {
  if (!value) {
    if (required) throw new Error("A required receipt amount is missing");
    return null;
  }

  const minor = decimalToMinorUnits(value, currency);
  if (minor === null) throw new Error("Receipt amount cannot be represented in minor currency units");

  const numeric = Number(minor);
  if (!Number.isSafeInteger(numeric) || Math.abs(numeric) > 1_000_000_000_000) {
    throw new Error("Receipt amount is outside the supported range");
  }
  return numeric;
}

export async function syncVerifiedReceiptDraft(draft: ReceiptDraft) {
  if (draft.verificationStatus !== "verified") {
    throw new Error("Receipt must be verified before syncing");
  }

  const currency = draft.fields.currency.toUpperCase();
  if (!SUPPORTED_MOBILE_CURRENCIES.has(currency)) {
    throw new UnsupportedReceiptCurrencyError(currency);
  }

  const record = await client.receipts.create({
    captureId: draft.captureId,
    merchantName: draft.fields.merchant,
    purchaseDate: draft.fields.purchaseDate,
    purchaseTime: null,
    currency,
    subtotalMinor: amountToSafeNumber(draft.fields.subtotal, currency, false),
    taxMinor: amountToSafeNumber(draft.fields.tax, currency, false),
    tipMinor: amountToSafeNumber(draft.fields.tip, currency, false),
    totalMinor: amountToSafeNumber(draft.fields.total, currency, true) as number,
    paymentMethod: draft.fields.paymentMethod || null,
    paymentLast4: draft.fields.paymentLast4 || null,
    category: null,
    extractionSource: "apple-vision",
    localQuality: draft.parse.quality,
    extractionDurationMs: draft.ocr.durationMs,
    engineVersion: draft.ocr.engineVersion,
  });

  // Keep the draft if cleanup fails. Retrying create is safe because captureId is idempotent.
  await deleteDraftImage(draft.imageUri);
  await clearReceiptDraft();

  return record;
}
