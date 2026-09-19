import AsyncStorage from "@react-native-async-storage/async-storage";
import type { LocalReceiptOcrResult } from "@/modules/receipt-vision";
import type {
  ReceiptDraft,
  ReceiptFieldName,
  ReceiptFields,
  ReceiptParseResult,
} from "./types";

const RECEIPT_DRAFT_KEY = "aireceiptscanner_receipt_draft_v1";

function redactSensitiveOcrText(text: string) {
  return text
    .replace(/\b(?:\d[ -]?){13,19}\b/g, "[redacted-card-number]")
    .replace(/\b(CVV|CVC|CID)\s*[:#-]?\s*\d{3,4}\b/gi, "$1 [redacted]");
}

function sanitizeOcrForDraft(ocr: LocalReceiptOcrResult): LocalReceiptOcrResult {
  return {
    ...ocr,
    fullText: redactSensitiveOcrText(ocr.fullText),
    lines: ocr.lines.map((line) => ({
      ...line,
      text: redactSensitiveOcrText(line.text),
    })),
  };
}

function newCaptureId() {
  return `capture-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createReceiptDraft(input: {
  source: ReceiptDraft["source"];
  imageUri: string;
  ocr: LocalReceiptOcrResult;
  parse: ReceiptParseResult;
}): ReceiptDraft {
  const now = new Date().toISOString();
  return {
    version: 1,
    captureId: newCaptureId(),
    createdAt: now,
    updatedAt: now,
    source: input.source,
    imageUri: input.imageUri,
    ocr: sanitizeOcrForDraft(input.ocr),
    parse: input.parse,
    fields: { ...input.parse.fields },
    editedFields: [],
    verificationStatus: "pending",
    verifiedAt: null,
  };
}

export async function saveReceiptDraft(draft: ReceiptDraft) {
  const nextDraft = { ...draft, updatedAt: new Date().toISOString() };
  await AsyncStorage.setItem(RECEIPT_DRAFT_KEY, JSON.stringify(nextDraft));
  return nextDraft;
}

export async function loadReceiptDraft(): Promise<ReceiptDraft | null> {
  const raw = await AsyncStorage.getItem(RECEIPT_DRAFT_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<ReceiptDraft>;
    if (parsed.version !== 1 || !parsed.captureId || !parsed.fields || !parsed.imageUri) {
      return null;
    }
    return parsed as ReceiptDraft;
  } catch {
    return null;
  }
}

export async function updateReceiptDraftFields(
  draft: ReceiptDraft,
  fields: ReceiptFields,
  editedFields: ReceiptFieldName[],
) {
  return saveReceiptDraft({
    ...draft,
    fields,
    editedFields: [...new Set(editedFields)],
  });
}

export async function markReceiptDraftVerified(
  draft: ReceiptDraft,
  fields: ReceiptFields,
  editedFields: ReceiptFieldName[],
) {
  const now = new Date().toISOString();
  return saveReceiptDraft({
    ...draft,
    fields,
    editedFields: [...new Set(editedFields)],
    verificationStatus: "verified",
    verifiedAt: now,
  });
}

export async function clearReceiptDraft() {
  await AsyncStorage.removeItem(RECEIPT_DRAFT_KEY);
}
