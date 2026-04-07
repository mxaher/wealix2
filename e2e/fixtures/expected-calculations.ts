import {
  buildFinancialSnapshotFromWorkspace,
  getDecisionCheckContext,
  type FinancialSnapshot,
} from '../../src/lib/financial-snapshot';
import type { RemoteWorkspaceSnapshot } from '../../src/store/useAppStore';
import { clonePersona, type PersonaName } from './personas';

export type ExpectedFinancialState = {
  workspace: RemoteWorkspaceSnapshot;
  snapshot: FinancialSnapshot;
};

function fromWorkspace(workspace: RemoteWorkspaceSnapshot): ExpectedFinancialState {
  return {
    workspace,
    snapshot: buildFinancialSnapshotFromWorkspace(workspace),
  };
}

export function getExpectedPersona(name: PersonaName) {
  return fromWorkspace(clonePersona(name));
}

export function withAddedIncome(state: ExpectedFinancialState, amount: number, sourceName = 'Salary Raise') {
  const next = structuredClone(state.workspace);
  next.incomeEntries.unshift({
    id: `income-${sourceName.toLowerCase().replace(/\s+/g, '-')}`,
    amount,
    currency: 'SAR',
    source: 'salary',
    sourceName,
    frequency: 'monthly',
    date: new Date().toISOString().slice(0, 10),
    isRecurring: true,
    notes: null,
  });
  return fromWorkspace(next);
}

export function withAddedExpense(state: ExpectedFinancialState, payload: { amount: number; description: string; category?: RemoteWorkspaceSnapshot['expenseEntries'][number]['category'] }) {
  const next = structuredClone(state.workspace);
  next.expenseEntries.unshift({
    id: `expense-${payload.description.toLowerCase().replace(/\s+/g, '-')}`,
    amount: payload.amount,
    currency: 'SAR',
    category: payload.category ?? 'Household',
    description: payload.description,
    merchantName: null,
    date: new Date().toISOString().slice(0, 10),
    paymentMethod: 'Card',
    notes: null,
    receiptId: null,
  });
  return fromWorkspace(next);
}

export function withAddedObligation(state: ExpectedFinancialState, payload: { id: string; title: string; amount: number; dueDay: number; startDate: string }) {
  const next = structuredClone(state.workspace);
  next.recurringObligations.unshift({
    id: payload.id,
    title: payload.title,
    category: 'other',
    amount: payload.amount,
    currency: 'SAR',
    dueDay: payload.dueDay,
    startDate: payload.startDate,
    frequency: 'one_time',
    status: 'due_soon',
    lastPaidDate: null,
    notes: null,
  });
  return fromWorkspace(next);
}

export function withAddedSavingsAccount(
  state: ExpectedFinancialState,
  payload: {
    id: string;
    name: string;
    principal: number;
    currentBalance: number;
    annualProfitRate: number;
    termMonths: number;
    openedAt: string;
    maturityDate: string;
    purposeLabel: string;
  }
) {
  const next = structuredClone(state.workspace);
  next.savingsAccounts.unshift({
    id: payload.id,
    name: payload.name,
    type: 'awaeed',
    provider: 'Al Rajhi',
    principal: payload.principal,
    currentBalance: payload.currentBalance,
    annualProfitRate: payload.annualProfitRate,
    termMonths: payload.termMonths,
    openedAt: payload.openedAt,
    maturityDate: payload.maturityDate,
    purposeLabel: payload.purposeLabel,
    profitPayoutMethod: 'at_maturity',
    status: 'active',
    autoRenew: false,
    zakatHandledByInstitution: true,
    notes: null,
  });
  return fromWorkspace(next);
}

export function withRemovedObligation(state: ExpectedFinancialState, obligationId: string) {
  const next = structuredClone(state.workspace);
  next.recurringObligations = next.recurringObligations.filter((item) => item.id !== obligationId);
  return fromWorkspace(next);
}

export function withAddedOneTimeExpense(state: ExpectedFinancialState, payload: { id: string; title: string; amount: number; dueDate: string }) {
  const next = structuredClone(state.workspace);
  next.oneTimeExpenses.unshift({
    id: payload.id,
    title: payload.title,
    amount: payload.amount,
    currency: 'SAR',
    dueDate: payload.dueDate,
    category: 'other',
    notes: null,
    priority: 'high',
    fundingSource: 'Current Account',
    status: 'planned',
    paidDate: null,
  });
  return fromWorkspace(next);
}

export function getDecisionContext(state: ExpectedFinancialState) {
  return getDecisionCheckContext(state.snapshot);
}
