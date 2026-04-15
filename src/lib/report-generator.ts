import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import type { RemoteUserWorkspace } from '@/lib/remote-user-data';

const styles = StyleSheet.create({
  cover: {
    backgroundColor: '#0f1117',
    padding: 40,
    flex: 1,
    justifyContent: 'center',
  },
  coverTitle: {
    color: '#4f98a3',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  coverSubtitle: {
    color: '#9ca3af',
    fontSize: 14,
  },
  page: {
    padding: 40,
    fontSize: 11,
    color: '#1f2937',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4f98a3',
    marginTop: 16,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  label: {
    color: '#6b7280',
    flex: 1,
  },
  value: {
    fontWeight: 'bold',
    textAlign: 'right',
  },
  summaryBox: {
    backgroundColor: '#f9fafb',
    borderRadius: 4,
    padding: 12,
    marginVertical: 8,
  },
  bigNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4f98a3',
  },
  smallLabel: {
    fontSize: 9,
    color: '#9ca3af',
  },
});

function formatAmt(amount: number, currency = 'SAR'): string {
  return `${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function MonthlySummaryDoc({ workspace, month }: { workspace: RemoteUserWorkspace; month: string }) {
  const totalIncome = workspace.incomeEntries.reduce((sum, e) => sum + e.amount, 0);
  const totalExpenses = workspace.expenseEntries.reduce((sum, e) => sum + e.amount, 0);
  const netSavings = totalIncome - totalExpenses;

  const expenseByCategory: Record<string, number> = {};
  for (const e of workspace.expenseEntries) {
    expenseByCategory[e.category] = (expenseByCategory[e.category] ?? 0) + e.amount;
  }
  const topCategories = Object.entries(expenseByCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  return React.createElement(Document, null,
    React.createElement(Page, { size: 'A4' },
      React.createElement(View, { style: styles.cover },
        React.createElement(Text, { style: styles.coverTitle }, 'Monthly Financial Summary'),
        React.createElement(Text, { style: styles.coverSubtitle }, month)
      )
    ),
    React.createElement(Page, { size: 'A4', style: styles.page },
      React.createElement(Text, { style: styles.sectionTitle }, 'Income vs Expenses'),
      React.createElement(View, { style: styles.summaryBox },
        React.createElement(View, { style: styles.row },
          React.createElement(Text, { style: styles.label }, 'Total Income'),
          React.createElement(Text, { style: styles.value }, formatAmt(totalIncome))
        ),
        React.createElement(View, { style: styles.row },
          React.createElement(Text, { style: styles.label }, 'Total Expenses'),
          React.createElement(Text, { style: styles.value }, formatAmt(totalExpenses))
        ),
        React.createElement(View, { style: styles.row },
          React.createElement(Text, { style: styles.label }, 'Net Savings'),
          React.createElement(Text, { style: { ...styles.value, color: netSavings >= 0 ? '#10b981' : '#ef4444' } }, formatAmt(netSavings))
        )
      ),
      React.createElement(Text, { style: styles.sectionTitle }, 'Top Expense Categories'),
      ...topCategories.map(([cat, amt]) =>
        React.createElement(View, { key: cat, style: styles.row },
          React.createElement(Text, { style: styles.label }, cat),
          React.createElement(Text, { style: styles.value }, formatAmt(amt))
        )
      )
    )
  );
}

function NetWorthDoc({ workspace, date }: { workspace: RemoteUserWorkspace; date: string }) {
  const totalAssets = workspace.assets.reduce((sum, a) => sum + a.value, 0);
  const totalLiabilities = workspace.liabilities.reduce((sum, l) => sum + l.balance, 0);
  const netWorth = totalAssets - totalLiabilities;
  const annualExpenses = workspace.expenseEntries.reduce((sum, e) => sum + e.amount, 0) * 12;
  const fireNumber = annualExpenses * 25;

  return React.createElement(Document, null,
    React.createElement(Page, { size: 'A4' },
      React.createElement(View, { style: styles.cover },
        React.createElement(Text, { style: styles.coverTitle }, 'Net Worth Report'),
        React.createElement(Text, { style: styles.coverSubtitle }, date)
      )
    ),
    React.createElement(Page, { size: 'A4', style: styles.page },
      React.createElement(Text, { style: styles.sectionTitle }, 'Assets'),
      ...workspace.assets.map((a) =>
        React.createElement(View, { key: a.id, style: styles.row },
          React.createElement(Text, { style: styles.label }, `${a.name} (${a.category})`),
          React.createElement(Text, { style: styles.value }, formatAmt(a.value, a.currency))
        )
      ),
      React.createElement(Text, { style: styles.sectionTitle }, 'Liabilities'),
      ...workspace.liabilities.map((l) =>
        React.createElement(View, { key: l.id, style: styles.row },
          React.createElement(Text, { style: styles.label }, `${l.name} (${l.category})`),
          React.createElement(Text, { style: styles.value }, formatAmt(l.balance, l.currency))
        )
      ),
      React.createElement(Text, { style: styles.sectionTitle }, 'Summary'),
      React.createElement(View, { style: styles.summaryBox },
        React.createElement(View, { style: styles.row },
          React.createElement(Text, { style: styles.label }, 'Total Assets'),
          React.createElement(Text, { style: styles.value }, formatAmt(totalAssets))
        ),
        React.createElement(View, { style: styles.row },
          React.createElement(Text, { style: styles.label }, 'Total Liabilities'),
          React.createElement(Text, { style: styles.value }, formatAmt(totalLiabilities))
        ),
        React.createElement(View, { style: styles.row },
          React.createElement(Text, { style: styles.label }, 'Net Worth'),
          React.createElement(Text, { style: { ...styles.value, color: netWorth >= 0 ? '#10b981' : '#ef4444' } }, formatAmt(netWorth))
        ),
        React.createElement(View, { style: styles.row },
          React.createElement(Text, { style: styles.label }, 'FIRE Number (25x annual expenses)'),
          React.createElement(Text, { style: styles.value }, formatAmt(fireNumber))
        )
      )
    )
  );
}

function InvestmentDoc({ workspace, date, aiInsights }: { workspace: RemoteUserWorkspace; date: string; aiInsights?: string }) {
  const totalValue = workspace.portfolioHoldings.reduce(
    (sum, h) => sum + (h.currentPrice ?? h.avgCost ?? 0) * h.shares,
    0
  );

  return React.createElement(Document, null,
    React.createElement(Page, { size: 'A4' },
      React.createElement(View, { style: styles.cover },
        React.createElement(Text, { style: styles.coverTitle }, 'Portfolio Report'),
        React.createElement(Text, { style: styles.coverSubtitle }, date)
      )
    ),
    React.createElement(Page, { size: 'A4', style: styles.page },
      React.createElement(Text, { style: styles.sectionTitle }, 'Holdings'),
      ...workspace.portfolioHoldings.map((h) => {
        const value = (h.currentPrice ?? h.avgCost ?? 0) * h.shares;
        return React.createElement(View, { key: h.id, style: styles.row },
          React.createElement(Text, { style: styles.label }, `${h.ticker} — ${h.shares} shares`),
          React.createElement(Text, { style: styles.value }, formatAmt(value))
        );
      }),
      React.createElement(View, { style: styles.summaryBox },
        React.createElement(Text, { style: styles.label }, 'Total Portfolio Value'),
        React.createElement(Text, { style: styles.bigNumber }, formatAmt(totalValue))
      ),
      aiInsights
        ? React.createElement(View, null,
            React.createElement(Text, { style: styles.sectionTitle }, 'AI Insights'),
            React.createElement(Text, { style: { fontSize: 10, color: '#374151', lineHeight: 1.6 } }, aiInsights)
          )
        : null
    )
  );
}

export type ReportType = 'monthly-summary' | 'net-worth-report' | 'investment-report';

export async function generateReport(
  type: ReportType,
  workspace: RemoteUserWorkspace,
  options?: { month?: string; aiInsights?: string }
): Promise<Uint8Array> {
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const month = options?.month ?? new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' });

  let doc: React.ReactElement;
  if (type === 'monthly-summary') {
    doc = React.createElement(MonthlySummaryDoc, { workspace, month });
  } else if (type === 'net-worth-report') {
    doc = React.createElement(NetWorthDoc, { workspace, date });
  } else {
    doc = React.createElement(InvestmentDoc, { workspace, date, aiInsights: options?.aiInsights });
  }

  // @ts-expect-error renderToBuffer accepts any React element
  const buffer = await renderToBuffer(doc);
  return new Uint8Array(buffer);
}

export function getReportTitle(type: ReportType, options?: { month?: string }): string {
  if (type === 'monthly-summary') {
    return `Monthly Financial Summary — ${options?.month ?? new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}`;
  }
  if (type === 'net-worth-report') {
    return `Net Worth Report — ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`;
  }
  return `Portfolio Report — ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`;
}
