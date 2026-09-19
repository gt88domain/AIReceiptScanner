import { NativeModule, requireOptionalNativeModule } from "expo";
import type {
  LocalReceiptOcrResult,
  ReceiptScanResult,
  ReceiptVisionModuleEvents,
} from "./ReceiptVision.types";

declare class ReceiptVisionNativeModule extends NativeModule<ReceiptVisionModuleEvents> {
  isDocumentScannerSupported(): boolean;
  scanDocument(): Promise<ReceiptScanResult>;
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

export function recognizeReceipt(uri: string) {
  return requireReceiptVision().recognizeReceipt(uri);
}
