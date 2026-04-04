import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useUser } from '@clerk/nextjs';
import { getBillingState } from '@/lib/billing-state';

const APP_STORAGE_KEY = 'wealix-storage-v4';
const LEGACY_STORAGE_KEYS = ['wealthos-storage', 'wealix-storage-v3'];

export type Locale = 'ar' | 'en';
export type Theme = 'dark' | 'light' | 'system';
export type SubscriptionTier = 'none' | 'core' | 'pro';
export type AppMode = 'demo' | 'live';
export type IncomeSource = 'salary' | 'freelance' | 'business' | 'investment' | 'rental' | 'other';
export type IncomeFrequency = 'one_time' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
export type PortfolioExchange = 'TASI' | 'EGX' | 'NASDAQ' | 'NYSE' | 'GOLD';
export type AssetCategory = 'cash' | 'investment' | 'real_estate' | 'vehicle' | 'other';
export type LiabilityCategory = 'loan' | 'mortgage' | 'credit_card' | 'other';
export type ExpenseCategory =
  | 'Food'
  | 'Transport'
  | 'Utilities'
  | 'Entertainment'
  | 'Healthcare'
  | 'Education'
  | 'Shopping'
  | 'Housing'
  | 'Other';
export type PaymentMethod = 'Cash' | 'Card' | 'Transfer' | 'Wallet' | 'Other';
export type ImportedRecordSource = 'receipt' | 'statement';

export interface ImportAuditRecord {
  source: ImportedRecordSource;
  sourceRowId?: string | null;
  importedAt: string;
  rawData?: Record<string, string | number | boolean | null> | null;
}

interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  locale: Locale;
  currency: string;
  subscriptionTier: SubscriptionTier;
  onboardingDone: boolean;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  priceAlerts: boolean;
  budgetAlerts: boolean;
  weeklyDigest: boolean;
}

export interface NotificationItem {
  id: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  read: boolean;
  href: string;
}

export interface LocalProfile {
  id: string;
  label: string;
  email: string;
  avatarUrl: string | null;
  appMode: AppMode;
  user: User | null;
  notificationPreferences: NotificationPreferences;
  notificationFeed: NotificationItem[];
  incomeEntries: IncomeEntry[];
  expenseEntries: ExpenseEntry[];
  receiptScans: ReceiptScanResult[];
  portfolioHoldings: PortfolioHolding[];
  portfolioAnalysisHistory: PortfolioAnalysisRecord[];
  investmentDecisionHistory: InvestmentDecisionRecord[];
  assets: AssetEntry[];
  liabilities: LiabilityEntry[];
  budgetLimits: BudgetLimit[];
}

interface AuthenticatedUserPayload {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  subscriptionTier?: SubscriptionTier;
}

export interface IncomeEntry {
  id: string;
  amount: number;
  currency: string;
  source: IncomeSource;
  sourceName: string;
  frequency: IncomeFrequency;
  date: string;
  isRecurring: boolean;
  notes?: string | null;
  importFingerprint?: string | null;
  importAudit?: ImportAuditRecord | null;
}

export interface ExpenseEntry {
  id: string;
  amount: number;
  currency: string;
  category: ExpenseCategory;
  description: string;
  merchantName?: string | null;
  date: string;
  paymentMethod: PaymentMethod;
  notes?: string | null;
  receiptId?: string | null;
  importFingerprint?: string | null;
  importAudit?: ImportAuditRecord | null;
}

export interface ReceiptScanResult {
  id: string;
  merchantName: string;
  amount: number;
  date: string;
  currency: string;
  confidence: number;
  suggestedCategory: ExpenseCategory;
  rawText: string;
  imageName: string;
}

export interface PortfolioHolding {
  id: string;
  ticker: string;
  name: string;
  exchange: PortfolioExchange;
  shares: number;
  avgCost: number;
  currentPrice: number;
  sector: string;
  isShariah: boolean;
}

export interface PortfolioAnalysisAction {
  type: string;
  title: string;
  description: string;
}

export interface PortfolioTradeRecommendation {
  side: 'buy' | 'sell';
  ticker: string;
  name: string;
  exchange: PortfolioExchange;
  shares: number;
  targetPrice: number;
  timing: 'now' | 'next_week';
  note: string;
}

export interface PortfolioTopPerformer {
  asset: string;
  ticker: string;
  weight: number;
  pnlPercent: number;
  reason: string;
}

export interface PortfolioUnderperformer {
  asset: string;
  ticker: string;
  weight: number;
  pnlPercent: number;
  rootCause: string;
  action: string;
}

export interface PortfolioExecutionSummaryRow {
  asset: string;
  ticker: string;
  action: 'buy' | 'sell' | 'hold' | 'watch';
  sharesUnits: string;
  executeWhen: string;
  priceZone: string;
  stopLoss: string;
  priority: 'high' | 'medium' | 'low';
  notes: string;
}

export interface PortfolioHealthDimension {
  dimension: string;
  score: number;
  comment: string;
}

export interface PortfolioAnalysisRecord {
  id: string;
  createdAt: string;
  summary: string;
  actions: PortfolioAnalysisAction[];
  tradePlan: PortfolioTradeRecommendation[];
  marketOutlook?: string;
  keyRisks?: string[];
  riskScore?: number | null;
  topPerformers?: PortfolioTopPerformer[];
  underperformers?: PortfolioUnderperformer[];
  opportunities?: string[];
  executionSummary?: PortfolioExecutionSummaryRow[];
  healthScore?: number | null;
  healthBreakdown?: PortfolioHealthDimension[];
}

export interface InvestmentDecisionDimensionRecord {
  key: string;
  title: string;
  status: 'positive' | 'neutral' | 'warning' | 'negative';
  score: number;
  analysis: string;
}

export interface InvestmentDecisionRecord {
  id: string;
  createdAt: string;
  investmentName: string;
  price: number;
  verdict: 'proceed_now' | 'proceed_with_caution' | 'postpone' | 'do_not_proceed';
  verdictLabel: string;
  summary: string;
  alternativeSuggestion: string;
  suggestedAllocation: {
    amount: number;
    percentOfNetWorth: number;
    percentOfLiquidReserves: number;
  };
  revisitPlan: {
    month: string | null;
    savingsMilestone: number | null;
    monthsToWait: number;
  };
  dimensions: InvestmentDecisionDimensionRecord[];
}

export interface AssetEntry {
  id: string;
  name: string;
  category: AssetCategory;
  value: number;
  currency: string;
}

export interface LiabilityEntry {
  id: string;
  name: string;
  category: LiabilityCategory;
  balance: number;
  currency: string;
}

export interface BudgetLimit {
  category: string;
  limit: number;
  color: string;
}

export interface RemoteWorkspaceSnapshot {
  appMode: AppMode;
  notificationPreferences: NotificationPreferences;
  notificationFeed: NotificationItem[];
  incomeEntries: IncomeEntry[];
  expenseEntries: ExpenseEntry[];
  receiptScans: ReceiptScanResult[];
  portfolioHoldings: PortfolioHolding[];
  portfolioAnalysisHistory: PortfolioAnalysisRecord[];
  investmentDecisionHistory: InvestmentDecisionRecord[];
  assets: AssetEntry[];
  liabilities: LiabilityEntry[];
  budgetLimits: BudgetLimit[];
}

