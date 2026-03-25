import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Locale = 'ar' | 'en';
export type Theme = 'dark' | 'light' | 'system';
export type SubscriptionTier = 'free' | 'core' | 'pro';
export type IncomeSource = 'salary' | 'freelance' | 'business' | 'investment' | 'rental' | 'other';
export type IncomeFrequency = 'one_time' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
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

interface NotificationPreferences {
  email: boolean;
  push: boolean;
  priceAlerts: boolean;
  budgetAlerts: boolean;
  weeklyDigest: boolean;
}

interface NotificationItem {
  id: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  read: boolean;
  href: string;
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

const defaultUser: User = {
  id: 'demo-user',
  email: 'demo@wealthos.com',
  name: 'Demo User',
  avatarUrl: null,
  locale: 'ar',
  currency: 'SAR',
  subscriptionTier: 'free',
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
    amount: 18500,
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
    amount: 3200,
    currency: 'SAR',
    source: 'freelance',
    sourceName: 'Product Design Client',
    frequency: 'one_time',
    date: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    isRecurring: false,
    notes: null,
  },
];

const defaultExpenseEntries: ExpenseEntry[] = [
  {
    id: 'expense-grocery',
    amount: 420,
    currency: 'SAR',
    category: 'Food',
    description: 'Weekly groceries',
    merchantName: 'Danube',
    date: new Date().toISOString().slice(0, 10),
    paymentMethod: 'Card',
    notes: null,
    receiptId: null,
  },
  {
    id: 'expense-transport',
    amount: 84,
    currency: 'SAR',
    category: 'Transport',
    description: 'Ride sharing',
    merchantName: 'Uber',
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    paymentMethod: 'Card',
    notes: null,
    receiptId: null,
  },
];

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
  notificationPreferences: NotificationPreferences;
  updateNotificationPreferences: (updates: Partial<NotificationPreferences>) => void;
  notificationFeed: NotificationItem[];
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  incomeEntries: IncomeEntry[];
  addIncomeEntry: (entry: IncomeEntry) => void;
  deleteIncomeEntry: (id: string) => void;
  expenseEntries: ExpenseEntry[];
  addExpenseEntry: (entry: ExpenseEntry) => void;
  deleteExpenseEntry: (id: string) => void;
  receiptScans: ReceiptScanResult[];
  addReceiptScan: (receipt: ReceiptScanResult) => void;
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
      user: defaultUser,
      setUser: (user) => set({ user }),
      updateUser: (updates) => set((state) => ({
        user: { ...(state.user ?? defaultUser), ...updates }
      })),
      
      // Locale & Theme
      locale: 'ar',
      setLocale: (locale) => set({ locale }),
      theme: 'dark',
      setTheme: (theme) => set({ theme }),
      notificationPreferences: defaultNotificationPreferences,
      updateNotificationPreferences: (updates) => set((state) => ({
        notificationPreferences: {
          ...state.notificationPreferences,
          ...updates,
        },
      })),
      notificationFeed: defaultNotificationFeed,
      markNotificationAsRead: (id) => set((state) => ({
        notificationFeed: state.notificationFeed.map((item) =>
          item.id === id ? { ...item, read: true } : item
        ),
      })),
      markAllNotificationsRead: () => set((state) => ({
        notificationFeed: state.notificationFeed.map((item) => ({
          ...item,
          read: true,
        })),
      })),
      incomeEntries: defaultIncomeEntries,
      addIncomeEntry: (entry) => set((state) => ({
        incomeEntries: [entry, ...state.incomeEntries],
      })),
      deleteIncomeEntry: (id) => set((state) => ({
        incomeEntries: state.incomeEntries.filter((entry) => entry.id !== id),
      })),
      expenseEntries: defaultExpenseEntries,
      addExpenseEntry: (entry) => set((state) => ({
        expenseEntries: [entry, ...state.expenseEntries],
      })),
      deleteExpenseEntry: (id) => set((state) => ({
        expenseEntries: state.expenseEntries.filter((entry) => entry.id !== id),
      })),
      receiptScans: [],
      addReceiptScan: (receipt) => set((state) => ({
        receiptScans: [receipt, ...state.receiptScans].slice(0, 20),
      })),
      setSubscriptionTier: (tier) => set((state) => ({
        user: {
          ...(state.user ?? defaultUser),
          subscriptionTier: tier,
        },
      })),
      clearAllData: () => {
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem('wealthos-storage');
        }

        set({
          user: null,
          locale: 'ar',
          theme: 'dark',
          notificationPreferences: defaultNotificationPreferences,
          notificationFeed: defaultNotificationFeed,
          incomeEntries: defaultIncomeEntries,
          expenseEntries: defaultExpenseEntries,
          receiptScans: [],
          sidebarCollapsed: false,
          activeDashboardTab: 'overview',
          selectedExchange: 'all',
          shariahFilterEnabled: false,
          selectedMonth: new Date().toISOString().slice(0, 7),
          activeChatSession: null,
          attachPortfolioContext: false,
          isLoading: false,
          isMobile: false,
        });
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
      name: 'wealthos-storage',
      partialize: (state) => ({
        user: state.user,
        locale: state.locale,
        theme: state.theme,
        notificationPreferences: state.notificationPreferences,
        notificationFeed: state.notificationFeed,
        incomeEntries: state.incomeEntries,
        expenseEntries: state.expenseEntries,
        receiptScans: state.receiptScans,
        sidebarCollapsed: state.sidebarCollapsed,
        shariahFilterEnabled: state.shariahFilterEnabled,
      }),
    }
  )
);

// Feature gating based on subscription
export const useSubscription = () => {
  const user = useAppStore((state) => state.user);
  const tier = user?.subscriptionTier || 'free';
  
  return {
    tier,
    isFree: tier === 'free',
    isCore: tier === 'core',
    isPro: tier === 'pro',
    canAccess: (feature: string) => {
      const features: Record<string, SubscriptionTier[]> = {
        // Portfolio
        'portfolio.unlimited': ['core', 'pro'],
        'portfolio.ai_analysis': ['pro'],
        
        // FIRE
        'fire.scenarios': ['pro'],
        
        // Budget
        'budget.history': ['core', 'pro'],
        
        // AI
        'ai.advisor': ['pro'],
        'ai.portfolio_analysis': ['pro'],
        
        // Reports
        'reports.basic': ['core', 'pro'],
        'reports.full': ['pro'],
        
        // Alerts
        'alerts.unlimited': ['pro'],
        'alerts.3max': ['core', 'pro'],
        
        // Data
        'data.export': ['core', 'pro'],
      };
      
      return features[feature]?.includes(tier as SubscriptionTier) ?? false;
    },
  };
};

// Currency formatting
export const formatCurrency = (
  amount: number,
  currency: string = 'SAR',
  locale: Locale = 'ar'
): string => {
  const formatter = new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
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
    locale === 'ar' ? 'ar-SA' : 'en-US',
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
    locale === 'ar' ? 'ar-SA' : 'en-US',
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
