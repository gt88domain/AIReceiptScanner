export type ReceiptVisionModuleEvents = {};

export type ReceiptScanResult = {
  uri: string;
  width: number;
  height: number;
};

export type ReceiptOcrBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ReceiptOcrLine = {
  text: string;
  confidence: number | null;
  bounds: ReceiptOcrBounds;
};

export type LocalReceiptOcrResult = {
  engine: "apple-vision";
  engineVersion: string;
  osVersion: string;
  durationMs: number;
  width: number;
  height: number;
  lines: ReceiptOcrLine[];
  fullText: string;
};