function workspaceFieldsToSnapshot(source: {
  appMode: AppMode;
  notificationPreferences: NotificationPreferences;
  notificationFeed: NotificationItem[];
  incomeEntries: IncomeEntry[];
  expenseEntries: ExpenseEntry[];
  receiptScans: ReceiptScanResult[];
  portfolioHoldings: PortfolioHolding[];
  portfolioAnalysisHistory: PortfolioAnalysisRecord[];
  investmentDecisionHistory: InvestmentDecisionRecord[];
  assets: AssetEntry[];
  liabilities: LiabilityEntry[];
  budgetLimits: BudgetLimit[];
}): RemoteWorkspaceSnapshot {
  return {
    appMode: source.appMode,
    notificationPreferences: source.notificationPreferences,
    notificationFeed: source.notificationFeed,
    incomeEntries: source.incomeEntries,
    expenseEntries: source.expenseEntries,
    receiptScans: source.receiptScans,
    portfolioHoldings: source.portfolioHoldings,
    portfolioAnalysisHistory: source.portfolioAnalysisHistory,
    investmentDecisionHistory: source.investmentDecisionHistory,
    assets: source.assets,
    liabilities: source.liabilities,
    budgetLimits: source.budgetLimits,
  };
}

function normalizeHoldingKey(holding: Pick<PortfolioHolding, 'ticker' | 'exchange'>) {
  const baseTicker = holding.exchange === 'TASI'
    ? holding.ticker.trim().toUpperCase().replace(/\.SR$/i, '')
    : holding.ticker.trim().toUpperCase();

  return `${holding.exchange}:${baseTicker}`;
}

function mergePortfolioHoldingEntries(holdings: PortfolioHolding[]) {
  const merged = new Map<string, PortfolioHolding>();

  for (const holding of holdings) {
    const key = normalizeHoldingKey(holding);
    const existing = merged.get(key);

    if (!existing) {
      merged.set(key, {
        ...holding,
        ticker: holding.ticker.trim().toUpperCase(),
      });
      continue;
    }

    const totalShares = existing.shares + holding.shares;
    const totalCostBasis = (existing.shares * existing.avgCost) + (holding.shares * holding.avgCost);

    merged.set(key, {
      ...existing,
      name: holding.name || existing.name,
      sector: holding.sector || existing.sector,
      isShariah: existing.isShariah && holding.isShariah,
      shares: totalShares,
      avgCost: totalShares > 0 ? totalCostBasis / totalShares : existing.avgCost,
      currentPrice: holding.currentPrice > 0 ? holding.currentPrice : existing.currentPrice,
    });
  }

  return Array.from(merged.values());
}

function coerceFiniteNumber(value: unknown, fallback = 0) {
  const numeric = typeof value === 'number'
    ? value
    : Number(String(value ?? '').replace(/,/g, '').trim());
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeAssetEntries(entries: unknown): AssetEntry[] {
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries.flatMap((entry, index) => {
    if (!entry || typeof entry !== 'object') {
      return [];
    }

    const asset = entry as Record<string, unknown>;
    const value = coerceFiniteNumber(asset.value ?? asset.amount);
    const name = String(asset.name ?? '').trim();
    const category = String(asset.category ?? 'other');

    if (!name || value < 0) {
      return [];
    }

    return [{
      id: String(asset.id ?? `asset-${index + 1}`),
      name,
      category: (['cash', 'investment', 'real_estate', 'vehicle', 'other'].includes(category) ? category : 'other') as AssetCategory,
      value,
      currency: String(asset.currency ?? 'SAR').toUpperCase() || 'SAR',
    }];
  });
}

function normalizePortfolioAnalysisHistory(entries: unknown): PortfolioAnalysisRecord[] {
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') {
      return [];
    }

    const record = entry as Partial<PortfolioAnalysisRecord>;
    if (typeof record.id !== 'string' || typeof record.createdAt !== 'string' || typeof record.summary !== 'string') {
      return [];
    }

    return [{
      id: record.id,
      createdAt: record.createdAt,
      summary: record.summary,
      actions: Array.isArray(record.actions) ? record.actions : [],
      tradePlan: Array.isArray(record.tradePlan) ? record.tradePlan : [],
      marketOutlook: typeof record.marketOutlook === 'string' ? record.marketOutlook : '',
      keyRisks: Array.isArray(record.keyRisks) ? record.keyRisks.filter((risk): risk is string => typeof risk === 'string') : [],
      riskScore: typeof record.riskScore === 'number' ? record.riskScore : null,
      topPerformers: Array.isArray(record.topPerformers) ? record.topPerformers.flatMap((item) => {
        if (!item || typeof item !== 'object') {
          return [];
        }

        const performer = item as Partial<PortfolioTopPerformer>;
        if (
          typeof performer.asset !== 'string' ||
          typeof performer.ticker !== 'string' ||
          typeof performer.weight !== 'number' ||
          typeof performer.pnlPercent !== 'number' ||
          typeof performer.reason !== 'string'
        ) {
          return [];
        }

        return [performer as PortfolioTopPerformer];
      }) : [],
      underperformers: Array.isArray(record.underperformers) ? record.underperformers.flatMap((item) => {
        if (!item || typeof item !== 'object') {
          return [];
        }

        const underperformer = item as Partial<PortfolioUnderperformer>;
        if (
          typeof underperformer.asset !== 'string' ||
          typeof underperformer.ticker !== 'string' ||
          typeof underperformer.weight !== 'number' ||
          typeof underperformer.pnlPercent !== 'number' ||
          typeof underperformer.rootCause !== 'string' ||
          typeof underperformer.action !== 'string'
        ) {
          return [];
        }

        return [underperformer as PortfolioUnderperformer];
      }) : [],
      opportunities: Array.isArray(record.opportunities) ? record.opportunities.filter((item): item is string => typeof item === 'string') : [],
      executionSummary: Array.isArray(record.executionSummary) ? record.executionSummary.flatMap((item) => {
        if (!item || typeof item !== 'object') {
          return [];
        }

        const row = item as Partial<PortfolioExecutionSummaryRow>;
        if (
          typeof row.asset !== 'string' ||
          typeof row.ticker !== 'string' ||
          typeof row.action !== 'string' ||
          typeof row.sharesUnits !== 'string' ||
          typeof row.executeWhen !== 'string' ||
          typeof row.priceZone !== 'string' ||
          typeof row.stopLoss !== 'string' ||
          typeof row.priority !== 'string' ||
          typeof row.notes !== 'string'
        ) {
          return [];
        }

        if (!['buy', 'sell', 'hold', 'watch'].includes(row.action) || !['high', 'medium', 'low'].includes(row.priority)) {
          return [];
        }

        return [row as PortfolioExecutionSummaryRow];
      }) : [],
      healthScore: typeof record.healthScore === 'number' ? record.healthScore : null,
      healthBreakdown: Array.isArray(record.healthBreakdown) ? record.healthBreakdown.flatMap((item) => {
        if (!item || typeof item !== 'object') {
          return [];
        }

        const dimension = item as Partial<PortfolioHealthDimension>;
        if (
          typeof dimension.dimension !== 'string' ||
          typeof dimension.score !== 'number' ||
          typeof dimension.comment !== 'string'
        ) {
          return [];
        }

        return [dimension as PortfolioHealthDimension];
      }) : [],
    }];
  });
}

