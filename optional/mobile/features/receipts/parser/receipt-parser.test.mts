import assert from "node:assert/strict";
import test from "node:test";
import {
  decimalToMinorUnits,
  normalizeDecimalAmount,
  parseLocalReceipt,
  validateReceiptFieldsForVerification,
} from "./receipt-parser.ts";
import type { LocalReceiptOcrResult } from "../../../modules/receipt-vision/src/ReceiptVision.types.ts";

function ocr(lines: Array<[string, number, number]>): LocalReceiptOcrResult {
  return {
    engine: "apple-vision",
    engineVersion: "test",
    osVersion: "test",
    durationMs: 10,
    width: 1000,
    height: 2000,
    lines: lines.map(([text, y, confidence]) => ({
      text,
      confidence,
      bounds: { x: 0.1, y, width: 0.8, height: 0.04 },
    })),
    fullText: lines.map(([text]) => text).join("\n"),
  };
}

test("extracts critical fields from an unambiguous USD receipt", () => {
  const result = parseLocalReceipt(
    ocr([
      ["ACME MARKET", 0.05, 0.99],
      ["2026-09-19", 0.15, 0.98],
      ["SUBTOTAL USD 10.00", 0.7, 0.97],
      ["TAX USD 0.80", 0.75, 0.97],
      ["TOTAL USD 10.80", 0.82, 0.99],
      ["VISA XXXX 1234", 0.9, 0.98],
    ]),
  );

  assert.equal(result.fields.merchant, "ACME MARKET");
  assert.equal(result.fields.purchaseDate, "2026-09-19");
  assert.equal(result.fields.currency, "USD");
  assert.equal(result.fields.subtotal, "10.00");
  assert.equal(result.fields.tax, "0.80");
  assert.equal(result.fields.total, "10.80");
  assert.equal(result.fields.paymentMethod, "Visa");
  assert.equal(result.fields.paymentLast4, "1234");
  assert.equal(result.quality, "LOCAL_PASS");
});

test("generic dollar and ambiguous slash date require review", () => {
  const result = parseLocalReceipt(
    ocr([
      ["CAFE NORTH", 0.05, 0.99],
      ["03/04/2026", 0.15, 0.99],
      ["TOTAL $12.30", 0.8, 0.99],
    ]),
  );

  assert.equal(result.fields.currency, "");
  assert.equal(result.fields.purchaseDate, "");
  assert.ok(result.warnings.some((warning) => warning.code === "CURRENCY_AMBIGUOUS"));
  assert.ok(result.warnings.some((warning) => warning.code === "DATE_AMBIGUOUS"));
  assert.notEqual(result.quality, "LOCAL_PASS");
});

test("normalizes common decimal separators without floating point math", () => {
  assert.equal(normalizeDecimalAmount("1,234.56"), "1234.56");
  assert.equal(normalizeDecimalAmount("1.234,56"), "1234.56");
  assert.equal(normalizeDecimalAmount("(12.30)"), "-12.30");
  assert.equal(decimalToMinorUnits("1234.56", "USD"), "123456");
  assert.equal(decimalToMinorUnits("1234", "JPY"), "1234");
  assert.equal(decimalToMinorUnits("12.34", "JPY"), null);
});

test("verification rejects missing or malformed critical fields", () => {
  const warnings = validateReceiptFieldsForVerification({
    merchant: "",
    purchaseDate: "03/04/2026",
    currency: "$",
    subtotal: "",
    tax: "",
    tip: "",
    total: "abc",
    paymentMethod: "",
    paymentLast4: "123",
  });

  assert.deepEqual(
    new Set(warnings.map((warning) => warning.code)),
    new Set([
      "MERCHANT_REQUIRED",
      "DATE_INVALID",
      "CURRENCY_INVALID",
      "TOTAL_INVALID",
      "LAST4_INVALID",
    ]),
  );
});
