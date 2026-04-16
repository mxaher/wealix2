import type { RemoteWorkspaceSnapshot } from '../../src/store/useAppStore';

type PersonaName = 'HEALTHY' | 'PRESSURE' | 'STRESS';

const today = new Date();
const todayIso = today.toISOString().slice(0, 10);

function plusDays(days: number) {
  const value = new Date(today);
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
}

function minusDays(days: number) {
  return plusDays(days * -1);
}

function emptyWorkspace(): RemoteWorkspaceSnapshot {
  return {
    appMode: 'live',
    startPage: 'dashboard',
    notificationPreferences: {
      email: true,
      push: true,
      sms: false,
      whatsapp: false,
      priceAlerts: true,
      budgetAlerts: true,
      planningUpdates: true,
      statusChanges: true,
      reminders: true,
      weeklyDigest: false,
      preferredChannel: 'push',
      phoneNumber: '',
      useSamePhoneNumberForWhatsApp: true,
      whatsappNumber: '',
    },
    notificationFeed: [],
    incomeEntries: [],
    expenseEntries: [],
    receiptScans: [],
    portfolioHoldings: [],
    portfolioAnalysisHistory: [],
    investmentDecisionHistory: [],
    assets: [],
    liabilities: [],
    budgetLimits: [],
    recurringObligations: [],
    oneTimeExpenses: [],
    savingsAccounts: [],
  };
}

