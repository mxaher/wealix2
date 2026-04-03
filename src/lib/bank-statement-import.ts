import 'server-only';

import type {
  StatementAccountType,
  StatementClassificationSource,
  StatementDirection,
  StatementImportPreview,
  StatementImportRow,
  StatementImportStatus,
  StatementRawData,
} from '@/lib/bank-statement-types';
import type { ExpenseCategory, IncomeSource } from '@/store/useAppStore';
import { ensurePdfJsNodePolyfills } from '@/lib/pdfjs-node-polyfills';

const MAX_STATEMENT_FILE_SIZE = 5 * 1024 * 1024;
const MAX_STATEMENT_ROWS = 2000;
const MAX_TEXT_FIELD_LENGTH = 180;
const MAX_PDF_PAGES = 20;
const MAX_PDF_TEXT_LENGTH = 200_000;
const MAX_PDF_LINE_COUNT = 2500;
const ACCEPTED_STATEMENT_TYPES = new Set([
  'text/csv',
  'application/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/pdf',
]);
const DEFAULT_CURRENCY = 'SAR';

type ParsedStatementSource = {
  rows: Record<string, unknown>[];
  sourceFormat: 'csv' | 'xlsx' | 'pdf';
};

type PdfTextItem = {
  str?: string;
  transform?: number[];
};

const PDFJS_IMPORT_WARNING_PATTERNS = [
  'Warning: Cannot polyfill `Path2D`, rendering may be broken.',
  'Warning: Cannot load "@napi-rs/canvas" package:',
];

function hasZipSignature(bytes: Uint8Array) {
  return bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
}

function hasPdfSignature(bytes: Uint8Array) {
  return (
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  );
}

function normalizeEasternArabicDigits(value: string) {
  return value.replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));
}

function normalizeHeader(value: string) {
  return normalizeEasternArabicDigits(value)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function sanitizeText(value: string) {
  const cleaned = value
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned.slice(0, MAX_TEXT_FIELD_LENGTH);
}

function sanitizeRawValue(value: unknown): string | number | boolean | null {
  if (typeof value === 'string') {
    return sanitizeText(value);
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value.toISOString();
  }

  if (value === null || typeof value === 'undefined') {
    return null;
  }

  return sanitizeText(String(value));
}

function buildRawStatementData(row: Record<string, unknown>): StatementRawData {
  const output: StatementRawData = {};

  for (const [key, value] of Object.entries(row)) {
    output[sanitizeText(key) || key] = sanitizeRawValue(value);
  }

  return output;
}

function assertStatementFile(file: File, bytes: Uint8Array) {
  if (file.size > MAX_STATEMENT_FILE_SIZE) {
    throw new Error('Statement file exceeds the 5MB upload limit.');
  }

  const isCsv = /\.csv$/i.test(file.name) || file.type === 'text/csv' || file.type === 'application/csv';
  const isXlsx = /\.xlsx$/i.test(file.name) || file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  const isPdf = /\.pdf$/i.test(file.name) || file.type === 'application/pdf';

  if (!ACCEPTED_STATEMENT_TYPES.has(file.type) && !isCsv && !isXlsx && !isPdf) {
    throw new Error('Only CSV, XLSX, and PDF bank statement files are supported.');
  }

  if (isXlsx && !hasZipSignature(bytes)) {
    throw new Error('The uploaded spreadsheet does not match a valid XLSX file signature.');
  }

  if (isPdf && !hasPdfSignature(bytes)) {
    throw new Error('The uploaded PDF does not match a valid PDF file signature.');
  }
}

function splitCsvRow(line: string, delimiter: string) {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        index += 1;
        continue;
      }

      inQuotes = !inQuotes;
      continue;
    }

    if (char === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function detectCsvDelimiter(headerLine: string) {
  const commaCount = (headerLine.match(/,/g) || []).length;
  const semicolonCount = (headerLine.match(/;/g) || []).length;
  return semicolonCount > commaCount ? ';' : ',';
}

async function parseCsvRows(bytes: Uint8Array) {
  const text = new TextDecoder().decode(bytes);
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error('The statement CSV file does not contain enough rows to import.');
  }

  const delimiter = detectCsvDelimiter(lines[0]);
  const headers = splitCsvRow(lines[0], delimiter);

  if (headers.length < 3) {
    throw new Error('The statement CSV file does not contain the required columns.');
  }

  const rows = lines.slice(1, MAX_STATEMENT_ROWS + 1).map((line) => {
    const values = splitCsvRow(line, delimiter);
    const row: Record<string, unknown> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? '';
    });
    return row;
  });

  if (lines.length - 1 > MAX_STATEMENT_ROWS) {
    throw new Error(`Statement file contains more than ${MAX_STATEMENT_ROWS} rows.`);
  }

  return rows;
}

