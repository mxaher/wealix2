import { describe, expect, test } from 'bun:test';
import {
  mergeFinancialSettings,
  sanitizeFinancialSettings,
  DEFAULT_FINANCIAL_SETTINGS,
} from '@/lib/financial-settings';

describe('financial settings helpers', () => {
  test('sanitizes and computes derived fields', () => {
    const settings = sanitizeFinancialSettings({
      monthlyIncome: 12000,
      totalAssets: 500000,
      totalLiabilities: 125000,
      currentSavingsRate: 120,
      investmentAllocation: [
        { label: 'Equities', percentage: 60 },
        { label: 'Cash', percentage: 40 },
      ],
    });

    expect(settings.annualIncome).toBe(144000);
    expect(settings.netWorth).toBe(375000);
    expect(settings.currentSavingsRate).toBe(100);
    expect(settings.investmentAllocation).toHaveLength(2);
  });

  test('merges patches and keeps dependent values in sync', () => {
    const next = mergeFinancialSettings(DEFAULT_FINANCIAL_SETTINGS, {
      monthlyIncome: 9000,
      totalAssets: 300000,
      totalLiabilities: 50000,
    });

    expect(next.monthlyIncome).toBe(9000);
    expect(next.annualIncome).toBe(108000);
    expect(next.netWorth).toBe(250000);
  });
});
