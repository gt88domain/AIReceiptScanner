import type { LocalReceiptOcrResult, ReceiptOcrLine } from "@/modules/receipt-vision";
import type {
  ReceiptFieldEvidence,
  ReceiptFieldName,
  ReceiptFields,
  ReceiptParseResult,
  ReceiptWarning,
} from "../types";

type OrderedLine = ReceiptOcrLine & { normalized: string };

type DateCandidate = {
  raw: string;
  normalized: string;
  ambiguous: boolean;
  line: OrderedLine;
};

type AmountCandidate = {
  decimal: string;
  line: OrderedLine;
  score: number;
};

const CURRENCY_CODES = [
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
] as const;

const ZERO_DECIMAL_CURRENCIES = new Set(["JPY", "KRW"]);

const MONTHS: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

const EMPTY_FIELDS: ReceiptFields = {
  merchant: "",
  purchaseDate: "",
  currency: "",
  subtotal: "",
  tax: "",
  tip: "",
  total: "",
  paymentMethod: "",
  paymentLast4: "",
};

function normalizeLine(line: ReceiptOcrLine): OrderedLine {
  return {
    ...line,
    text: line.text.trim(),
    normalized: line.text.trim().replace(/\s+/g, " "),
  };
}

function orderedLines(result: LocalReceiptOcrResult) {
  return result.lines
    .map(normalizeLine)
    .filter((line) => line.normalized.length > 0)
    .sort((a, b) => {
      const rowDifference = a.bounds.y - b.bounds.y;
      if (Math.abs(rowDifference) > 0.015) return rowDifference;
      return a.bounds.x - b.bounds.x;
    });
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function normalizeYear(value: number) {
  if (value >= 100) return value;
  return value >= 70 ? 1900 + value : 2000 + value;
}

function validDate(year: number, month: number, day: number) {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function isoDate(year: number, month: number, day: number) {
  if (!validDate(year, month, day)) return "";
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function findDates(lines: OrderedLine[]): DateCandidate[] {
  const candidates: DateCandidate[] = [];

  for (const line of lines) {
    const text = line.normalized;

    for (const match of text.matchAll(/\b(20\d{2}|19\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/g)) {
      const normalized = isoDate(Number(match[1]), Number(match[2]), Number(match[3]));
      if (normalized) {
        candidates.push({ raw: match[0], normalized, ambiguous: false, line });
      }
    }

    for (const match of text.matchAll(/\b(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})\b/g)) {
      const first = Number(match[1]);
      const second = Number(match[2]);
      const year = normalizeYear(Number(match[3]));
      if (first > 31 || second > 31) continue;

      let month = first;
      let day = second;
      let ambiguous = false;

      if (first > 12 && second <= 12) {
        day = first;
        month = second;
      } else if (second > 12 && first <= 12) {
        month = first;
        day = second;
      } else if (first <= 12 && second <= 12 && first !== second) {
        ambiguous = true;
      }

      const normalized = isoDate(year, month, day);
      if (normalized) {
        candidates.push({ raw: match[0], normalized, ambiguous, line });
      }
    }

    const monthFirst =
      /\b(January|February|March|April|May|June|July|August|September|Sept|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})(?:st|nd|rd|th)?[,]?\s+(\d{2,4})\b/i.exec(
        text,
      );
    if (monthFirst) {
      const month = MONTHS[monthFirst[1].toLowerCase()];
      const normalized = isoDate(
        normalizeYear(Number(monthFirst[3])),
        month,
        Number(monthFirst[2]),
      );
      if (normalized) {
        candidates.push({ raw: monthFirst[0], normalized, ambiguous: false, line });
      }
    }

    const dayFirst =
      /\b(\d{1,2})(?:st|nd|rd|th)?\s+(January|February|March|April|May|June|July|August|September|Sept|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[,]?\s+(\d{2,4})\b/i.exec(
        text,
      );
    if (dayFirst) {
      const month = MONTHS[dayFirst[2].toLowerCase()];
      const normalized = isoDate(
        normalizeYear(Number(dayFirst[3])),
        month,
        Number(dayFirst[1]),
      );
      if (normalized) {
        candidates.push({ raw: dayFirst[0], normalized, ambiguous: false, line });
      }
    }
  }

  return candidates;
}

function detectCurrency(lines: OrderedLine[]) {
  for (const line of lines) {
    const upper = line.normalized.toUpperCase();
    const code = CURRENCY_CODES.find((candidate) =>
      new RegExp(`\\b${candidate}\\b`).test(upper),
    );
    if (code) return { currency: code, line, ambiguous: false };
  }

  const symbolRules: Array<[RegExp, string]> = [
    [/US\$/i, "USD"],
    [/S\$/i, "SGD"],
    [/CA\$/i, "CAD"],
    [/A\$/i, "AUD"],
    [/HK\$/i, "HKD"],
    [/€/u, "EUR"],
    [/£/u, "GBP"],
  ];

  for (const line of lines) {
    for (const [pattern, currency] of symbolRules) {
      if (pattern.test(line.normalized)) return { currency, line, ambiguous: false };
    }
  }

  const genericDollar = lines.find((line) => /\$/.test(line.normalized));
  if (genericDollar) return { currency: "", line: genericDollar, ambiguous: true };

  const genericYen = lines.find((line) => /[¥￥]/u.test(line.normalized));
  if (genericYen) return { currency: "", line: genericYen, ambiguous: true };

  return null;
}

function cleanNumberToken(raw: string) {
  return raw
    .replace(/[A-Za-z$€£¥￥₹₩]/gu, "")
    .replace(/\s+/g, "")
    .trim();
}

export function normalizeDecimalAmount(raw: string): string | null {
  let value = cleanNumberToken(raw);
  if (!value) return null;

  let negative = false;
  if (value.startsWith("(") && value.endsWith(")")) {
    negative = true;
    value = value.slice(1, -1);
  }
  if (value.startsWith("-")) {
    negative = true;
    value = value.slice(1);
  }

  if (!/^\d[\d.,]*$/.test(value)) return null;

  const lastDot = value.lastIndexOf(".");
  const lastComma = value.lastIndexOf(",");
  let decimalSeparator = "";

  if (lastDot >= 0 && lastComma >= 0) {
    decimalSeparator = lastDot > lastComma ? "." : ",";
  } else if (lastDot >= 0) {
    const digitsAfter = value.length - lastDot - 1;
    decimalSeparator = digitsAfter === 1 || digitsAfter === 2 ? "." : "";
  } else if (lastComma >= 0) {
    const digitsAfter = value.length - lastComma - 1;
    decimalSeparator = digitsAfter === 1 || digitsAfter === 2 ? "," : "";
  }

  let integerPart = value;
  let fractionPart = "";

  if (decimalSeparator) {
    const separatorIndex = value.lastIndexOf(decimalSeparator);
    integerPart = value.slice(0, separatorIndex);
    fractionPart = value.slice(separatorIndex + 1);
  }

  integerPart = integerPart.replace(/[.,]/g, "");
  if (!/^\d+$/.test(integerPart) || (fractionPart && !/^\d+$/.test(fractionPart))) {
    return null;
  }

  integerPart = integerPart.replace(/^0+(?=\d)/, "") || "0";
  const normalized = fractionPart ? `${integerPart}.${fractionPart}` : integerPart;
  return negative ? `-${normalized}` : normalized;
}

export function decimalToMinorUnits(decimal: string, currency: string): string | null {
  if (!/^-?\d+(?:\.\d+)?$/.test(decimal)) return null;
  if (!currency) return null;

  const exponent = ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase()) ? 0 : 2;
  const negative = decimal.startsWith("-");
  const unsigned = negative ? decimal.slice(1) : decimal;
  const [integerPart, fractionPart = ""] = unsigned.split(".");

  if (exponent === 0) {
    if (fractionPart && Number(fractionPart) !== 0) return null;
    const value = BigInt(integerPart || "0");
    return (negative ? -value : value).toString();
  }

  if (fractionPart.length > exponent) return null;
  const fraction = fractionPart.padEnd(exponent, "0");
  const units = BigInt(integerPart || "0") * BigInt(10 ** exponent) + BigInt(fraction || "0");
  return (negative ? -units : units).toString();
}

function amountsFromLine(line: OrderedLine) {
  const matches =
    line.normalized.match(
      /(?:US\$|S\$|CA\$|A\$|HK\$|[$€£¥￥])?\s*\(?-?\d[\d.,]*(?:\s?\d{3})*\)?/gu,
    ) ?? [];

  return matches
    .map((raw) => ({ raw: raw.trim(), decimal: normalizeDecimalAmount(raw) }))
    .filter((candidate): candidate is { raw: string; decimal: string } => Boolean(candidate.decimal));
}

function lastAmount(line: OrderedLine) {
  return amountsFromLine(line).at(-1)?.decimal ?? "";
}

function amountCandidates(
  lines: OrderedLine[],
  scoreLine: (normalizedUpper: string) => number,
) {
  const candidates: AmountCandidate[] = [];

  for (const line of lines) {
    const score = scoreLine(line.normalized.toUpperCase());
    if (score <= 0) continue;
    const decimal = lastAmount(line);
    if (!decimal) continue;
    candidates.push({ decimal, line, score });
  }

  return candidates.sort((a, b) => b.score - a.score || a.line.bounds.y - b.line.bounds.y);
}

function merchantCandidate(lines: OrderedLine[]) {
  const excluded =
    /\b(RECEIPT|INVOICE|ORDER|DATE|TIME|TEL|PHONE|GST|VAT|TAX|TOTAL|SUBTOTAL|CHANGE|CASH|VISA|MASTERCARD|AMEX|THANK|WELCOME)\b/i;

  const scored = lines
    .filter((line) => line.bounds.y <= 0.42)
    .filter((line) => /[A-Za-z\p{L}]/u.test(line.normalized))
    .filter((line) => !excluded.test(line.normalized))
    .filter((line) => !/^\s*[\d\W]+\s*$/u.test(line.normalized))
    .map((line) => {
      const confidence = line.confidence ?? 0.5;
      const positionScore = Math.max(0, 1 - line.bounds.y) * 60;
      const confidenceScore = confidence * 25;
      const lengthScore = line.normalized.length >= 3 && line.normalized.length <= 48 ? 15 : 0;
      return { line, score: positionScore + confidenceScore + lengthScore };
    })
    .sort((a, b) => b.score - a.score);

  return scored[0]?.line ?? null;
}

function paymentCandidate(lines: OrderedLine[]) {
  for (const line of lines) {
    const upper = line.normalized.toUpperCase();
    const method =
      /APPLE\s*PAY/.test(upper)
        ? "Apple Pay"
        : /GOOGLE\s*PAY/.test(upper)
          ? "Google Pay"
          : /PAYPAL/.test(upper)
            ? "PayPal"
            : /AMEX|AMERICAN EXPRESS/.test(upper)
              ? "Amex"
              : /MASTERCARD|MASTER CARD/.test(upper)
                ? "Mastercard"
                : /\bVISA\b/.test(upper)
                  ? "Visa"
                  : /\bCASH\b/.test(upper)
                    ? "Cash"
                    : "";

    if (!method) continue;
    const last4 =
      /(?:ENDING|END|X{4}|\*{4})\s*[:#-]?\s*(\d{4})\b/i.exec(line.normalized)?.[1] ?? "";
    return { method, last4, line };
  }

  return null;
}

function setEvidence(
  evidence: ReceiptFieldEvidence,
  field: ReceiptFieldName,
  line: OrderedLine | null | undefined,
) {
  if (!line) return;
  evidence[field] = { sourceText: line.normalized, confidence: line.confidence };
}

function addLowConfidenceWarning(
  warnings: ReceiptWarning[],
  field: ReceiptFieldName,
  line: OrderedLine | null | undefined,
) {
  if (line?.confidence != null && line.confidence < 0.45) {
    warnings.push({
      code: "LOW_OCR_CONFIDENCE",
      field,
      message: `${field} came from a low-confidence OCR line and needs review.`,
    });
  }
}

export function parseLocalReceipt(result: LocalReceiptOcrResult): ReceiptParseResult {
  const lines = orderedLines(result);
  const fields: ReceiptFields = { ...EMPTY_FIELDS };
  const warnings: ReceiptWarning[] = [];
  const evidence: ReceiptFieldEvidence = {};

  if (!result.fullText.trim() || lines.length === 0) {
    return {
      quality: "LOCAL_FAIL",
      fields,
      evidence,
      warnings: [
        {
          code: "EMPTY_OCR",
          message: "Apple Vision returned no usable receipt text.",
        },
      ],
    };
  }

  const merchant = merchantCandidate(lines);
  if (merchant) {
    fields.merchant = merchant.normalized;
    setEvidence(evidence, "merchant", merchant);
    addLowConfidenceWarning(warnings, "merchant", merchant);
  } else {
    warnings.push({
      code: "MERCHANT_MISSING",
      field: "merchant",
      message: "Merchant could not be identified.",
    });
  }

  const dates = findDates(lines);
  const preferredDate = dates.find((candidate) => !candidate.ambiguous) ?? dates[0];
  if (preferredDate) {
    setEvidence(evidence, "purchaseDate", preferredDate.line);
    if (preferredDate.ambiguous) {
      warnings.push({
        code: "DATE_AMBIGUOUS",
        field: "purchaseDate",
        message: `Date "${preferredDate.raw}" is ambiguous and needs review.`,
      });
    } else {
      fields.purchaseDate = preferredDate.normalized;
    }
    addLowConfidenceWarning(warnings, "purchaseDate", preferredDate.line);
  } else {
    warnings.push({
      code: "DATE_MISSING",
      field: "purchaseDate",
      message: "Purchase date could not be identified.",
    });
  }

  const currency = detectCurrency(lines);
  if (currency) {
    setEvidence(evidence, "currency", currency.line);
    if (currency.ambiguous) {
      warnings.push({
        code: "CURRENCY_AMBIGUOUS",
        field: "currency",
        message: "A currency symbol was found but the currency is ambiguous.",
      });
    } else {
      fields.currency = currency.currency;
    }
    addLowConfidenceWarning(warnings, "currency", currency.line);
  } else {
    warnings.push({
      code: "CURRENCY_MISSING",
      field: "currency",
      message: "Currency could not be identified.",
    });
  }

  const subtotalCandidates = amountCandidates(lines, (upper) =>
    /\bSUB\s*TOTAL\b|\bSUBTOTAL\b/.test(upper) ? 100 : 0,
  );
  const taxCandidates = amountCandidates(lines, (upper) =>
    /\b(?:TAX|VAT|GST)\b/.test(upper) && !/\bTAX\s*(?:ID|NO|NUMBER)\b/.test(upper)
      ? 80
      : 0,
  );
  const tipCandidates = amountCandidates(lines, (upper) =>
    /\b(?:TIP|GRATUITY)\b/.test(upper) ? 90 : 0,
  );
  const totalCandidates = amountCandidates(lines, (upper) => {
    if (/\bSUB\s*TOTAL\b|\bSUBTOTAL\b/.test(upper)) return 0;
    if (/\b(?:CHANGE|TENDERED|CASH PAID)\b/.test(upper)) return 0;
    if (/\bGRAND\s+TOTAL\b/.test(upper)) return 120;
    if (/\bAMOUNT\s+DUE\b|\bBALANCE\s+DUE\b/.test(upper)) return 115;
    if (/^\s*TOTAL\b|\bTOTAL\s*[:=]/.test(upper)) return 105;
    if (/\bTOTAL\b/.test(upper)) return 80;
    return 0;
  });

  const assignments: Array<
    [ReceiptFieldName, AmountCandidate | undefined]
  > = [
    ["subtotal", subtotalCandidates[0]],
    ["tax", taxCandidates[0]],
    ["tip", tipCandidates[0]],
    ["total", totalCandidates[0]],
  ];

  for (const [field, candidate] of assignments) {
    if (!candidate) continue;
    fields[field] = candidate.decimal;
    setEvidence(evidence, field, candidate.line);
    addLowConfidenceWarning(warnings, field, candidate.line);
  }

  if (!fields.total) {
    warnings.push({
      code: "TOTAL_MISSING",
      field: "total",
      message: "Total could not be identified.",
    });
  } else {
    const conflictingTotal = totalCandidates.find(
      (candidate) => candidate.decimal !== fields.total && candidate.score >= 100,
    );
    if (conflictingTotal) {
      warnings.push({
        code: "TOTAL_CONFLICT",
        field: "total",
        message: "More than one strong total candidate was found.",
      });
    }
  }

  const payment = paymentCandidate(lines);
  if (payment) {
    fields.paymentMethod = payment.method;
    fields.paymentLast4 = payment.last4;
    setEvidence(evidence, "paymentMethod", payment.line);
    if (payment.last4) setEvidence(evidence, "paymentLast4", payment.line);
  }

  const missingCritical = [
    fields.merchant,
    fields.purchaseDate,
    fields.currency,
    fields.total,
  ].filter((value) => !value).length;

  const quality =
    !fields.total || missingCritical >= 2
      ? "LOCAL_FAIL"
      : warnings.length > 0 || missingCritical > 0
        ? "LOCAL_REVIEW"
        : "LOCAL_PASS";

  return { quality, fields, warnings, evidence };
}


export function validateReceiptFieldsForVerification(
  fields: ReceiptFields,
): ReceiptWarning[] {
  const warnings: ReceiptWarning[] = [];

  if (!fields.merchant.trim()) {
    warnings.push({
      code: "MERCHANT_REQUIRED",
      field: "merchant",
      message: "Merchant is required before confirming this receipt.",
    });
  }

  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fields.purchaseDate.trim());
  if (
    !dateMatch ||
    !validDate(Number(dateMatch[1]), Number(dateMatch[2]), Number(dateMatch[3]))
  ) {
    warnings.push({
      code: "DATE_INVALID",
      field: "purchaseDate",
      message: "Purchase date must be a valid YYYY-MM-DD date.",
    });
  }

  if (!/^[A-Z]{3}$/.test(fields.currency.trim().toUpperCase())) {
    warnings.push({
      code: "CURRENCY_INVALID",
      field: "currency",
      message: "Currency must be a three-letter code such as USD or SGD.",
    });
  }

  if (!normalizeDecimalAmount(fields.total)) {
    warnings.push({
      code: "TOTAL_INVALID",
      field: "total",
      message: "Total must be a valid amount.",
    });
  }

  for (const field of ["subtotal", "tax", "tip"] as const) {
    if (fields[field] && !normalizeDecimalAmount(fields[field])) {
      warnings.push({
        code: "AMOUNT_INVALID",
        field,
        message: `${field} must be a valid amount or left blank.`,
      });
    }
  }

  if (fields.paymentLast4 && !/^\d{4}$/.test(fields.paymentLast4)) {
    warnings.push({
      code: "LAST4_INVALID",
      field: "paymentLast4",
      message: "Card last 4 must contain exactly four digits or be left blank.",
    });
  }

  return warnings;
}