async function parseXlsxRows(buffer: ArrayBuffer, fileName: string) {
  if (/\.xlsm$/i.test(fileName)) {
    throw new Error('This spreadsheet contains macros and cannot be imported.');
  }

  const { Workbook } = await import('exceljs');
  const workbook = new Workbook();
  await workbook.xlsx.load(buffer);

  const sheet = workbook.worksheets[0];
  if (!sheet) {
    throw new Error('The spreadsheet file contains no data.');
  }

  if (sheet.rowCount > MAX_STATEMENT_ROWS + 1) {
    throw new Error(`Statement file contains more than ${MAX_STATEMENT_ROWS} rows.`);
  }

  let sheetHasFormulas = false;
  sheet.eachRow((row) => {
    row.eachCell((cell) => {
      if (typeof cell.value === 'object' && cell.value !== null && 'formula' in cell.value) {
        sheetHasFormulas = true;
      }
    });
  });

  if (sheetHasFormulas) {
    throw new Error('Remove spreadsheet formulas before importing this statement.');
  }

  const headerRow = sheet.getRow(1);
  const headerValues = (headerRow.values as Array<string | undefined | null>).slice(1);

  return sheet.getRows(2, sheet.rowCount - 1)?.map((row) => {
    const output: Record<string, unknown> = {};
    headerValues.forEach((header, index) => {
      if (!header) {
        return;
      }

      const cellValue = row.getCell(index + 1).value;
      output[String(header)] =
        typeof cellValue === 'object' && cellValue !== null && 'result' in cellValue
          ? (cellValue as { result: unknown }).result ?? ''
          : cellValue ?? '';
    });
    return output;
  }).filter(Boolean) ?? [];
}

function groupPdfItemsIntoLines(items: PdfTextItem[]) {
  const lines = new Map<string, Array<{ text: string; x: number }>>();

  for (const item of items) {
    const text = normalizeWhitespace(String(item.str ?? ''));
    const transform = Array.isArray(item.transform) ? item.transform : [];
    const x = Number(transform[4] ?? 0);
    const y = Number(transform[5] ?? 0);

    if (!text) {
      continue;
    }

    const lineKey = String(Math.round(y));
    const existing = lines.get(lineKey) ?? [];
    existing.push({ text, x });
    lines.set(lineKey, existing);
  }

  return Array.from(lines.entries())
    .sort((left, right) => Number(right[0]) - Number(left[0]))
    .map(([, lineItems]) => lineItems.sort((left, right) => left.x - right.x));
}

function parsePdfDateCandidate(value: string) {
  const match = value.match(/(\d{4}[\/.\-]\d{1,2}[\/.\-]\d{1,2}|\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4})/);
  return match?.[0] ?? '';
}

function findFirstAmountToken(values: string[]) {
  return values.find((value) => /-?\(?[\d.,]+(?:\)?)$/.test(value.trim())) ?? '';
}

function isPdfNoiseLine(line: string) {
  const normalized = normalizeHeader(line);

  return (
    !normalized ||
    normalized.startsWith('page') ||
    normalized.includes('statementperiod') ||
    normalized.includes('openingbalance') ||
    normalized.includes('closingbalance') ||
    normalized.includes('availablebalance') ||
    normalized.includes('accountnumber') ||
    normalized.includes('cardnumber')
  );
}