function normalizeInvestmentDecisionHistory(entries: unknown): InvestmentDecisionRecord[] {
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') {
      return [];
    }

    const record = entry as Partial<InvestmentDecisionRecord>;
    if (
      typeof record.id !== 'string' ||
      typeof record.createdAt !== 'string' ||
      typeof record.investmentName !== 'string' ||
      typeof record.price !== 'number' ||
      typeof record.verdict !== 'string' ||
      typeof record.verdictLabel !== 'string' ||
      typeof record.summary !== 'string' ||
      typeof record.alternativeSuggestion !== 'string'
    ) {
      return [];
    }

    return [{
      id: record.id,
      createdAt: record.createdAt,
      investmentName: record.investmentName,
      price: record.price,
      verdict: record.verdict,
      verdictLabel: record.verdictLabel,
      summary: record.summary,
      alternativeSuggestion: record.alternativeSuggestion,
      suggestedAllocation: {
        amount: coerceFiniteNumber(record.suggestedAllocation?.amount),
        percentOfNetWorth: coerceFiniteNumber(record.suggestedAllocation?.percentOfNetWorth),
        percentOfLiquidReserves: coerceFiniteNumber(record.suggestedAllocation?.percentOfLiquidReserves),
      },
      revisitPlan: {
        month: typeof record.revisitPlan?.month === 'string' ? record.revisitPlan.month : null,
        savingsMilestone: typeof record.revisitPlan?.savingsMilestone === 'number' ? record.revisitPlan.savingsMilestone : null,
        monthsToWait: coerceFiniteNumber(record.revisitPlan?.monthsToWait),
      },
      dimensions: Array.isArray(record.dimensions) ? record.dimensions.flatMap((dimension) => {
        if (!dimension || typeof dimension !== 'object') {
          return [];
        }

        const item = dimension as Partial<InvestmentDecisionDimensionRecord>;
        if (
          typeof item.key !== 'string' ||
          typeof item.title !== 'string' ||
          typeof item.status !== 'string' ||
          typeof item.score !== 'number' ||
          typeof item.analysis !== 'string'
        ) {
          return [];
        }

        return [{
          key: item.key,
          title: item.title,
          status: item.status,
          score: item.score,
          analysis: item.analysis,
        }];
      }) : [],
    }];
  });
}

function normalizeLiabilityEntries(entries: unknown): LiabilityEntry[] {
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries.flatMap((entry, index) => {
    if (!entry || typeof entry !== 'object') {
      return [];
    }

    const liability = entry as Record<string, unknown>;
    const balance = coerceFiniteNumber(liability.balance ?? liability.amount ?? liability.value);
    const name = String(liability.name ?? '').trim();
    const category = String(liability.category ?? 'other');

    if (!name || balance < 0) {
      return [];
    }

    return [{
      id: String(liability.id ?? `liability-${index + 1}`),
      name,
      category: (['loan', 'mortgage', 'credit_card', 'other'].includes(category) ? category : 'other') as LiabilityCategory,
      balance,
      currency: String(liability.currency ?? 'SAR').toUpperCase() || 'SAR',
    }];
  });
}

const defaultUser: User = {
  id: 'demo-user',
  email: 'demo@wealix.app',
  name: 'Demo User',
  avatarUrl: null,
  locale: 'en',
  currency: 'SAR',
  subscriptionTier: 'none',
  onboardingDone: true,
};

const defaultNotificationPreferences: NotificationPreferences = {
  email: true,
  push: true,
  priceAlerts: true,
  budgetAlerts: true,
  weeklyDigest: false,
};

const defaultNotificationFeed: NotificationItem[] = [
  {
    id: 'rebalance',
    title: 'Portfolio review available',
    titleAr: 'مراجعة المحفظة جاهزة',
    description: 'Your portfolio allocation changed this week.',
    descriptionAr: 'توزيع محفظتك تغيّر هذا الأسبوع.',
    read: false,
    href: '/portfolio',
  },
  {
    id: 'budget',
    title: 'Budget alert triggered',
    titleAr: 'تم تفعيل تنبيه الميزانية',
    description: 'Your food budget is close to its monthly cap.',
    descriptionAr: 'ميزانية الطعام اقتربت من حدها الشهري.',
    read: false,
    href: '/settings?tab=preferences',
  },
  {
    id: 'report',
    title: 'Weekly digest is ready',
    titleAr: 'الملخص الأسبوعي جاهز',
    description: 'Open your latest wealth summary.',
    descriptionAr: 'افتح أحدث ملخص لثروتك.',
    read: true,
    href: '/reports',
  },
];

const defaultIncomeEntries: IncomeEntry[] = [
  {
    id: 'income-salary',
    amount: 22000,
    currency: 'SAR',
    source: 'salary',
    sourceName: 'Monthly Salary',
    frequency: 'monthly',
    date: new Date().toISOString().slice(0, 10),
    isRecurring: true,
    notes: null,
  },
  {
    id: 'income-freelance',
    amount: 3500,
    currency: 'SAR',
    source: 'freelance',
    sourceName: 'Consulting Retainer',
    frequency: 'monthly',
    date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    isRecurring: true,
    notes: null,
  },
];

const defaultExpenseEntries: ExpenseEntry[] = [
  {
    id: 'expense-rent',
    amount: 7200,
    currency: 'SAR',
    category: 'Housing',
    description: 'Monthly apartment rent',
    merchantName: 'Riyadh Residence',
    date: new Date().toISOString().slice(0, 10),
    paymentMethod: 'Transfer',
    notes: null,
    receiptId: null,
  },
  {
    id: 'expense-grocery',
    amount: 1850,
    currency: 'SAR',
    category: 'Food',
    description: 'Groceries and pantry',
    merchantName: 'Danube',
    date: new Date().toISOString().slice(0, 10),
    paymentMethod: 'Card',
    notes: null,
    receiptId: null,
  },
  {
    id: 'expense-transport',
    amount: 950,
    currency: 'SAR',
    category: 'Transport',
    description: 'Fuel and ride sharing',
    merchantName: 'Uber + Fuel',
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    paymentMethod: 'Card',
    notes: null,
    receiptId: null,
  },
  {
    id: 'expense-utilities',
    amount: 980,
    currency: 'SAR',
    category: 'Utilities',
    description: 'Electricity, water, and internet',
    merchantName: 'STC / SEC',
    date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    paymentMethod: 'Card',
    notes: null,
    receiptId: null,
  },
  {
    id: 'expense-entertainment',
    amount: 1350,
    currency: 'SAR',
    category: 'Entertainment',
    description: 'Dining out and weekend activities',
    merchantName: 'VOX + Restaurants',
    date: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    paymentMethod: 'Card',
    notes: null,
    receiptId: null,
  },
];

