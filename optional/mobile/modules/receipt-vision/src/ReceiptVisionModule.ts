import { NativeModule, requireOptionalNativeModule } from "expo";
import type {
  LocalReceiptOcrResult,
  ReceiptDraftImageResult,
  ReceiptScanResult,
  ReceiptVisionModuleEvents,
} from "./ReceiptVision.types";

declare class ReceiptVisionNativeModule extends NativeModule<ReceiptVisionModuleEvents> {
  isDocumentScannerSupported(): boolean;
  scanDocument(): Promise<ReceiptScanResult>;
  persistDraftImage(uri: string): Promise<ReceiptDraftImageResult>;
  deleteDraftImage(uri: string): Promise<void>;
  recognizeReceipt(uri: string): Promise<LocalReceiptOcrResult>;
}

const nativeModule =
  requireOptionalNativeModule<ReceiptVisionNativeModule>("ReceiptVision");

function requireReceiptVision() {
  if (!nativeModule) {
    const error = new Error(
      "Receipt Vision is unavailable in this build. Use an iOS development build with the local native module linked.",
    ) as Error & { code?: string };
    error.code = "ERR_RECEIPT_VISION_UNAVAILABLE";
    throw error;
  }

  return nativeModule;
}

export function isReceiptVisionAvailable() {
  return nativeModule !== null;
}

export function isDocumentScannerSupported() {
  return nativeModule?.isDocumentScannerSupported() ?? false;
}

export function scanDocument() {
  return requireReceiptVision().scanDocument();
}

export function persistDraftImage(uri: string) {
  return requireReceiptVision().persistDraftImage(uri);
}

export function deleteDraftImage(uri: string) {
  return requireReceiptVision().deleteDraftImage(uri);
}

export function recognizeReceipt(uri: string) {
  return requireReceiptVision().recognizeReceipt(uri);
}
