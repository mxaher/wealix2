import type { ExpenseCategory, IncomeSource } from '@/store/useAppStore';

export type StatementAccountType = 'current' | 'credit_card';
export type StatementDirection = 'income' | 'expense';
export type StatementImportStatus = 'ready' | 'needs_review' | 'duplicate';
export type StatementClassificationSource = 'debit' | 'credit' | 'signed_amount';
export type StatementRawData = Record<string, string | number | boolean | null>;

export type StatementImportRow = {
  id: string;
  sourceRowId: string;
  date: string;
  description: string;
  amount: number;
  currency: string;
  direction: StatementDirection | null;
  debitAmount: number | null;
  creditAmount: number | null;
  reference: string | null;
  details: string;
  typeLabel: string;
  expenseCategory: ExpenseCategory;
  incomeSource: IncomeSource;
  merchantName: string | null;
  notes: string | null;
  rawData: StatementRawData;
  fingerprint: string;
  classificationSource: StatementClassificationSource | null;
  importStatus: StatementImportStatus;
  reviewReason: string | null;
};

export type StatementImportPreview = {
  rows: StatementImportRow[];
  skippedRows: number;
  readyCount: number;
  needsReviewCount: number;
  duplicateCount: number;
  incomeCount: number;
  expenseCount: number;
  incomeTotal: number;
  expenseTotal: number;
  currency: string;
  sourceFormat: 'csv' | 'xlsx' | 'pdf';
};