const defaultPortfolioHoldings: PortfolioHolding[] = [
  { id: '1', ticker: '2222.SR', name: 'Saudi Aramco', exchange: 'TASI', shares: 100, avgCost: 32.5, currentPrice: 35.2, sector: 'Energy', isShariah: true },
  { id: '2', ticker: '1120.SR', name: 'Al Rajhi Bank', exchange: 'TASI', shares: 50, avgCost: 98, currentPrice: 105.5, sector: 'Banking', isShariah: true },
  { id: '3', ticker: '1180.SR', name: 'Maaden', exchange: 'TASI', shares: 75, avgCost: 45, currentPrice: 48.2, sector: 'Mining', isShariah: true },
  { id: '4', ticker: 'COMI.CA', name: 'CIB Egypt', exchange: 'EGX', shares: 200, avgCost: 45, currentPrice: 52.3, sector: 'Banking', isShariah: false },
  { id: '5', ticker: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', shares: 25, avgCost: 175, currentPrice: 182.5, sector: 'Technology', isShariah: false },
  { id: '6', ticker: '1050.SR', name: 'SABIC', exchange: 'TASI', shares: 30, avgCost: 85, currentPrice: 92.4, sector: 'Materials', isShariah: true },
  { id: '7', ticker: 'XAUUSD', name: 'Gold', exchange: 'GOLD', shares: 8, avgCost: 2295, currentPrice: 2368, sector: 'Precious Metals', isShariah: true },
];

const defaultAssets: AssetEntry[] = [
  { id: 'asset-1', name: 'Al Rajhi Savings', category: 'cash', value: 98000, currency: 'SAR' },
  { id: 'asset-2', name: 'SNB Current', category: 'cash', value: 28000, currency: 'SAR' },
  { id: 'asset-3', name: 'Investment Portfolio', category: 'investment', value: 340000, currency: 'SAR' },
  { id: 'asset-4', name: 'Apartment - Riyadh', category: 'real_estate', value: 780000, currency: 'SAR' },
  { id: 'asset-5', name: 'Toyota Camry', category: 'vehicle', value: 68000, currency: 'SAR' },
];

const defaultLiabilities: LiabilityEntry[] = [
  { id: 'liability-1', name: 'Mortgage - Riyadh', category: 'mortgage', balance: 470000, currency: 'SAR' },
  { id: 'liability-2', name: 'Car Loan', category: 'loan', balance: 32000, currency: 'SAR' },
  { id: 'liability-3', name: 'Credit Card', category: 'credit_card', balance: 6200, currency: 'SAR' },
];

const defaultBudgetLimits: BudgetLimit[] = [
  { category: 'housing', limit: 7200, color: '#D4A843' },
  { category: 'food', limit: 2200, color: '#10B981' },
  { category: 'transport', limit: 1100, color: '#3B82F6' },
  { category: 'entertainment', limit: 1400, color: '#8B5CF6' },
  { category: 'utilities', limit: 1000, color: '#F59E0B' },
  { category: 'investment', limit: 4000, color: '#06B6D4' },
  { category: 'zakat', limit: 1000, color: '#EC4899' },
  { category: 'other', limit: 1200, color: '#6B7280' },
];

const defaultReceiptScans: ReceiptScanResult[] = [
  {
    id: 'receipt-demo-1',
    merchantName: 'Danube',
    amount: 420,
    date: new Date().toISOString().slice(0, 10),
    currency: 'SAR',
    confidence: 91,
    suggestedCategory: 'Food',
    rawText: 'DANUBE MARKET TOTAL 420 SAR',
    imageName: 'danube-demo-receipt.jpg',
  },
];

function buildDemoState() {
  return {
    appMode: 'demo' as const,
    user: defaultUser,
    notificationFeed: defaultNotificationFeed,
    incomeEntries: defaultIncomeEntries,
    expenseEntries: defaultExpenseEntries,
    receiptScans: defaultReceiptScans,
    portfolioHoldings: defaultPortfolioHoldings,
    portfolioAnalysisHistory: [] as PortfolioAnalysisRecord[],
    investmentDecisionHistory: [] as InvestmentDecisionRecord[],
    assets: defaultAssets,
    liabilities: defaultLiabilities,
    budgetLimits: defaultBudgetLimits,
  };
}

function buildLiveState() {
  return {
    appMode: 'live' as const,
    user: null,
    notificationFeed: [] as NotificationItem[],
    incomeEntries: [] as IncomeEntry[],
    expenseEntries: [] as ExpenseEntry[],
    receiptScans: [] as ReceiptScanResult[],
    portfolioHoldings: [] as PortfolioHolding[],
    portfolioAnalysisHistory: [] as PortfolioAnalysisRecord[],
    investmentDecisionHistory: [] as InvestmentDecisionRecord[],
    assets: [] as AssetEntry[],
    liabilities: [] as LiabilityEntry[],
    budgetLimits: [] as BudgetLimit[],
  };
}

function sanitizeRemoteWorkspace(workspace: Partial<RemoteWorkspaceSnapshot> | undefined): RemoteWorkspaceSnapshot {
  const live = buildLiveState();

  return {
    appMode: workspace?.appMode === 'demo' ? 'demo' : 'live',
    notificationPreferences: {
      ...defaultNotificationPreferences,
      ...(workspace?.notificationPreferences ?? {}),
    },
    notificationFeed: Array.isArray(workspace?.notificationFeed) ? workspace.notificationFeed : live.notificationFeed,
    incomeEntries: Array.isArray(workspace?.incomeEntries) ? workspace.incomeEntries : live.incomeEntries,
    expenseEntries: Array.isArray(workspace?.expenseEntries) ? workspace.expenseEntries : live.expenseEntries,
    receiptScans: Array.isArray(workspace?.receiptScans) ? workspace.receiptScans : live.receiptScans,
    portfolioHoldings: Array.isArray(workspace?.portfolioHoldings) ? workspace.portfolioHoldings : live.portfolioHoldings,
    portfolioAnalysisHistory: normalizePortfolioAnalysisHistory(workspace?.portfolioAnalysisHistory),
    investmentDecisionHistory: normalizeInvestmentDecisionHistory(workspace?.investmentDecisionHistory),
    assets: normalizeAssetEntries(workspace?.assets),
    liabilities: normalizeLiabilityEntries(workspace?.liabilities),
    budgetLimits: Array.isArray(workspace?.budgetLimits) ? workspace.budgetLimits : live.budgetLimits,
  };
}

function createProfileSnapshot(
  id: string,
  label: string,
  email: string,
  state: ReturnType<typeof buildDemoState> | ReturnType<typeof buildLiveState>,
  overrides?: {
    user?: User | null;
    notificationPreferences?: NotificationPreferences;
  }
): LocalProfile {
  return {
    id,
    label,
    email,
    avatarUrl: overrides?.user?.avatarUrl ?? state.user?.avatarUrl ?? null,
    appMode: state.appMode,
    user: overrides?.user ?? state.user,
    notificationPreferences: overrides?.notificationPreferences ?? defaultNotificationPreferences,
    notificationFeed: state.notificationFeed,
    incomeEntries: state.incomeEntries,
    expenseEntries: state.expenseEntries,
    receiptScans: state.receiptScans,
    portfolioHoldings: state.portfolioHoldings,
    portfolioAnalysisHistory: state.portfolioAnalysisHistory,
    investmentDecisionHistory: state.investmentDecisionHistory,
    assets: state.assets,
    liabilities: state.liabilities,
    budgetLimits: state.budgetLimits,
  };
}

function findProfileById(profiles: LocalProfile[], profileId: string) {
  return profiles.find((profile) => profile.id === profileId);
}

function profileToRemoteWorkspace(profile: LocalProfile): RemoteWorkspaceSnapshot {
  return workspaceFieldsToSnapshot({
    appMode: 'live',
    notificationPreferences: profile.notificationPreferences,
    notificationFeed: profile.notificationFeed,
    incomeEntries: profile.incomeEntries,
    expenseEntries: profile.expenseEntries,
    receiptScans: profile.receiptScans,
    portfolioHoldings: profile.portfolioHoldings,
    portfolioAnalysisHistory: profile.portfolioAnalysisHistory,
    investmentDecisionHistory: profile.investmentDecisionHistory,
    assets: profile.assets,
    liabilities: profile.liabilities,
    budgetLimits: profile.budgetLimits,
  });
}

function snapshotActiveProfile(state: AppState): LocalProfile {
  const existing = state.profiles.find((profile) => profile.id === state.activeProfileId);
  return {
    id: state.activeProfileId,
    label: state.user?.name?.trim() || existing?.label || 'User',
    email: state.user?.email || existing?.email || '',
    avatarUrl: state.user?.avatarUrl || existing?.avatarUrl || null,
    appMode: state.appMode,
    user: state.user,
    notificationPreferences: state.notificationPreferences,
    notificationFeed: state.notificationFeed,
    incomeEntries: state.incomeEntries,
    expenseEntries: state.expenseEntries,
    receiptScans: state.receiptScans,
    portfolioHoldings: state.portfolioHoldings,
    portfolioAnalysisHistory: state.portfolioAnalysisHistory,
    investmentDecisionHistory: state.investmentDecisionHistory,
    assets: state.assets,
    liabilities: state.liabilities,
    budgetLimits: state.budgetLimits,
  };
}

function upsertProfile(profiles: LocalProfile[], nextProfile: LocalProfile) {
  const existing = profiles.some((profile) => profile.id === nextProfile.id);
  if (!existing) {
    return [...profiles, nextProfile];
  }

  return profiles.map((profile) => (profile.id === nextProfile.id ? nextProfile : profile));
}

function syncActiveProfileState(state: AppState, partial: Partial<AppState>) {
  const nextState = { ...state, ...partial } as AppState;
  const preservePersistedLiveProfile =
    nextState.appMode === 'demo' && nextState.activeProfileId !== initialGuestProfile.id;
  const nextProfile = preservePersistedLiveProfile
    ? findProfileById(state.profiles, nextState.activeProfileId) ?? snapshotActiveProfile(state)
    : snapshotActiveProfile(nextState);
  return {
    ...partial,
    profiles: upsertProfile(state.profiles, nextProfile),
  };
}

function profileToState(profile: LocalProfile) {
  return {
    appMode: profile.appMode,
    user: profile.user,
    notificationPreferences: profile.notificationPreferences,
    notificationFeed: profile.notificationFeed,
    incomeEntries: profile.incomeEntries,
    expenseEntries: profile.expenseEntries,
    receiptScans: profile.receiptScans,
    portfolioHoldings: profile.portfolioHoldings,
    portfolioAnalysisHistory: profile.portfolioAnalysisHistory,
    investmentDecisionHistory: profile.investmentDecisionHistory,
    assets: normalizeAssetEntries(profile.assets),
    liabilities: normalizeLiabilityEntries(profile.liabilities),
    budgetLimits: profile.budgetLimits,
  };
}

const initialGuestProfile = createProfileSnapshot('guest', 'Guest', '', buildDemoState(), {
  user: null,
  notificationPreferences: defaultNotificationPreferences,
});

interface AppState {
  // User
  user: User | null;
  setUser: (user: User | null) => void;
  updateUser: (updates: Partial<User>) => void;
  
  // Locale & Theme
  locale: Locale;
  setLocale: (locale: Locale) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  appMode: AppMode;
  setAppMode: (mode: AppMode) => void;
  notificationPreferences: NotificationPreferences;
  updateNotificationPreferences: (updates: Partial<NotificationPreferences>) => void;
  notificationFeed: NotificationItem[];
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  profiles: LocalProfile[];
  activeProfileId: string;
  syncClerkUser: (authUser: AuthenticatedUserPayload) => void;
  clearClerkUser: () => void;
  incomeEntries: IncomeEntry[];
  addIncomeEntry: (entry: IncomeEntry) => void;
  addIncomeEntries: (entries: IncomeEntry[]) => void;
  deleteIncomeEntry: (id: string) => void;
  expenseEntries: ExpenseEntry[];
  addExpenseEntry: (entry: ExpenseEntry) => void;
  addExpenseEntries: (entries: ExpenseEntry[]) => void;
  deleteExpenseEntry: (id: string) => void;
  receiptScans: ReceiptScanResult[];
  addReceiptScan: (receipt: ReceiptScanResult) => void;
  portfolioHoldings: PortfolioHolding[];
  addPortfolioHolding: (holding: PortfolioHolding) => void;
  deletePortfolioHolding: (id: string) => void;
  replacePortfolioHoldings: (holdings: PortfolioHolding[]) => void;
  portfolioAnalysisHistory: PortfolioAnalysisRecord[];
  addPortfolioAnalysisRecord: (record: PortfolioAnalysisRecord) => void;
  deletePortfolioAnalysisRecord: (id: string) => void;
  investmentDecisionHistory: InvestmentDecisionRecord[];
  addInvestmentDecisionRecord: (record: InvestmentDecisionRecord) => void;
  deleteInvestmentDecisionRecord: (id: string) => void;
  assets: AssetEntry[];
  addAsset: (asset: AssetEntry) => void;
  deleteAsset: (id: string) => void;
  liabilities: LiabilityEntry[];
  addLiability: (liability: LiabilityEntry) => void;
  deleteLiability: (id: string) => void;
  budgetLimits: BudgetLimit[];
  setBudgetLimits: (limits: BudgetLimit[]) => void;
  hydrateRemoteWorkspace: (workspace: RemoteWorkspaceSnapshot) => void;
  stashRemoteWorkspace: (workspace: RemoteWorkspaceSnapshot) => void;
  clearAllData: () => void;
  setSubscriptionTier: (tier: SubscriptionTier) => void;
  
  // Sidebar
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  
  // Dashboard widgets
  activeDashboardTab: string;
  setActiveDashboardTab: (tab: string) => void;
  
  // Portfolio
  selectedExchange: string;
  setSelectedExchange: (exchange: string) => void;
  shariahFilterEnabled: boolean;
  toggleShariahFilter: () => void;
  
  // Budget
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  
  // AI Advisor
  activeChatSession: string | null;
  setActiveChatSession: (sessionId: string | null) => void;
  attachPortfolioContext: boolean;
  setAttachPortfolioContext: (attach: boolean) => void;
  
  // UI State
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  isMobile: boolean;
  setIsMobile: (isMobile: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // User
      user: initialGuestProfile.user,
      setUser: (user) => set((state) => syncActiveProfileState(state, { user })),
      updateUser: (updates) => set((state) =>
        syncActiveProfileState(state, {
          user: { ...(state.user ?? defaultUser), ...updates },
        })
      ),
      
      // Locale & Theme
      locale: 'en',
      setLocale: (locale) => set({ locale }),
      theme: 'light',
      setTheme: (theme) => set({ theme }),
      appMode: initialGuestProfile.appMode,
      setAppMode: (mode) => set((state) => {
        if (state.appMode === mode) {
          return {};
        }

        const activeProfile = findProfileById(state.profiles, state.activeProfileId);

        if (mode === 'demo') {
          console.info('[mode-switch] live -> demo', {
            profileId: state.activeProfileId,
            hasPersistedLiveProfile: Boolean(activeProfile),
          });

          return syncActiveProfileState(state, {
            ...buildDemoState(),
            user: state.user
              ? {
                  ...(state.user ?? defaultUser),
                  id: state.activeProfileId,
                  name: state.user?.name ?? '',
                  email: state.user?.email ?? '',
                  avatarUrl: state.user?.avatarUrl ?? null,
                  subscriptionTier: state.user?.subscriptionTier ?? 'none',
                }
              : null,
            notificationPreferences: activeProfile?.notificationPreferences ?? state.notificationPreferences,
            sidebarCollapsed: false,
            activeDashboardTab: 'overview',
            selectedExchange: 'all',
            shariahFilterEnabled: false,
            selectedMonth: new Date().toISOString().slice(0, 7),
            activeChatSession: null,
            attachPortfolioContext: false,
            isLoading: false,
          });
        }

        const restoredState = activeProfile
          ? {
              ...profileToState(activeProfile),
              user: activeProfile.user
                ? {
                    ...activeProfile.user,
                    id: state.activeProfileId,
                    name: state.user?.name ?? activeProfile.user.name ?? '',
                    email: state.user?.email ?? activeProfile.user.email,
                    avatarUrl: state.user?.avatarUrl ?? activeProfile.user.avatarUrl ?? null,
                    subscriptionTier: state.user?.subscriptionTier ?? activeProfile.user.subscriptionTier ?? 'none',
                  }
                : state.user,
            }
          : {
              ...buildLiveState(),
              user: state.user
                ? {
                    ...(state.user ?? defaultUser),
                    id: state.activeProfileId,
                    name: state.user?.name ?? '',
                    email: state.user?.email ?? '',
                    avatarUrl: state.user?.avatarUrl ?? null,
                    subscriptionTier: state.user?.subscriptionTier ?? 'none',
                  }
                : null,
            };

        console.info('[mode-switch] demo -> live', {
          profileId: state.activeProfileId,
          restoredFromPersistedProfile: Boolean(activeProfile),
          restoredIncomeEntries: restoredState.incomeEntries.length,
          restoredExpenseEntries: restoredState.expenseEntries.length,
        });

        return syncActiveProfileState(state, {
          ...restoredState,
          sidebarCollapsed: false,
          activeDashboardTab: 'overview',
          selectedExchange: 'all',
          shariahFilterEnabled: false,
          selectedMonth: new Date().toISOString().slice(0, 7),
          activeChatSession: null,
          attachPortfolioContext: false,
          isLoading: false,
        });
      }),
      notificationPreferences: initialGuestProfile.notificationPreferences,
      updateNotificationPreferences: (updates) => set((state) =>
        syncActiveProfileState(state, {
          notificationPreferences: {
            ...state.notificationPreferences,
            ...updates,
          },
        })
      ),
      notificationFeed: initialGuestProfile.notificationFeed,
      markNotificationAsRead: (id) => set((state) =>
        syncActiveProfileState(state, {
          notificationFeed: state.notificationFeed.map((item) =>
            item.id === id ? { ...item, read: true } : item
          ),
        })
      ),
      markAllNotificationsRead: () => set((state) =>
        syncActiveProfileState(state, {
          notificationFeed: state.notificationFeed.map((item) => ({
            ...item,
            read: true,
          })),
        })
      ),
      profiles: [],
      activeProfileId: initialGuestProfile.id,
      syncClerkUser: (authUser) =>
        set((state) => {
          const profiles = state.user ? upsertProfile(state.profiles, snapshotActiveProfile(state)) : state.profiles;
          const existing = profiles.find((profile) => profile.id === authUser.id);
          const nextUser: User = {
            id: authUser.id,
            email: authUser.email,
            name: authUser.name,
            avatarUrl: authUser.avatarUrl,
            locale: state.locale,
            currency: 'SAR',
            subscriptionTier: authUser.subscriptionTier ?? existing?.user?.subscriptionTier ?? 'none',
            onboardingDone: true,
          };

          if (existing) {
            const updatedProfile: LocalProfile = {
              ...existing,
              label: authUser.name?.trim() || existing.label || 'User',
              email: authUser.email,
              avatarUrl: authUser.avatarUrl,
              user: {
                ...(existing.user ?? nextUser),
                ...nextUser,
              },
            };

            return {
              ...profileToState(updatedProfile),
              profiles: upsertProfile(profiles, updatedProfile),
              activeProfileId: authUser.id,
            };
          }

          const liveProfile = createProfileSnapshot(
            authUser.id,
            authUser.name?.trim() || 'User',
            authUser.email,
            buildLiveState(),
            {
              user: nextUser,
              notificationPreferences: defaultNotificationPreferences,
            }
          );

          return {
            ...profileToState(liveProfile),
            profiles: upsertProfile(profiles, liveProfile),
            activeProfileId: authUser.id,
          };
        }),
      clearClerkUser: () =>
        set((state) => ({
          ...profileToState(initialGuestProfile),
          profiles: state.user ? upsertProfile(state.profiles, snapshotActiveProfile(state)) : state.profiles,
          activeProfileId: initialGuestProfile.id,
        })),
      incomeEntries: initialGuestProfile.incomeEntries,
      addIncomeEntry: (entry) => set((state) =>
        syncActiveProfileState(state, {
          incomeEntries: [entry, ...state.incomeEntries],
        })
      ),
      addIncomeEntries: (entries) => set((state) =>
        syncActiveProfileState(state, {
          incomeEntries: [...entries, ...state.incomeEntries],
        })
      ),
      deleteIncomeEntry: (id) => set((state) =>
        syncActiveProfileState(state, {
          incomeEntries: state.incomeEntries.filter((entry) => entry.id !== id),
        })
      ),
      expenseEntries: initialGuestProfile.expenseEntries,
      addExpenseEntry: (entry) => set((state) =>
        syncActiveProfileState(state, {
          expenseEntries: [entry, ...state.expenseEntries],
        })
      ),
      addExpenseEntries: (entries) => set((state) =>
        syncActiveProfileState(state, {
          expenseEntries: [...entries, ...state.expenseEntries],
        })
      ),
      deleteExpenseEntry: (id) => set((state) =>
        syncActiveProfileState(state, {
          expenseEntries: state.expenseEntries.filter((entry) => entry.id !== id),
        })
      ),
      receiptScans: initialGuestProfile.receiptScans,
      addReceiptScan: (receipt) => set((state) =>
        syncActiveProfileState(state, {
          receiptScans: [receipt, ...state.receiptScans].slice(0, 20),
        })
      ),
      portfolioHoldings: initialGuestProfile.portfolioHoldings,
      addPortfolioHolding: (holding) => set((state) =>
        syncActiveProfileState(state, {
          portfolioHoldings: mergePortfolioHoldingEntries([holding, ...state.portfolioHoldings]),
        })
      ),
      deletePortfolioHolding: (id) => set((state) =>
        syncActiveProfileState(state, {
          portfolioHoldings: state.portfolioHoldings.filter((holding) => holding.id !== id),
        })
      ),
      replacePortfolioHoldings: (holdings) => set((state) =>
        syncActiveProfileState(state, {
          portfolioHoldings: mergePortfolioHoldingEntries(holdings),
        })
      ),
      portfolioAnalysisHistory: initialGuestProfile.portfolioAnalysisHistory,
      addPortfolioAnalysisRecord: (record) => set((state) =>
        syncActiveProfileState(state, {
          portfolioAnalysisHistory: [record, ...state.portfolioAnalysisHistory].slice(0, 20),
        })
      ),
      deletePortfolioAnalysisRecord: (id) => set((state) =>
        syncActiveProfileState(state, {
          portfolioAnalysisHistory: state.portfolioAnalysisHistory.filter((record) => record.id !== id),
        })
      ),
      investmentDecisionHistory: initialGuestProfile.investmentDecisionHistory,
      addInvestmentDecisionRecord: (record) => set((state) =>
        syncActiveProfileState(state, {
          investmentDecisionHistory: [record, ...state.investmentDecisionHistory].slice(0, 30),
        })
      ),
      deleteInvestmentDecisionRecord: (id) => set((state) =>
        syncActiveProfileState(state, {
          investmentDecisionHistory: state.investmentDecisionHistory.filter((record) => record.id !== id),
        })
      ),
      assets: initialGuestProfile.assets,
      addAsset: (asset) => set((state) =>
        syncActiveProfileState(state, {
          assets: [asset, ...state.assets],
        })
      ),
      deleteAsset: (id) => set((state) =>
        syncActiveProfileState(state, {
          assets: state.assets.filter((asset) => asset.id !== id),
        })
      ),
      liabilities: initialGuestProfile.liabilities,
      addLiability: (liability) => set((state) =>
        syncActiveProfileState(state, {
          liabilities: [liability, ...state.liabilities],
        })
      ),
      deleteLiability: (id) => set((state) =>
        syncActiveProfileState(state, {
          liabilities: state.liabilities.filter((liability) => liability.id !== id),
        })
      ),
      budgetLimits: initialGuestProfile.budgetLimits,
      setBudgetLimits: (limits) => set((state) =>
        syncActiveProfileState(state, {
          budgetLimits: limits,
        })
      ),
      hydrateRemoteWorkspace: (workspace) => set((state) => {
        const sanitizedWorkspace = sanitizeRemoteWorkspace(workspace);
        return syncActiveProfileState(state, {
          appMode: sanitizedWorkspace.appMode,
          notificationPreferences: sanitizedWorkspace.notificationPreferences,
          notificationFeed: sanitizedWorkspace.notificationFeed,
          incomeEntries: sanitizedWorkspace.incomeEntries,
          expenseEntries: sanitizedWorkspace.expenseEntries,
          receiptScans: sanitizedWorkspace.receiptScans,
          portfolioHoldings: mergePortfolioHoldingEntries(sanitizedWorkspace.portfolioHoldings),
          portfolioAnalysisHistory: normalizePortfolioAnalysisHistory(sanitizedWorkspace.portfolioAnalysisHistory),
          investmentDecisionHistory: normalizeInvestmentDecisionHistory(sanitizedWorkspace.investmentDecisionHistory),
          assets: sanitizedWorkspace.assets,
          liabilities: sanitizedWorkspace.liabilities,
          budgetLimits: sanitizedWorkspace.budgetLimits,
        });
      }),
      stashRemoteWorkspace: (workspace) => set((state) => {
        if (state.activeProfileId === initialGuestProfile.id) {
          return {};
        }

        const sanitizedWorkspace = sanitizeRemoteWorkspace({
          ...workspace,
          appMode: 'live',
        });
        const existingProfile = findProfileById(state.profiles, state.activeProfileId);
        const nextProfile: LocalProfile = {
          ...(existingProfile ?? createProfileSnapshot(
            state.activeProfileId,
            state.user?.name?.trim() || 'User',
            state.user?.email || '',
            buildLiveState(),
            {
              user: state.user,
              notificationPreferences: sanitizedWorkspace.notificationPreferences,
            }
          )),
          label: state.user?.name?.trim() || existingProfile?.label || 'User',
          email: state.user?.email || existingProfile?.email || '',
          avatarUrl: state.user?.avatarUrl ?? existingProfile?.avatarUrl ?? null,
          appMode: 'live',
          user: state.user ?? existingProfile?.user ?? null,
          notificationPreferences: sanitizedWorkspace.notificationPreferences,
          notificationFeed: sanitizedWorkspace.notificationFeed,
          incomeEntries: sanitizedWorkspace.incomeEntries,
          expenseEntries: sanitizedWorkspace.expenseEntries,
          receiptScans: sanitizedWorkspace.receiptScans,
          portfolioHoldings: mergePortfolioHoldingEntries(sanitizedWorkspace.portfolioHoldings),
          portfolioAnalysisHistory: normalizePortfolioAnalysisHistory(sanitizedWorkspace.portfolioAnalysisHistory),
          investmentDecisionHistory: normalizeInvestmentDecisionHistory(sanitizedWorkspace.investmentDecisionHistory),
          assets: sanitizedWorkspace.assets,
          liabilities: sanitizedWorkspace.liabilities,
          budgetLimits: sanitizedWorkspace.budgetLimits,
        };

        return {
          profiles: upsertProfile(state.profiles, nextProfile),
        };
      }),
      setSubscriptionTier: (tier) => set((state) =>
        syncActiveProfileState(state, {
          user: {
            ...(state.user ?? defaultUser),
            subscriptionTier: tier,
          },
        })
      ),
      clearAllData: () => {
        if (typeof window !== 'undefined') {
          for (const storageKey of [APP_STORAGE_KEY, ...LEGACY_STORAGE_KEYS]) {
            window.localStorage.removeItem(storageKey);
          }
        }

        set((state) =>
          syncActiveProfileState(state, {
            ...buildLiveState(),
            user: state.user
              ? {
                  ...state.user,
                  subscriptionTier: state.user.subscriptionTier ?? 'none',
                }
              : null,
            locale: 'en',
            theme: 'light',
            notificationPreferences: defaultNotificationPreferences,
            sidebarCollapsed: false,
            activeDashboardTab: 'overview',
            selectedExchange: 'all',
            shariahFilterEnabled: false,
            selectedMonth: new Date().toISOString().slice(0, 7),
            activeChatSession: null,
            attachPortfolioContext: false,
            isLoading: false,
            isMobile: false,
          })
        );
      },
      
      // Sidebar
      sidebarCollapsed: false,
      toggleSidebar: () => set((state) => ({ 
        sidebarCollapsed: !state.sidebarCollapsed 
      })),
      setSidebarCollapsed: (collapsed) => set({ 
        sidebarCollapsed: collapsed 
      }),
      
      // Dashboard
      activeDashboardTab: 'overview',
      setActiveDashboardTab: (tab) => set({ 
        activeDashboardTab: tab 
      }),
      
      // Portfolio
      selectedExchange: 'all',
      setSelectedExchange: (exchange) => set({ 
        selectedExchange: exchange 
      }),
      shariahFilterEnabled: false,
      toggleShariahFilter: () => set((state) => ({ 
        shariahFilterEnabled: !state.shariahFilterEnabled 
      })),
      
      // Budget
      selectedMonth: new Date().toISOString().slice(0, 7),
      setSelectedMonth: (month) => set({ selectedMonth: month }),
      
      // AI Advisor
      activeChatSession: null,
      setActiveChatSession: (sessionId) => set({ 
        activeChatSession: sessionId 
      }),
      attachPortfolioContext: false,
      setAttachPortfolioContext: (attach) => set({ 
        attachPortfolioContext: attach 
      }),
      
      // UI State
      isLoading: false,
      setIsLoading: (loading) => set({ isLoading: loading }),
      isMobile: false,
      setIsMobile: (isMobile) => set({ isMobile }),
    }),
    {
      name: APP_STORAGE_KEY,
      version: 4,
      migrate: (persistedState, _version) => {
        if (!persistedState || typeof persistedState !== 'object') {
          return persistedState as AppState;
        }

        const nextState = persistedState as AppState & Partial<RemoteWorkspaceSnapshot>;
        const locale: Locale = nextState.locale === 'ar' ? 'ar' : 'en';
        const theme: Theme =
          nextState.theme === 'dark' || nextState.theme === 'system' ? nextState.theme : 'light';

        return {
          ...nextState,
          ...sanitizeRemoteWorkspace(nextState),
          profiles: Array.isArray(nextState.profiles) ? nextState.profiles : [],
          activeProfileId: typeof nextState.activeProfileId === 'string' ? nextState.activeProfileId : initialGuestProfile.id,
          locale,
          theme,
          sidebarCollapsed: Boolean(nextState.sidebarCollapsed),
          shariahFilterEnabled: Boolean(nextState.shariahFilterEnabled),
        };
      },
      partialize: (state) => ({
        user: state.user,
        locale: state.locale,
        theme: state.theme,
        appMode: state.appMode,
        profiles: state.profiles,
        activeProfileId: state.activeProfileId,
        notificationPreferences: state.notificationPreferences,
        notificationFeed: state.notificationFeed,
        incomeEntries: state.incomeEntries,
        expenseEntries: state.expenseEntries,
        receiptScans: state.receiptScans,
        portfolioHoldings: state.portfolioHoldings,
        portfolioAnalysisHistory: state.portfolioAnalysisHistory,
        investmentDecisionHistory: state.investmentDecisionHistory,
        assets: state.assets,
        liabilities: state.liabilities,
        budgetLimits: state.budgetLimits,
        sidebarCollapsed: state.sidebarCollapsed,
        shariahFilterEnabled: state.shariahFilterEnabled,
      }),
    }
  )
);