function mapPdfLineToRow(lineItems: Array<{ text: string; x: number }>) {
  const joinedLine = normalizeWhitespace(lineItems.map((item) => item.text).join(' '));
  if (isPdfNoiseLine(joinedLine)) {
    return null;
  }

  const dateToken = parsePdfDateCandidate(joinedLine);
  if (!dateToken) {
    return null;
  }

  const amountCandidates = lineItems
    .map((item) => item.text)
    .filter((text) => /-?\(?[\d.,]+(?:\)?)$/.test(text.trim()));
  const amountToken = amountCandidates.at(-2) ?? amountCandidates.at(-1) ?? findFirstAmountToken(joinedLine.split(' '));

  if (!amountToken) {
    return null;
  }

  const dateIndex = joinedLine.indexOf(dateToken);
  const amountIndex = joinedLine.lastIndexOf(amountToken);
  const between = joinedLine.slice(dateIndex + dateToken.length, amountIndex > -1 ? amountIndex : undefined);
  const description = sanitizeText(between || joinedLine.replace(dateToken, '').replace(amountToken, ''));

  if (!description) {
    return null;
  }

  return {
    Date: dateToken,
    Description: description,
    Amount: amountToken,
  } satisfies Record<string, unknown>;
}

async function parsePdfRows(bytes: Uint8Array) {
  ensurePdfJsNodePolyfills();
  const originalConsoleWarn = console.warn;
  let pdfjs: typeof import('pdfjs-dist/legacy/build/pdf.mjs');

  try {
    console.warn = (...args: unknown[]) => {
      const message = args.map((value) => String(value)).join(' ');
      if (PDFJS_IMPORT_WARNING_PATTERNS.some((pattern) => message.includes(pattern))) {
        return;
      }

      originalConsoleWarn(...args);
    };

    pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  } finally {
    console.warn = originalConsoleWarn;
  }

  const loadingTask = pdfjs.getDocument({
    data: Uint8Array.from(bytes),
    isEvalSupported: false,
    useWorkerFetch: false,
    useSystemFonts: false,
    stopAtErrors: true,
    enableXfa: false,
    isOffscreenCanvasSupported: false,
    verbosity: 0,
  });

  try {
    const document = await loadingTask.promise;

    if (document.numPages > MAX_PDF_PAGES) {
      throw new Error(`PDF statements are limited to ${MAX_PDF_PAGES} pages.`);
    }

    const rows: Record<string, unknown>[] = [];
    let totalTextLength = 0;

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const items = Array.isArray(textContent.items) ? (textContent.items as PdfTextItem[]) : [];
      const pageText = items.map((item) => String(item.str ?? '')).join(' ');
      totalTextLength += pageText.length;

      if (totalTextLength > MAX_PDF_TEXT_LENGTH) {
        throw new Error('PDF statement contains too much text to import safely.');
      }

      for (const line of groupPdfItemsIntoLines(items)) {
        if (rows.length >= MAX_PDF_LINE_COUNT) {
          throw new Error('PDF statement contains too many text lines to import safely.');
        }

        const row = mapPdfLineToRow(line);
        if (row) {
          rows.push(row);
        }
      }
    }

    await loadingTask.destroy();

    if (rows.length === 0) {
      throw new Error('This PDF does not appear to contain extractable statement rows. Try a CSV/XLSX export or a text-based PDF.');
    }

    return rows.slice(0, MAX_STATEMENT_ROWS);
  } catch (error) {
    await loadingTask.destroy();
    if (error instanceof Error && /password/i.test(error.message)) {
      throw new Error('Password-protected PDF statements are not supported.');
    }

    throw error;
  }
}

async function parseStatementRows(file: File, bytes: Uint8Array, buffer: ArrayBuffer): Promise<ParsedStatementSource> {
  const isCsv = /\.csv$/i.test(file.name) || file.type === 'text/csv' || file.type === 'application/csv';
  const isPdf = /\.pdf$/i.test(file.name) || file.type === 'application/pdf';

  if (isCsv) {
    return {
      rows: await parseCsvRows(bytes),
      sourceFormat: 'csv',
    };
  }

  if (isPdf) {
    return {
      rows: await parsePdfRows(bytes),
      sourceFormat: 'pdf',
    };
  }

  return {
    rows: await parseXlsxRows(buffer, file.name),
    sourceFormat: 'xlsx',
  };
}

function getFieldValue(row: Record<string, unknown>, aliases: string[]) {
  const normalizedAliases = new Set(aliases.map(normalizeHeader));
  for (const [key, value] of Object.entries(row)) {
    if (normalizedAliases.has(normalizeHeader(key))) {
      return value;
    }
  }

  return undefined;
}

