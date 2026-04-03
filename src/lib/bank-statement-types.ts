import type { ExpenseCategory, IncomeSource } from '@/store/useAppStore';

export type StatementAccountType = 'current' | 'credit_card';
export type StatementDirection = 'income' | 'expense';

export type StatementImportRow = {
  id: string;
  date: string;
  description: string;
  amount: number;
  currency: string;
  direction: StatementDirection;
  typeLabel: string;
  expenseCategory: ExpenseCategory;
  incomeSource: IncomeSource;
  merchantName: string | null;
  notes: string | null;
};

export type StatementImportPreview = {
  rows: StatementImportRow[];
  skippedRows: number;
  incomeCount: number;
  expenseCount: number;
  incomeTotal: number;
  expenseTotal: number;
  currency: string;
  sourceFormat: 'csv' | 'xlsx' | 'pdf';
};