export const PERSONAS: Record<PersonaName, RemoteWorkspaceSnapshot> = {
  HEALTHY: {
    ...emptyWorkspace(),
    incomeEntries: [
      { id: 'healthy-income-salary', amount: 22000, currency: 'SAR', source: 'salary', sourceName: 'Base Salary', frequency: 'monthly', date: todayIso, isRecurring: true, notes: null },
      { id: 'healthy-income-side', amount: 3500, currency: 'SAR', source: 'business', sourceName: 'Advisory Retainer', frequency: 'monthly', date: todayIso, isRecurring: true, notes: null },
    ],
    expenseEntries: [
      { id: 'healthy-expense-housing', amount: 7000, currency: 'SAR', category: 'Housing', description: 'Apartment rent', merchantName: 'Landlord', date: todayIso, paymentMethod: 'Transfer', notes: null, receiptId: null },
      { id: 'healthy-expense-household', amount: 1800, currency: 'SAR', category: 'Household', description: 'Household support', merchantName: null, date: todayIso, paymentMethod: 'Transfer', notes: null, receiptId: null },
      { id: 'healthy-expense-food', amount: 1400, currency: 'SAR', category: 'Food', description: 'Groceries', merchantName: null, date: todayIso, paymentMethod: 'Card', notes: null, receiptId: null },
      { id: 'healthy-expense-transport', amount: 900, currency: 'SAR', category: 'Transport', description: 'Fuel', merchantName: null, date: todayIso, paymentMethod: 'Card', notes: null, receiptId: null },
      { id: 'healthy-expense-utilities', amount: 650, currency: 'SAR', category: 'Utilities', description: 'Utilities', merchantName: null, date: todayIso, paymentMethod: 'Card', notes: null, receiptId: null },
      { id: 'healthy-expense-entertainment', amount: 1200, currency: 'SAR', category: 'Entertainment', description: 'Leisure', merchantName: null, date: todayIso, paymentMethod: 'Card', notes: null, receiptId: null },
    ],
    assets: [
      { id: 'healthy-asset-cash', name: 'Main Cash Reserve', category: 'cash', value: 48000, currency: 'SAR' },
      { id: 'healthy-asset-car', name: 'Family Car', category: 'vehicle', value: 60000, currency: 'SAR' },
    ],
    liabilities: [
      { id: 'healthy-liability-card', name: 'Card Balance', category: 'credit_card', balance: 6500, currency: 'SAR' },
    ],
    recurringObligations: [
      { id: 'healthy-obligation-renewal', title: 'Iqama Renewal Fund', category: 'household_allowance', amount: 4000, currency: 'SAR', dueDay: Number(plusDays(45).slice(-2)), startDate: plusDays(45), frequency: 'one_time', status: 'upcoming', lastPaidDate: null, notes: 'Already funded' },
    ],
    savingsAccounts: [
      { id: 'healthy-savings-awaeed', name: 'Awaeed Growth', type: 'awaeed', provider: 'Al Rajhi', principal: 30000, currentBalance: 30000, annualProfitRate: 5, termMonths: 6, openedAt: minusDays(40), maturityDate: plusDays(120), purposeLabel: 'Summer travel', profitPayoutMethod: 'at_maturity', status: 'active', autoRenew: false, zakatHandledByInstitution: true, notes: null },
    ],
    portfolioHoldings: [
      { id: 'healthy-holding-1', ticker: '2222.SR', name: 'Saudi Aramco', exchange: 'TASI', shares: 200, avgCost: 30, currentPrice: 31.5, sector: 'Energy', isShariah: true },
      { id: 'healthy-holding-2', ticker: 'AAPL', name: 'Apple', exchange: 'NASDAQ', shares: 20, avgCost: 180, currentPrice: 190, sector: 'Technology', isShariah: false },
      { id: 'healthy-holding-3', ticker: 'GLD', name: 'Gold ETF', exchange: 'GOLD', shares: 15, avgCost: 720, currentPrice: 760, sector: 'Gold', isShariah: true },
    ],
  },
  PRESSURE: {
    ...emptyWorkspace(),
    incomeEntries: [
      { id: 'pressure-income-salary', amount: 9500, currency: 'SAR', source: 'salary', sourceName: 'Primary Salary', frequency: 'monthly', date: todayIso, isRecurring: true, notes: null },
    ],
    expenseEntries: [
      { id: 'pressure-expense-housing', amount: 5200, currency: 'SAR', category: 'Housing', description: 'Rent', merchantName: null, date: todayIso, paymentMethod: 'Transfer', notes: null, receiptId: null },
      { id: 'pressure-expense-food', amount: 1400, currency: 'SAR', category: 'Food', description: 'Groceries', merchantName: null, date: todayIso, paymentMethod: 'Card', notes: null, receiptId: null },
      { id: 'pressure-expense-transport', amount: 900, currency: 'SAR', category: 'Transport', description: 'Fuel', merchantName: null, date: todayIso, paymentMethod: 'Card', notes: null, receiptId: null },
      { id: 'pressure-expense-household', amount: 1200, currency: 'SAR', category: 'Household', description: 'Family support', merchantName: null, date: todayIso, paymentMethod: 'Transfer', notes: null, receiptId: null },
      { id: 'pressure-expense-utilities', amount: 700, currency: 'SAR', category: 'Utilities', description: 'Bills', merchantName: null, date: todayIso, paymentMethod: 'Card', notes: null, receiptId: null },
      { id: 'pressure-expense-other', amount: 600, currency: 'SAR', category: 'Other', description: 'Misc', merchantName: null, date: todayIso, paymentMethod: 'Card', notes: null, receiptId: null },
    ],
    assets: [
      { id: 'pressure-asset-cash', name: 'Checking', category: 'cash', value: 4000, currency: 'SAR' },
    ],
    liabilities: [
      { id: 'pressure-liability-loan', name: 'Personal Loan', category: 'loan', balance: 28000, currency: 'SAR' },
    ],
    recurringObligations: [
      { id: 'pressure-obligation-school', title: 'School Fees', category: 'education', amount: 18000, currency: 'SAR', dueDay: Number(plusDays(45).slice(-2)), startDate: plusDays(45), frequency: 'one_time', status: 'due_soon', lastPaidDate: null, notes: 'Underfunded' },
    ],
    portfolioHoldings: [
      { id: 'pressure-holding-1', ticker: 'NVDA', name: 'NVIDIA', exchange: 'NASDAQ', shares: 12, avgCost: 110, currentPrice: 118, sector: 'Technology', isShariah: false },
    ],
  },
  STRESS: {
    ...emptyWorkspace(),
    incomeEntries: [
      { id: 'stress-income-salary', amount: 11000, currency: 'SAR', source: 'salary', sourceName: 'Primary Salary', frequency: 'monthly', date: todayIso, isRecurring: true, notes: null },
    ],
    expenseEntries: [
      { id: 'stress-expense-housing', amount: 5400, currency: 'SAR', category: 'Housing', description: 'Rent', merchantName: null, date: todayIso, paymentMethod: 'Transfer', notes: null, receiptId: null },
      { id: 'stress-expense-food', amount: 1600, currency: 'SAR', category: 'Food', description: 'Groceries', merchantName: null, date: todayIso, paymentMethod: 'Card', notes: null, receiptId: null },
      { id: 'stress-expense-transport', amount: 1100, currency: 'SAR', category: 'Transport', description: 'Transport', merchantName: null, date: todayIso, paymentMethod: 'Card', notes: null, receiptId: null },
      { id: 'stress-expense-household', amount: 1300, currency: 'SAR', category: 'Household', description: 'Family support', merchantName: null, date: todayIso, paymentMethod: 'Transfer', notes: null, receiptId: null },
      { id: 'stress-expense-utilities', amount: 900, currency: 'SAR', category: 'Utilities', description: 'Utilities', merchantName: null, date: todayIso, paymentMethod: 'Card', notes: null, receiptId: null },
    ],
    assets: [
      { id: 'stress-asset-cash', name: 'Current Account', category: 'cash', value: 5000, currency: 'SAR' },
    ],
    liabilities: [
      { id: 'stress-liability-loan', name: 'Short Loan', category: 'loan', balance: 22000, currency: 'SAR' },
    ],
    recurringObligations: [
      { id: 'stress-obligation-1', title: 'Visa Renewal', category: 'other', amount: 9000, currency: 'SAR', dueDay: Number(plusDays(25).slice(-2)), startDate: plusDays(25), frequency: 'one_time', status: 'due_soon', lastPaidDate: null, notes: null },
      { id: 'stress-obligation-2', title: 'Family Medical Bill', category: 'healthcare', amount: 12000, currency: 'SAR', dueDay: Number(plusDays(58).slice(-2)), startDate: plusDays(58), frequency: 'one_time', status: 'upcoming', lastPaidDate: null, notes: null },
    ],
    oneTimeExpenses: [
      { id: 'stress-onetime-1', title: 'Laptop Replacement', amount: 6500, currency: 'SAR', dueDate: plusDays(35), category: 'other', notes: null, priority: 'high', fundingSource: 'Current Account', status: 'planned', paidDate: null },
    ],
    savingsAccounts: [
      { id: 'stress-savings-1', name: 'Awaeed Emergency', type: 'awaeed', provider: 'SNB', principal: 12000, currentBalance: 12000, annualProfitRate: 4.8, termMonths: 3, openedAt: minusDays(20), maturityDate: plusDays(85), purposeLabel: 'Emergency bridge', profitPayoutMethod: 'at_maturity', status: 'active', autoRenew: false, zakatHandledByInstitution: true, notes: null },
    ],
    portfolioHoldings: [
      { id: 'stress-holding-1', ticker: '2222.SR', name: 'Saudi Aramco', exchange: 'TASI', shares: 300, avgCost: 29, currentPrice: 30.5, sector: 'Energy', isShariah: true },
      { id: 'stress-holding-2', ticker: 'BTC', name: 'Bitcoin', exchange: 'NASDAQ', shares: 0.15, avgCost: 210000, currentPrice: 240000, sector: 'Crypto', isShariah: false },
    ],
  },
};

export function clonePersona(name: PersonaName) {
  return structuredClone(PERSONAS[name]);
}

export type { PersonaName };