export function getPersistableWorkspaceSnapshot(state: Pick<
  AppState,
  | 'appMode'
  | 'activeProfileId'
  | 'profiles'
  | 'notificationPreferences'
  | 'notificationFeed'
  | 'incomeEntries'
  | 'expenseEntries'
  | 'receiptScans'
  | 'portfolioHoldings'
  | 'portfolioAnalysisHistory'
  | 'investmentDecisionHistory'
  | 'assets'
  | 'liabilities'
  | 'budgetLimits'
>): RemoteWorkspaceSnapshot {
  if (state.appMode === 'demo') {
    const activeProfile = findProfileById(state.profiles, state.activeProfileId);
    if (activeProfile) {
      return profileToRemoteWorkspace(activeProfile);
    }
  }

  return workspaceFieldsToSnapshot({
    appMode: state.appMode === 'demo' ? 'live' : state.appMode,
    notificationPreferences: state.notificationPreferences,
    notificationFeed: state.notificationFeed,
    incomeEntries: state.incomeEntries,
    expenseEntries: state.expenseEntries,
    receiptScans: state.receiptScans,
    portfolioHoldings: state.portfolioHoldings,
    portfolioAnalysisHistory: state.portfolioAnalysisHistory,
    investmentDecisionHistory: state.investmentDecisionHistory,
    assets: state.assets,
    liabilities: state.liabilities,
    budgetLimits: state.budgetLimits,
  });
}

