import type { LocalReceiptOcrResult } from "@/modules/receipt-vision";

export type LocalReceiptQuality = "LOCAL_PASS" | "LOCAL_REVIEW" | "LOCAL_FAIL";
export type ReceiptVerificationStatus = "pending" | "verified";

export type ReceiptFieldName =
  | "merchant"
  | "purchaseDate"
  | "currency"
  | "subtotal"
  | "tax"
  | "tip"
  | "total"
  | "paymentMethod"
  | "paymentLast4";

export type ReceiptFields = Record<ReceiptFieldName, string>;

export type ReceiptWarning = {
  code: string;
  field?: ReceiptFieldName;
  message: string;
};

export type ReceiptFieldEvidence = Partial<
  Record<
    ReceiptFieldName,
    {
      sourceText: string;
      confidence: number | null;
    }
  >
>;

export type ReceiptParseResult = {
  quality: LocalReceiptQuality;
  fields: ReceiptFields;
  warnings: ReceiptWarning[];
  evidence: ReceiptFieldEvidence;
};

export type ReceiptDraft = {
  version: 1;
  captureId: string;
  createdAt: string;
  updatedAt: string;
  source: "camera" | "library";
  imageUri: string;
  ocr: LocalReceiptOcrResult;
  parse: ReceiptParseResult;
  fields: ReceiptFields;
  editedFields: ReceiptFieldName[];
  verificationStatus: ReceiptVerificationStatus;
  verifiedAt: string | null;
};