function parseAmount(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  const normalized = normalizeEasternArabicDigits(String(value ?? ''))
    .replace(/[()]/g, (match) => (match === '(' ? '-' : ''))
    .replace(/[^\d.,-]/g, '')
    .replace(/,(?=\d{3}\b)/g, '')
    .replace(',', '.');

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function excelSerialToDate(serial: number) {
  const utcDays = Math.floor(serial - 25569);
  const utcValue = utcDays * 86400;
  return new Date(utcValue * 1000);
}

function parseDateValue(value: unknown) {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === 'number' && Number.isFinite(value) && value > 20000 && value < 80000) {
    return excelSerialToDate(value).toISOString().slice(0, 10);
  }

  const normalized = normalizeEasternArabicDigits(String(value ?? '')).trim();
  if (!normalized) {
    return '';
  }

  const isoLike = normalized.match(/^(\d{4})[\/.\-](\d{1,2})[\/.\-](\d{1,2})$/);
  if (isoLike) {
    const [, year, month, day] = isoLike;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  const common = normalized.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/);
  if (common) {
    const [, day, month, yearRaw] = common;
    const year = yearRaw.length === 2 ? `20${yearRaw}` : yearRaw;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
}

function formatTypeLabel(value: string) {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function inferExpenseCategory(typeText: string, descriptionText: string): ExpenseCategory {
  const text = `${typeText} ${descriptionText}`.toLowerCase();

  if (/(food|restaurant|grocery|market|cafe|coffee|supermarket|مطعم|بقال)/.test(text)) return 'Food';
  if (/(uber|taxi|fuel|petrol|gas|transport|metro|bus|parking|سفر|وقود|نقل)/.test(text)) return 'Transport';
  if (/(utility|electric|water|internet|mobile|telecom|فاتورة|كهرباء|ماء|انترنت)/.test(text)) return 'Utilities';
  if (/(movie|cinema|game|entertain|netflix|spotify|fun|ترفيه)/.test(text)) return 'Entertainment';
  if (/(hospital|clinic|medical|health|pharmacy|insurance|صحة|صيدلية)/.test(text)) return 'Healthcare';
  if (/(school|course|training|tuition|education|جامعة|تعليم)/.test(text)) return 'Education';
  if (/(mall|amazon|noon|shopping|retail|store|متجر|تسوق)/.test(text)) return 'Shopping';
  if (/(rent|lease|housing|mortgage|apartment|villa|سكن|إيجار|عقار)/.test(text)) return 'Housing';

  return 'Other';
}

function inferIncomeSource(typeText: string, descriptionText: string): IncomeSource {
  const text = `${typeText} ${descriptionText}`.toLowerCase();

  if (/(salary|payroll|wage|راتب)/.test(text)) return 'salary';
  if (/(freelance|contract|consult|client|عمل حر)/.test(text)) return 'freelance';
  if (/(business|merchant settlement|sales|invoice|business income|مبيعات)/.test(text)) return 'business';
  if (/(dividend|interest|investment|coupon|cashback|rebate|استثمار|أرباح)/.test(text)) return 'investment';
  if (/(rent|rental|lease|tenant|إيجار)/.test(text)) return 'rental';

  return 'other';
}

function inferMerchantName(description: string) {
  const cleaned = description.split(/[|/\\-]/)[0]?.trim() ?? '';
  if (!cleaned) {
    return null;
  }

  return sanitizeText(cleaned.slice(0, 80));
}

function looksLikeInternalTransfer(descriptionText: string) {
  return /(payment received|card payment|payment thank you|auto[-\s]?pay|internal transfer|own account|balance transfer|سداد|تحويل داخلي)/i.test(descriptionText);
}

function buildTransactionFingerprint({
  date,
  amount,
  currency,
  direction,
  description,
  reference,
}: {
  date: string;
  amount: number;
  currency: string;
  direction: StatementDirection | null;
  description: string;
  reference: string | null;
}) {
  const normalizedDescription = normalizeHeader(description).slice(0, 120);
  const normalizedReference = normalizeHeader(reference ?? '').slice(0, 80);

  return [
    date,
    amount.toFixed(2),
    currency.toUpperCase(),
    direction ?? 'review',
    normalizedDescription,
    normalizedReference,
  ].join('|');
}

function buildStatementRowNotes(parts: Array<string | null | undefined>) {
  const values = parts
    .map((part) => sanitizeText(String(part ?? '')))
    .filter(Boolean);

  return values.length > 0 ? values.join(' • ') : null;
}

function classifyTransactionDirection({
  amount,
  debit,
  credit,
  description,
  typeText,
}: {
  amount: number;
  debit: number;
  credit: number;
  description: string;
  typeText: string;
}): {
  direction: StatementDirection | null;
  classificationSource: StatementClassificationSource | null;
  importStatus: StatementImportStatus;
  reviewReason: string | null;
} {
  const context = `${description} ${typeText}`.toLowerCase();

  if (looksLikeInternalTransfer(context)) {
    return {
      direction: null,
      classificationSource: null,
      importStatus: 'needs_review',
      reviewReason: 'Internal transfer or card payment detected. Review before importing.',
    };
  }

  if (credit > 0 && debit <= 0) {
    return {
      direction: 'income',
      classificationSource: 'credit',
      importStatus: 'ready',
      reviewReason: null,
    };
  }

  if (debit > 0 && credit <= 0) {
    return {
      direction: 'expense',
      classificationSource: 'debit',
      importStatus: 'ready',
      reviewReason: null,
    };
  }

  if (debit > 0 && credit > 0) {
    return {
      direction: null,
      classificationSource: null,
      importStatus: 'needs_review',
      reviewReason: 'Both debit and credit values were found in the same row.',
    };
  }

  if (amount > 0) {
    return {
      direction: 'income',
      classificationSource: 'signed_amount',
      importStatus: 'needs_review',
      reviewReason: 'Direction was inferred from a positive signed amount because debit/credit columns were missing.',
    };
  }

  if (amount < 0) {
    return {
      direction: 'expense',
      classificationSource: 'signed_amount',
      importStatus: 'needs_review',
      reviewReason: 'Direction was inferred from a negative signed amount because debit/credit columns were missing.',
    };
  }

  return {
    direction: null,
    classificationSource: null,
    importStatus: 'needs_review',
    reviewReason: 'No valid debit or credit amount was found.',
  };
}

function validateStatementColumns(rows: Record<string, unknown>[]) {
  const headerKeys = rows[0] ? Object.keys(rows[0]) : [];
  const normalizedHeaders = new Set(headerKeys.map(normalizeHeader));

  const hasDate = ['date', 'transactiondate', 'postingdate', 'valuedate', 'bookeddate'].some((key) => normalizedHeaders.has(key));
  const hasDescription = ['description', 'details', 'transactiondescription', 'narration', 'memo', 'merchant', 'reference'].some((key) => normalizedHeaders.has(key));
  const hasAmount = ['amount', 'transactionamount', 'amt', 'value', 'netamount', 'total'].some((key) => normalizedHeaders.has(key));
  const hasDebitCredit =
    ['debit', 'withdrawal', 'outflow', 'moneyout', 'dr', 'debitamount'].some((key) => normalizedHeaders.has(key)) &&
    ['credit', 'deposit', 'inflow', 'moneyin', 'cr', 'creditamount'].some((key) => normalizedHeaders.has(key));

  if (!hasDate || !hasDescription || (!hasAmount && !hasDebitCredit)) {
    throw new Error('The statement must include date, description, and either amount or debit/credit columns.');
  }
}

export async function buildStatementImportPreview(file: File, accountType: StatementAccountType): Promise<StatementImportPreview> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  assertStatementFile(file, bytes);

  const { rows, sourceFormat } = await parseStatementRows(file, bytes, buffer);

  if (rows.length === 0) {
    throw new Error('No statement rows were found in the uploaded file.');
  }

  validateStatementColumns(rows);

  let skippedRows = 0;
  let readyCount = 0;
  let needsReviewCount = 0;
  let duplicateCount = 0;
  let incomeCount = 0;
  let expenseCount = 0;
  let incomeTotal = 0;
  let expenseTotal = 0;
  const seenFingerprints = new Set<string>();

  const previewRows = rows.flatMap((row, index): StatementImportRow[] => {
    const date = parseDateValue(
      getFieldValue(row, ['Date', 'Transaction Date', 'Posting Date', 'Value Date', 'Booked Date'])
    );
    const description = sanitizeText(String(
      getFieldValue(row, ['Description', 'Details', 'Transaction Description', 'Narration', 'Memo', 'Merchant', 'Reference']) ?? ''
    ));
    const currency = sanitizeText(String(getFieldValue(row, ['Currency', 'Curr', 'CCY']) ?? DEFAULT_CURRENCY).toUpperCase()) || DEFAULT_CURRENCY;
    const rawType = sanitizeText(String(getFieldValue(row, ['Type', 'Category', 'Transaction Type', 'Classification']) ?? ''));
    const reference = sanitizeText(String(
      getFieldValue(row, ['Reference', 'Reference Number', 'Ref', 'Transaction Reference', 'ID', 'Trace Number']) ?? ''
    )) || null;
    const rowNotes = sanitizeText(String(
      getFieldValue(row, ['Notes', 'Note', 'Comment', 'Remarks', 'Additional Details']) ?? ''
    )) || null;
    const amountValue = parseAmount(getFieldValue(row, ['Amount', 'Transaction Amount', 'Amt', 'Value', 'Net Amount', 'Total']));
    const debit = Math.abs(parseAmount(getFieldValue(row, ['Debit', 'Withdrawal', 'Outflow', 'Money Out', 'DR', 'Debit Amount'])));
    const credit = Math.abs(parseAmount(getFieldValue(row, ['Credit', 'Deposit', 'Inflow', 'Money In', 'CR', 'Credit Amount'])));
    const absoluteAmount = debit > 0 || credit > 0 ? Math.max(debit, credit) : Math.abs(amountValue);
    const sourceRowId = `statement-row-${index + 1}`;
    const rawData = buildRawStatementData(row);

    if (!date || !description || absoluteAmount <= 0) {
      skippedRows += 1;
      return [];
    }

    const classification = classifyTransactionDirection({
      amount: amountValue,
      debit,
      credit,
      description,
      typeText: rawType,
    });
    const expenseCategory = inferExpenseCategory(rawType, description);
    const incomeSource = inferIncomeSource(rawType, description);
    const typeLabel = rawType
      ? formatTypeLabel(rawType)
      : classification.direction === 'income'
        ? formatTypeLabel(incomeSource)
        : classification.direction === 'expense'
          ? formatTypeLabel(expenseCategory)
          : formatTypeLabel(accountType === 'credit_card' ? 'card transaction' : 'bank transaction');
    const fingerprint = buildTransactionFingerprint({
      date,
      amount: absoluteAmount,
      currency,
      direction: classification.direction,
      description,
      reference,
    });

    let importStatus = classification.importStatus;
    let reviewReason = classification.reviewReason;

    if (seenFingerprints.has(fingerprint)) {
      importStatus = 'duplicate';
      reviewReason = 'Duplicate row detected inside the uploaded statement.';
    } else {
      seenFingerprints.add(fingerprint);
    }

    if (importStatus === 'ready' && classification.direction === 'income') {
      incomeCount += 1;
      incomeTotal += absoluteAmount;
    } else if (importStatus === 'ready' && classification.direction === 'expense') {
      expenseCount += 1;
      expenseTotal += absoluteAmount;
    }

    if (importStatus === 'ready') {
      readyCount += 1;
    } else if (importStatus === 'duplicate') {
      duplicateCount += 1;
    } else {
      needsReviewCount += 1;
    }

    return [{
      id: sourceRowId,
      sourceRowId,
      date,
      description,
      details: description,
      amount: absoluteAmount,
      currency,
      direction: classification.direction,
      debitAmount: debit > 0 ? debit : null,
      creditAmount: credit > 0 ? credit : null,
      reference,
      typeLabel,
      expenseCategory,
      incomeSource,
      merchantName: inferMerchantName(description),
      notes: buildStatementRowNotes([
        rawType ? `Statement type: ${rawType}` : null,
        rowNotes,
      ]),
      rawData,
      fingerprint,
      classificationSource: classification.classificationSource,
      importStatus,
      reviewReason,
    }] satisfies StatementImportRow[];
  });

  if (previewRows.length === 0) {
    throw new Error('No valid transactions could be extracted from this statement.');
  }

  const dominantCurrency = previewRows[0]?.currency ?? DEFAULT_CURRENCY;

  return {
    rows: previewRows.sort((left, right) => right.date.localeCompare(left.date)),
    skippedRows,
    readyCount,
    needsReviewCount,
    duplicateCount,
    incomeCount,
    expenseCount,
    incomeTotal,
    expenseTotal,
    currency: dominantCurrency,
    sourceFormat,
  };
}