// Feature gating based on subscription
export const useSubscription = () => {
  const user = useAppStore((state) => state.user);
  const { user: clerkUser } = useUser();
  const tier = user?.subscriptionTier || 'none';
  const metadata = clerkUser?.publicMetadata as Record<string, unknown> | undefined;
  const billingState = getBillingState(metadata);
  const hasPaidAccess =
    (tier === 'core' || tier === 'pro') &&
    billingState.hasPaidAccess &&
    billingState.selectedPlan === tier;
  const hasStandardAccess =
    (tier === 'core' || tier === 'pro') &&
    billingState.hasStandardAccess &&
    billingState.selectedPlan === tier;
  
  return {
    tier,
    isFree: tier === 'none',
    isCore: tier === 'core',
    isPro: tier === 'pro',
    hasPaidAccess,
    hasStandardAccess,
    trialActive: billingState.trialActive,
    paymentAdded: billingState.paymentAdded,
    canAccess: (feature: string) => {
      const features: Record<string, 'standard' | 'paid' | 'pro-paid'> = {
        'portfolio.unlimited': 'standard',
        'portfolio.ai_analysis': 'pro-paid',
        'fire.scenarios': 'standard',
        'budget.history': 'standard',
        'expenses.receipt_scan': 'standard',
        'expenses.statement_import': 'pro-paid',
        'ai.advisor': 'pro-paid',
        'ai.portfolio_analysis': 'pro-paid',
        'reports.basic': 'paid',
        'reports.full': 'pro-paid',
        'alerts.unlimited': 'pro-paid',
        'alerts.3max': 'standard',
        'data.export': 'standard',
      };
      const requirement = features[feature];

      if (!requirement) {
        return false;
      }

      if (requirement === 'standard') {
        return hasStandardAccess;
      }

      if (requirement === 'paid') {
        return hasPaidAccess;
      }

      return hasPaidAccess && tier === 'pro';
    },
  };
};

// Currency formatting
export const formatCurrency = (
  amount: number,
  currency: string = 'SAR',
  locale: Locale = 'ar'
): string => {
  const formatter = new Intl.NumberFormat(locale === 'ar' ? 'ar-SA-u-nu-latn' : 'en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  return formatter.format(amount);
};

// Number formatting with Arabic numerals option
export const formatNumber = (
  number: number,
  locale: Locale = 'ar',
  options?: Intl.NumberFormatOptions
): string => {
  return new Intl.NumberFormat(
    locale === 'ar' ? 'ar-SA-u-nu-latn' : 'en-US',
    options
  ).format(number);
};

// Date formatting
export const formatDate = (
  date: Date | string,
  locale: Locale = 'ar',
  options?: Intl.DateTimeFormatOptions
): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(
    locale === 'ar' ? 'ar-SA-u-nu-latn' : 'en-US',
    {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      ...options,
    }
  ).format(d);
};

// Percentage formatting
export const formatPercent = (
  value: number,
  locale: Locale = 'ar',
  decimals: number = 2
): string => {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${formatNumber(value, locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}%`;
};
