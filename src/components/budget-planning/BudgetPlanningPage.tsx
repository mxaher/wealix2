'use client';

import type { ComponentType, ReactNode } from 'react';
import { useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  Calendar,
  Check,
  CheckCircle,
  ChevronRight,
  ChevronsUpDown,
  Clock,
  Home,
  Landmark,
  Lightbulb,
  MoreHorizontal,
  PiggyBank,
  Plus,
  RefreshCw,
  ShoppingBag,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  Utensils,
  Wallet,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { DashboardShell } from '@/components/layout';
import { StatCard } from '@/components/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { buildDailyPlanningSnapshot, type DailyPlanningSnapshot } from '@/lib/ai/daily-planning';
import { buildBudgetCriticalAlerts, buildDashboardInsightLines, buildFinancialPersonaFromClientContext } from '@/lib/financial-brain-surface';
import { buildWealixAIContextFromClientContext } from '@/lib/wealix-ai-context';
import { createOpaqueId } from '@/lib/ids';
import { buildForecast, buildForecastSummary, getOccurrencesInRange, getUpcomingOccurrences } from '@/lib/recurring-obligations';
import { useFinancialSnapshot } from '@/hooks/useFinancialSnapshot';
import { useRuntimeUser } from '@/hooks/useRuntimeUser';
import { cn } from '@/lib/utils';
import {
  formatCurrency,
  type ExpenseEntry,
  type OneTimeExpense,
  type RecurringFrequency,
  type RecurringObligation,
  type SavingsAccount,
  useAppStore,
} from '@/store/useAppStore';

type SavingsOption = {
  value: string;
  label: {
    en: string;
    ar: string;
  };
};

type BankOption = SavingsOption & {
  country: string;
};

type ForecastTooltipDatum = {
  month: string;
  monthKey: string;
  fullLabel: string;
  obligations: number;
  income: number;
};

type ForecastTooltipPayload = {
  dataKey?: string;
  value?: number;
  payload?: ForecastTooltipDatum;
};

type CustomForecastTooltipProps = {
  active?: boolean;
  payload?: ForecastTooltipPayload[];
  isArabic: boolean;
  locale: 'ar' | 'en';
  forecastPeriods: ReturnType<typeof buildForecast>;
};

type SuggestionComboboxProps<TOption extends SavingsOption> = {
  isArabic: boolean;
  value: string;
  searchValue: string;
  open: boolean;
  options: TOption[];
  placeholder: {
    en: string;
    ar: string;
  };
  emptyText: {
    en: string;
    ar: string;
  };
  suggestionValue: string | null;
  groupedOptions?: Array<{
    heading: string;
    items: TOption[];
  }>;
  onOpenChange: (open: boolean) => void;
  onSearchValueChange: (value: string) => void;
  onSelectOption: (option: TOption) => void;
  onSuggestValue?: (value: string) => void;
  renderItemMeta?: (option: TOption) => ReactNode;
};

const SAVINGS_ACCOUNT_NAMES: SavingsOption[] = [
  { value: 'al_rajhi_awaeed', label: { en: 'Al Rajhi — Awaeed Account', ar: 'الراجحي — حساب عوائد' } },
  { value: 'al_rajhi_mudarabah', label: { en: 'Al Rajhi — Mudarabah Account', ar: 'الراجحي — حساب المضاربة' } },
  { value: 'al_rajhi_current', label: { en: 'Al Rajhi — Current Account', ar: 'الراجحي — الحساب الجاري' } },
  { value: 'snb_saver', label: { en: 'SNB — Savings Account', ar: 'البنك الأهلي — حساب التوفير' } },
  { value: 'snb_almujdy', label: { en: 'SNB — Al Mujdy Account', ar: 'البنك الأهلي — حساب المجدي' } },
  { value: 'riyad_hassad', label: { en: 'Riyad Bank — Hassad Account', ar: 'بنك الرياض — حساب الحصاد' } },
  { value: 'riyad_savings', label: { en: 'Riyad Bank — Savings Account', ar: 'بنك الرياض — حساب التوفير' } },
  { value: 'albilad_wefak', label: { en: 'Al Bilad — Wefak Account', ar: 'بنك البلاد — حساب وفاق' } },
  { value: 'albilad_savings', label: { en: 'Al Bilad — Savings Account', ar: 'بنك البلاد — حساب التوفير' } },
  { value: 'alinma_savings', label: { en: 'Alinma Bank — Savings Account', ar: 'بنك الإنماء — حساب التوفير' } },
  { value: 'alinma_tawfeer', label: { en: 'Alinma Bank — Tawfeer Account', ar: 'بنك الإنماء — حساب توفير' } },
  { value: 'samba_savings', label: { en: 'Samba — Savings Account', ar: 'سامبا — حساب التوفير' } },
  { value: 'anb_savings', label: { en: 'ANB — Savings Account', ar: 'البنك العربي الوطني — حساب التوفير' } },
  { value: 'saib_savings', label: { en: 'SAIB — Savings Account', ar: 'البنك السعودي للاستثمار — حساب التوفير' } },
  { value: 'adcb_active_saver', label: { en: 'ADCB — Active Saver', ar: 'أبوظبي التجاري — حساب التوفير' } },
  { value: 'fab_savings', label: { en: 'FAB — Savings Account', ar: 'بنك أبوظبي الأول — حساب التوفير' } },
  { value: 'emirates_nbd_savings', label: { en: 'Emirates NBD — Savings Account', ar: 'الإمارات NBD — حساب التوفير' } },
  { value: 'mashreq_savings', label: { en: 'Mashreq — Savings Account', ar: 'مصرف المشرق — حساب التوفير' } },
  { value: 'qnb_savings', label: { en: 'QNB — Savings Account', ar: 'بنك قطر الوطني — حساب التوفير' } },
  { value: 'qatar_islamic_savings', label: { en: 'Qatar Islamic Bank — Savings', ar: 'بنك قطر الإسلامي — حساب التوفير' } },
  { value: 'nbk_savings', label: { en: 'NBK — Savings Account', ar: 'بنك الكويت الوطني — حساب التوفير' } },
  { value: 'kfh_savings', label: { en: 'KFH — Savings Account', ar: 'بيت التمويل الكويتي — حساب التوفير' } },
  { value: 'ahli_bahrain_savings', label: { en: 'Ahli United — Savings Account', ar: 'الأهلي المتحد — حساب التوفير' } },
  { value: 'arab_bank_savings', label: { en: 'Arab Bank — Savings Account', ar: 'البنك العربي — حساب التوفير' } },
  { value: 'cairo_amman_savings', label: { en: 'Cairo Amman Bank — Savings', ar: 'بنك القاهرة عمان — حساب التوفير' } },
  { value: 'nbe_savings', label: { en: 'NBE — Savings Account', ar: 'البنك الأهلي المصري — حساب التوفير' } },
  { value: 'cib_savings', label: { en: 'CIB — Savings Account', ar: 'البنك التجاري الدولي — حساب التوفير' } },
  { value: 'qnb_egypt_savings', label: { en: 'QNB Egypt — Savings Account', ar: 'QNB مصر — حساب التوفير' } },
  { value: 'banque_misr_savings', label: { en: 'Banque Misr — Savings', ar: 'بنك مصر — حساب التوفير' } },
  { value: 'term_deposit', label: { en: 'Term Deposit (Generic)', ar: 'وديعة لأجل (عام)' } },
  { value: 'other_savings', label: { en: 'Other / Custom', ar: 'حساب آخر / مخصص' } },
];

const GULF_BANKS: BankOption[] = [
  { value: 'Al Rajhi Bank', label: { en: 'Al Rajhi Bank', ar: 'مصرف الراجحي' }, country: 'SA' },
  { value: 'Saudi National Bank (SNB)', label: { en: 'Saudi National Bank (SNB)', ar: 'البنك الأهلي السعودي (SNB)' }, country: 'SA' },
  { value: 'Riyad Bank', label: { en: 'Riyad Bank', ar: 'بنك الرياض' }, country: 'SA' },
  { value: 'Bank AlBilad', label: { en: 'Bank AlBilad', ar: 'بنك البلاد' }, country: 'SA' },
  { value: 'Alinma Bank', label: { en: 'Alinma Bank', ar: 'بنك الإنماء' }, country: 'SA' },
  { value: 'Arab National Bank (ANB)', label: { en: 'Arab National Bank (ANB)', ar: 'البنك العربي الوطني' }, country: 'SA' },
  { value: 'Banque Saudi Fransi', label: { en: 'Banque Saudi Fransi', ar: 'البنك السعودي الفرنسي' }, country: 'SA' },
  { value: 'SAMBA Financial Group', label: { en: 'SAMBA Financial Group', ar: 'مجموعة سامبا المالية' }, country: 'SA' },
  { value: 'Saudi Investment Bank (SAIB)', label: { en: 'Saudi Investment Bank (SAIB)', ar: 'البنك السعودي للاستثمار' }, country: 'SA' },
  { value: 'Gulf International Bank (GIB)', label: { en: 'Gulf International Bank (GIB)', ar: 'بنك الخليج الدولي' }, country: 'SA' },
  { value: 'Emirates NBD', label: { en: 'Emirates NBD', ar: 'الإمارات NBD' }, country: 'AE' },
  { value: 'Abu Dhabi Commercial Bank (ADCB)', label: { en: 'Abu Dhabi Commercial Bank (ADCB)', ar: 'بنك أبوظبي التجاري' }, country: 'AE' },
  { value: 'First Abu Dhabi Bank (FAB)', label: { en: 'First Abu Dhabi Bank (FAB)', ar: 'بنك أبوظبي الأول' }, country: 'AE' },
  { value: 'Dubai Islamic Bank (DIB)', label: { en: 'Dubai Islamic Bank (DIB)', ar: 'بنك دبي الإسلامي' }, country: 'AE' },
  { value: 'Mashreq Bank', label: { en: 'Mashreq Bank', ar: 'مصرف المشرق' }, country: 'AE' },
  { value: 'ENBD Bank', label: { en: 'ENBD Bank', ar: 'بنك الإمارات دبي الوطني' }, country: 'AE' },
  { value: 'Qatar National Bank (QNB)', label: { en: 'Qatar National Bank (QNB)', ar: 'بنك قطر الوطني' }, country: 'QA' },
  { value: 'Qatar Islamic Bank (QIB)', label: { en: 'Qatar Islamic Bank (QIB)', ar: 'بنك قطر الإسلامي' }, country: 'QA' },
  { value: 'Commercial Bank of Qatar', label: { en: 'Commercial Bank of Qatar', ar: 'البنك التجاري القطري' }, country: 'QA' },
  { value: 'National Bank of Kuwait (NBK)', label: { en: 'National Bank of Kuwait (NBK)', ar: 'بنك الكويت الوطني' }, country: 'KW' },
  { value: 'Kuwait Finance House (KFH)', label: { en: 'Kuwait Finance House (KFH)', ar: 'بيت التمويل الكويتي' }, country: 'KW' },
  { value: 'Gulf Bank Kuwait', label: { en: 'Gulf Bank Kuwait', ar: 'بنك الخليج - الكويت' }, country: 'KW' },
  { value: 'Ahli United Bank (Bahrain)', label: { en: 'Ahli United Bank (Bahrain)', ar: 'بنك الأهلي المتحد - البحرين' }, country: 'BH' },
  { value: 'Bank of Bahrain and Kuwait (BBK)', label: { en: 'BBK — Bank of Bahrain and Kuwait', ar: 'بنك البحرين والكويت' }, country: 'BH' },
  { value: 'Bank Muscat', label: { en: 'Bank Muscat', ar: 'بنك مسقط' }, country: 'OM' },
  { value: 'National Bank of Oman (NBO)', label: { en: 'National Bank of Oman (NBO)', ar: 'البنك الوطني العماني' }, country: 'OM' },
  { value: 'Arab Bank (Jordan)', label: { en: 'Arab Bank (Jordan)', ar: 'البنك العربي - الأردن' }, country: 'JO' },
  { value: 'Cairo Amman Bank', label: { en: 'Cairo Amman Bank', ar: 'بنك القاهرة عمان' }, country: 'JO' },
  { value: 'Jordan Ahli Bank', label: { en: 'Jordan Ahli Bank', ar: 'البنك الأهلي الأردني' }, country: 'JO' },
  { value: 'National Bank of Egypt (NBE)', label: { en: 'National Bank of Egypt (NBE)', ar: 'البنك الأهلي المصري' }, country: 'EG' },
  { value: 'Banque Misr', label: { en: 'Banque Misr', ar: 'بنك مصر' }, country: 'EG' },
  { value: 'Commercial International Bank (CIB)', label: { en: 'Commercial International Bank (CIB)', ar: 'البنك التجاري الدولي - CIB' }, country: 'EG' },
  { value: 'QNB Egypt', label: { en: 'QNB Egypt', ar: 'QNB مصر' }, country: 'EG' },
  { value: 'HSBC Egypt', label: { en: 'HSBC Egypt', ar: 'HSBC مصر' }, country: 'EG' },
  { value: 'Arab African International Bank (AAIB)', label: { en: 'AAIB — Arab African International Bank', ar: 'البنك العربي الأفريقي الدولي' }, country: 'EG' },
  { value: 'Other', label: { en: 'Other / Custom Bank', ar: 'بنك آخر / مخصص' }, country: '' },
];

const BANK_GROUP_LABELS: Record<string, string> = {
  SA: '🇸🇦 السعودية',
  AE: '🇦🇪 الإمارات',
  QA: '🇶🇦 قطر',
  KW: '🇰🇼 الكويت',
  BH: '🇧🇭 البحرين',
  OM: '🇴🇲 عُمان',
  JO: '🇯🇴 الأردن',
  EG: '🇪🇬 مصر',
};

const budgetToExpenseCategory: Record<string, ExpenseEntry['category']> = {
  housing: 'Housing',
  food: 'Food',
  transport: 'Transport',
  entertainment: 'Entertainment',
  investment: 'Other',
  zakat: 'Other',
  healthcare: 'Healthcare',
  education: 'Education',
  utilities: 'Utilities',
  household_allowance: 'Household',
  other: 'Other',
};

const categoryColors: Record<string, string> = {
  housing: '#D4A843',
  food: '#10B981',
  transport: '#3B82F6',
  entertainment: '#8B5CF6',
  investment: '#06B6D4',
  zakat: '#EC4899',
  healthcare: '#F43F5E',
  education: '#14B8A6',
  utilities: '#F59E0B',
  household_allowance: '#0EA5E9',
  other: '#6B7280',
};

const categoryLabels: Record<string, { en: string; ar: string }> = {
  housing: { en: 'Housing', ar: 'السكن' },
  food: { en: 'Food', ar: 'الطعام' },
  transport: { en: 'Transport', ar: 'المواصلات' },
  entertainment: { en: 'Entertainment', ar: 'الترفيه' },
  investment: { en: 'Investment', ar: 'الاستثمار' },
  zakat: { en: 'Zakat & Charity', ar: 'الزكاة والصدقات' },
  healthcare: { en: 'Healthcare', ar: 'الرعاية الصحية' },
  education: { en: 'Education', ar: 'التعليم' },
  utilities: { en: 'Utilities', ar: 'الفواتير' },
  household_allowance: { en: 'Household Allowance', ar: 'المصروف المنزلي' },
  other: { en: 'Other', ar: 'أخرى' },
};

const categoryIcons = {
  housing: Home,
  food: Utensils,
  transport: Landmark,
  entertainment: ChevronRight,
  investment: TrendingUp,
  zakat: PiggyBank,
  healthcare: AlertCircle,
  education: Target,
  utilities: RefreshCw,
  household_allowance: ShoppingBag,
  other: MoreHorizontal,
} satisfies Record<string, ComponentType<{ className?: string }>>;

const obligationFrequencyLabels: Record<RecurringFrequency, { en: string; ar: string }> = {
  monthly: { en: 'Monthly', ar: 'شهري' },
  quarterly: { en: 'Quarterly', ar: 'ربع سنوي' },
  semi_annual: { en: 'Every 6 months', ar: 'كل 6 أشهر' },
  annual: { en: 'Yearly', ar: 'سنوي' },
  one_time: { en: 'One-time', ar: 'مرة واحدة' },
  custom: { en: 'Custom', ar: 'مخصص' },
};

const defaultObligationForm = {
  title: '',
  category: 'household_allowance',
  amount: '',
  currency: 'SAR',
  dueDay: '1',
  startDate: new Date().toISOString().slice(0, 10),
  endDate: '',
  frequency: 'monthly' as RecurringFrequency,
  customIntervalMonths: '',
  notes: '',
};

const defaultOneTimeExpenseForm = {
  title: '',
  category: 'other',
  amount: '',
  dueDate: new Date().toISOString().slice(0, 10),
  priority: 'medium' as OneTimeExpense['priority'],
  fundingSource: '',
  notes: '',
};

const defaultSavingsAccountForm = {
  name: '',
  type: 'awaeed' as SavingsAccount['type'],
  provider: 'Al Rajhi',
  principal: '',
  currentBalance: '',
  annualProfitRate: '4.5',
  termMonths: '6',
  openedAt: new Date().toISOString().slice(0, 10),
  maturityDate: new Date(new Date().getFullYear(), new Date().getMonth() + 6, 1).toISOString().slice(0, 10),
  purposeLabel: '',
  profitPayoutMethod: 'at_maturity' as SavingsAccount['profitPayoutMethod'],
  notes: '',
};

const sectionOrder = ['digest', 'budget', 'obligations', 'forecast'] as const;
type BudgetPlanningSection = typeof sectionOrder[number];

function categoryLabel(category: string, isArabic: boolean) {
  return isArabic ? categoryLabels[category]?.ar ?? category : categoryLabels[category]?.en ?? category;
}

function cardDirectionProps(isArabic: boolean) {
  return {
    dir: isArabic ? 'rtl' as const : 'ltr' as const,
    className: isArabic ? 'text-right' : '',
  };
}

function normalizeSearchValue(value: string) {
  return value.trim().toLocaleLowerCase();
}

function getLocalizedOptionLabel(option: SavingsOption, isArabic: boolean) {
  return isArabic ? option.label.ar : option.label.en;
}

function SuggestionCombobox<TOption extends SavingsOption>({
  isArabic,
  value,
  searchValue,
  open,
  options,
  placeholder,
  emptyText,
  suggestionValue,
  groupedOptions,
  onOpenChange,
  onSearchValueChange,
  onSelectOption,
  onSuggestValue,
  renderItemMeta,
}: SuggestionComboboxProps<TOption>) {
  const localizedPlaceholder = isArabic ? placeholder.ar : placeholder.en;
  const displayValue = value.trim() || localizedPlaceholder;

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          dir={isArabic ? 'rtl' : 'ltr'}
          className={cn(
            'w-full justify-between overflow-hidden',
            !value.trim() && 'text-muted-foreground'
          )}
        >
          <span className="truncate">{displayValue}</span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent dir={isArabic ? 'rtl' : 'ltr'} className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command dir={isArabic ? 'rtl' : 'ltr'} shouldFilter={false}>
          <CommandInput
            dir={isArabic ? 'rtl' : 'ltr'}
            value={searchValue}
            onValueChange={onSearchValueChange}
            placeholder={localizedPlaceholder}
          />
          <CommandList>
            {groupedOptions ? (
              groupedOptions.map((group) => (
                <CommandGroup key={group.heading} heading={group.heading}>
                  {group.items.map((option) => (
                    <CommandItem
                      key={option.value}
                      value={`${option.label.en} ${option.label.ar} ${option.value}`}
                      onSelect={() => onSelectOption(option)}
                    >
                      <Check className={cn('h-4 w-4', value === option.value || value === getLocalizedOptionLabel(option, isArabic) ? 'opacity-100' : 'opacity-0')} />
                      <div className="flex min-w-0 flex-1 items-center justify-between gap-2" dir={isArabic ? 'rtl' : 'ltr'}>
                        <span className="truncate">{getLocalizedOptionLabel(option, isArabic)}</span>
                        {renderItemMeta?.(option)}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))
            ) : (
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={`${option.label.en} ${option.label.ar} ${option.value}`}
                    onSelect={() => onSelectOption(option)}
                  >
                    <Check className={cn('h-4 w-4', value === option.value || value === getLocalizedOptionLabel(option, isArabic) ? 'opacity-100' : 'opacity-0')} />
                    <div className="flex min-w-0 flex-1 items-center justify-between gap-2" dir={isArabic ? 'rtl' : 'ltr'}>
                      <span className="truncate">{getLocalizedOptionLabel(option, isArabic)}</span>
                      {renderItemMeta?.(option)}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {options.length === 0 && !suggestionValue ? (
              <CommandEmpty>{isArabic ? emptyText.ar : emptyText.en}</CommandEmpty>
            ) : null}
            {suggestionValue && onSuggestValue ? (
              <CommandGroup>
                <CommandItem value={suggestionValue} onSelect={() => onSuggestValue(suggestionValue)}>
                  <Plus className="h-4 w-4" />
                  <span className="truncate">
                    {isArabic ? `+ اقتراح: "${suggestionValue}"` : `+ Suggest: "${suggestionValue}"`}
                  </span>
                </CommandItem>
              </CommandGroup>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function CustomForecastTooltip({
  active,
  payload,
  isArabic,
  locale,
  forecastPeriods,
}: CustomForecastTooltipProps) {
  if (!active || !payload?.length) {
    return null;
  }

  const activePayload = payload[0] as ForecastTooltipPayload;
  const chartDatum = activePayload.payload;

  if (!chartDatum) {
    return null;
  }

  const value = Number(activePayload.value ?? 0);
  const monthPeriod = forecastPeriods.find((period) => period.month === chartDatum.monthKey);
  const topObligations =
    monthPeriod?.obligations
      .slice()
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3) ?? [];

  return (
    <div
      dir={isArabic ? 'rtl' : 'ltr'}
      className="min-w-[220px] rounded-xl border border-border bg-card p-3 text-sm shadow-lg"
    >
      <p className="font-medium">{chartDatum.fullLabel}</p>
      <p className="mt-1 font-semibold">{formatCurrency(value, 'SAR', locale)}</p>
      {activePayload.dataKey === 'obligations' ? (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            {isArabic ? 'أعلى 3 التزامات' : 'Top 3 obligations'}
          </p>
          {topObligations.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {isArabic ? 'لا توجد التزامات هذا الشهر' : 'No obligations this month'}
            </p>
          ) : (
            topObligations.map((item) => (
              <div
                key={item.id}
                dir={isArabic ? 'rtl' : 'ltr'}
                className="flex items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{item.title}</p>
                  <p className="text-muted-foreground">
                    {isArabic ? 'يوم الاستحقاق' : 'Due day'} {new Date(item.dueDate).getDate()}
                  </p>
                </div>
                <span className="shrink-0">{formatCurrency(item.amount, 'SAR', locale)}</span>
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

function ForecastItemsPopoverCell({
  isArabic,
  locale,
  amount,
  items,
}: {
  isArabic: boolean;
  locale: 'ar' | 'en';
  amount: number;
  items: Array<{ id: string; title: string; amount: number }>;
}) {
  const [open, setOpen] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCloseTimer = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const scheduleClose = () => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => setOpen(false), 120);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          dir={isArabic ? 'rtl' : 'ltr'}
          className="cursor-help border-b border-dashed border-muted-foreground/40 text-start font-medium"
          onMouseEnter={() => {
            clearCloseTimer();
            setOpen(true);
          }}
          onMouseLeave={scheduleClose}
          onFocus={() => {
            clearCloseTimer();
            setOpen(true);
          }}
          onBlur={scheduleClose}
          onClick={() => {
            clearCloseTimer();
            setOpen((current) => !current);
          }}
        >
          {formatCurrency(amount, 'SAR', locale)}
        </button>
      </PopoverTrigger>
      <PopoverContent
        dir={isArabic ? 'rtl' : 'ltr'}
        align="start"
        sideOffset={8}
        className="w-64 rounded-xl border border-border bg-popover p-3 text-xs shadow-lg"
        onMouseEnter={clearCloseTimer}
        onMouseLeave={scheduleClose}
      >
        <p className="mb-2 font-medium">
          {isArabic ? 'أبرز المصروفات والالتزامات' : 'Top Expenses & Obligations'}
        </p>
        {items.length === 0 ? (
          <p className="text-muted-foreground">{isArabic ? 'لا توجد بنود' : 'No items'}</p>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} dir={isArabic ? 'rtl' : 'ltr'} className="flex items-center justify-between gap-3">
                <span className="truncate">{item.title}</span>
                <span className="shrink-0">{formatCurrency(item.amount, 'SAR', locale)}</span>
              </div>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function BudgetPlanningPage({
  initialSnapshot,
}: {
  initialSnapshot?: DailyPlanningSnapshot | null;
}) {
  const locale = useAppStore((state) => state.locale);
  const incomeEntries = useAppStore((state) => state.incomeEntries);
  const expenseEntries = useAppStore((state) => state.expenseEntries);
  const portfolioHoldings = useAppStore((state) => state.portfolioHoldings);
  const assets = useAppStore((state) => state.assets);
  const liabilities = useAppStore((state) => state.liabilities);
  const budgetLimits = useAppStore((state) => state.budgetLimits);
  const recurringObligations = useAppStore((state) => state.recurringObligations) ?? [];
  const oneTimeExpenses = useAppStore((state) => state.oneTimeExpenses) ?? [];
  const savingsAccounts = useAppStore((state) => state.savingsAccounts) ?? [];
  const notificationPreferences = useAppStore((state) => state.notificationPreferences);
  const addExpenseEntry = useAppStore((state) => state.addExpenseEntry);
  const deleteExpenseEntry = useAppStore((state) => state.deleteExpenseEntry);
  const setBudgetLimits = useAppStore((state) => state.setBudgetLimits);
  const addRecurringObligation = useAppStore((state) => state.addRecurringObligation);
  const deleteRecurringObligation = useAppStore((state) => state.deleteRecurringObligation);
  const markObligationPaid = useAppStore((state) => state.markObligationPaid);
  const addOneTimeExpense = useAppStore((state) => state.addOneTimeExpense);
  const deleteOneTimeExpense = useAppStore((state) => state.deleteOneTimeExpense);
  const addSavingsAccount = useAppStore((state) => state.addSavingsAccount);
  const deleteSavingsAccount = useAppStore((state) => state.deleteSavingsAccount);
  const { isSignedIn, user } = useRuntimeUser();
  const searchParams = useSearchParams();
  const isArabic = locale === 'ar';
  const { snapshot } = useFinancialSnapshot();
  const defaultSection = searchParams.get('section');
  const initialSection = sectionOrder.includes(defaultSection as BudgetPlanningSection)
    ? (defaultSection as BudgetPlanningSection)
    : 'digest';

  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddObligation, setShowAddObligation] = useState(false);
  const [showAddOneTimeExpense, setShowAddOneTimeExpense] = useState(false);
  const [showAddSavingsAccount, setShowAddSavingsAccount] = useState(false);
  const [newExpense, setNewExpense] = useState({ category: 'food', description: '', amount: '' });
  const [obligationForm, setObligationForm] = useState(defaultObligationForm);
  const [oneTimeExpenseForm, setOneTimeExpenseForm] = useState(defaultOneTimeExpenseForm);
  const [savingsAccountForm, setSavingsAccountForm] = useState(defaultSavingsAccountForm);
  const [accountNameOpen, setAccountNameOpen] = useState(false);
  const [accountNameQuery, setAccountNameQuery] = useState('');
  const [providerOpen, setProviderOpen] = useState(false);
  const [providerQuery, setProviderQuery] = useState('');

  const totalIncome = incomeEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const totalExpenses = expenseEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;
  const monthlyIncome = useMemo(() => {
    return incomeEntries.reduce((sum, entry) => {
      if (!entry.isRecurring) {
        return sum;
      }

      switch (entry.frequency) {
        case 'weekly':
          return sum + (entry.amount * 52) / 12;
        case 'quarterly':
          return sum + entry.amount / 3;
        case 'yearly':
          return sum + entry.amount / 12;
        default:
          return sum + entry.amount;
      }
    }, 0);
  }, [incomeEntries]);

  const spendingByCategory = expenseEntries.reduce((acc, entry) => {
    const key = budgetToExpenseCategory[entry.category] ?? entry.category.toLowerCase();
    acc[key] = (acc[key] || 0) + entry.amount;
    return acc;
  }, {} as Record<string, number>);

  const chartBudget = budgetLimits.map((item) => ({
    category: item.category,
    budget: item.limit,
    actual: spendingByCategory[item.category] || 0,
    color: item.color || categoryColors[item.category] || '#6B7280',
  }));
  const visibleBudgetRows = useMemo(
    () => chartBudget.filter((item) => item.budget > 0 || item.actual > 0),
    [chartBudget]
  );

  const upcomingObligations = useMemo(
    () => getUpcomingOccurrences(recurringObligations, 90),
    [recurringObligations]
  );
  const actionableUpcomingObligations = useMemo(
    () => upcomingObligations.filter((item) => item.status !== 'paid'),
    [upcomingObligations]
  );
  const forecast12 = useMemo(() => buildForecast(recurringObligations, 12), [recurringObligations]);
  const summary3 = useMemo(() => buildForecastSummary(recurringObligations, 3, monthlyIncome), [monthlyIncome, recurringObligations]);
  const summary12 = useMemo(() => buildForecastSummary(recurringObligations, 12, monthlyIncome), [monthlyIncome, recurringObligations]);
  const configuredBudgetCategories = useMemo(
    () => budgetLimits.filter((item) => item.limit > 0).length,
    [budgetLimits]
  );
  const totalBudgetCapacity = useMemo(
    () => budgetLimits.reduce((sum, item) => sum + item.limit, 0),
    [budgetLimits]
  );
  const wealixContext = useMemo(
    () => buildWealixAIContextFromClientContext(user?.id ?? 'guest', {
      currency: 'SAR',
      holdings: portfolioHoldings,
      assets,
      liabilities,
      incomeEntries,
      expenseEntries,
      budgetLimits,
      recurringObligations,
      oneTimeExpenses,
      savingsAccounts,
    }),
    [user?.id, portfolioHoldings, assets, liabilities, incomeEntries, expenseEntries, budgetLimits, recurringObligations, oneTimeExpenses, savingsAccounts]
  );
  const financialBrainPersona = useMemo(
    () => buildFinancialPersonaFromClientContext(user?.id ?? 'guest', {
      currency: 'SAR',
      holdings: portfolioHoldings,
      assets,
      liabilities,
      incomeEntries,
      expenseEntries,
      budgetLimits,
      recurringObligations,
      oneTimeExpenses,
      savingsAccounts,
    }, wealixContext),
    [user?.id, portfolioHoldings, assets, liabilities, incomeEntries, expenseEntries, budgetLimits, recurringObligations, oneTimeExpenses, savingsAccounts, wealixContext]
  );
  const financialBrainInsightLines = useMemo(
    () => buildDashboardInsightLines(financialBrainPersona, wealixContext),
    [financialBrainPersona, wealixContext]
  );
  const financialBrainAlerts = useMemo(() => {
    const upgraded = buildBudgetCriticalAlerts(financialBrainPersona);
    if (upgraded.length > 0) {
      return upgraded;
    }
    return wealixContext.alerts.map((alert) => ({
      severity: alert.severity.toUpperCase() as 'INFO' | 'WARNING' | 'CRITICAL',
      category: alert.category.toUpperCase() as 'OBLIGATION' | 'CASH_FLOW' | 'BUFFER' | 'ONE-TIME',
      title: alert.title,
      detail: alert.description,
    }));
  }, [financialBrainPersona, wealixContext.alerts]);
  const unfundedOneTimeExpenses = useMemo(
    () => oneTimeExpenses.filter((item) => item.status !== 'paid'),
    [oneTimeExpenses]
  );

  const handleAddOneTimeExpense = () => {
    if (!isSignedIn) {
      requireAccount();
      return;
    }

    const amount = Number(oneTimeExpenseForm.amount);
    if (!oneTimeExpenseForm.title.trim() || !Number.isFinite(amount) || amount <= 0) {
      toast({
        title: isArabic ? 'بيانات غير مكتملة' : 'Incomplete details',
        description: isArabic ? 'أدخل الاسم والمبلغ وتاريخ الاستحقاق.' : 'Add a title, amount, and due date.',
        variant: 'destructive',
      });
      return;
    }

    addOneTimeExpense({
      id: createOpaqueId('one-time-expense'),
      title: oneTimeExpenseForm.title.trim(),
      amount,
      currency: 'SAR',
      dueDate: oneTimeExpenseForm.dueDate,
      category: oneTimeExpenseForm.category,
      priority: oneTimeExpenseForm.priority,
      fundingSource: oneTimeExpenseForm.fundingSource.trim() || null,
      notes: oneTimeExpenseForm.notes.trim() || null,
      status: 'planned',
    });
    setOneTimeExpenseForm(defaultOneTimeExpenseForm);
    setShowAddOneTimeExpense(false);
  };

  const submitSuggestion = async (
    endpoint: '/api/suggestions/savings-account-name' | '/api/suggestions/bank-name',
    payload: Record<string, unknown>
  ) => {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        return;
      }

      toast({
        title: isArabic
          ? 'تم إرسال الاقتراح للمراجعة، شكراً لمساهمتك 🙏'
          : 'Suggestion submitted for review — thank you 🙏',
      });
    } catch {
      // Suggestions are best-effort and should never block the form flow.
    }
  };

  const handleSelectSavingsAccountName = (option: SavingsOption) => {
    const translatedLabel = getLocalizedOptionLabel(option, isArabic);
    setSavingsAccountForm((current) => ({ ...current, name: translatedLabel }));
    setAccountNameQuery(translatedLabel);
    setAccountNameOpen(false);
  };

  const handleSuggestSavingsAccountName = (suggestedValue: string) => {
    const trimmed = suggestedValue.trim();
    if (!trimmed) {
      return;
    }

    setSavingsAccountForm((current) => ({ ...current, name: trimmed }));
    setAccountNameQuery(trimmed);
    setAccountNameOpen(false);
    void submitSuggestion('/api/suggestions/savings-account-name', {
      value: trimmed,
      locale: isArabic ? 'ar' : 'en',
    });
  };

  const handleSelectBankProvider = (option: BankOption) => {
    setSavingsAccountForm((current) => ({ ...current, provider: option.value }));
    setProviderQuery(option.value);
    setProviderOpen(false);
  };

  const handleSuggestBankProvider = (suggestedValue: string) => {
    const trimmed = suggestedValue.trim();
    if (!trimmed) {
      return;
    }

    setSavingsAccountForm((current) => ({ ...current, provider: trimmed }));
    setProviderQuery(trimmed);
    setProviderOpen(false);
    void submitSuggestion('/api/suggestions/bank-name', {
      value: trimmed,
      country: '',
    });
  };

  const handleAddSavingsAccount = () => {
    if (!isSignedIn) {
      requireAccount();
      return;
    }

    const principal = Number(savingsAccountForm.principal);
    const currentBalance = Number(savingsAccountForm.currentBalance || savingsAccountForm.principal);
    const annualProfitRate = Number(savingsAccountForm.annualProfitRate);
    const termMonths = Number(savingsAccountForm.termMonths);
    if (!savingsAccountForm.name.trim() || !Number.isFinite(principal) || principal <= 0 || !Number.isFinite(termMonths) || termMonths < 0) {
      toast({
        title: isArabic ? 'بيانات غير مكتملة' : 'Incomplete details',
        description: isArabic ? 'أدخل اسم الحساب والمبلغ ومدة الربط.' : 'Add the account name, amount, and term.',
        variant: 'destructive',
      });
      return;
    }

    addSavingsAccount({
      id: createOpaqueId('savings-account'),
      name: savingsAccountForm.name.trim(),
      type: savingsAccountForm.type,
      provider: savingsAccountForm.provider.trim() || 'Bank',
      principal,
      currentBalance: Number.isFinite(currentBalance) && currentBalance > 0 ? currentBalance : principal,
      annualProfitRate: Number.isFinite(annualProfitRate) ? annualProfitRate : 0,
      termMonths,
      openedAt: savingsAccountForm.openedAt,
      maturityDate: savingsAccountForm.maturityDate,
      purposeLabel: savingsAccountForm.purposeLabel.trim() || null,
      profitPayoutMethod: savingsAccountForm.profitPayoutMethod,
      status: 'active',
      autoRenew: false,
      zakatHandledByInstitution: savingsAccountForm.type === 'awaeed' || savingsAccountForm.type === 'mudarabah',
      notes: savingsAccountForm.notes.trim() || null,
    });
    setSavingsAccountForm(defaultSavingsAccountForm);
    setAccountNameQuery('');
    setProviderQuery('');
    setAccountNameOpen(false);
    setProviderOpen(false);
    setShowAddSavingsAccount(false);
  };

  const fallbackSnapshot = useMemo(
    () =>
      buildDailyPlanningSnapshot({
        locale,
        userId: user?.id ?? 'guest',
        notificationPreferences,
        incomeEntries,
        expenseEntries,
        budgetLimits,
        upcomingObligations,
      }),
    [budgetLimits, expenseEntries, incomeEntries, locale, notificationPreferences, upcomingObligations, user?.id]
  );
  const hasAiSnapshot = Boolean(initialSnapshot);
  const dailySnapshot = initialSnapshot ?? fallbackSnapshot;
  const completionChannels = [
    isArabic ? 'داخل التطبيق' : 'In-app',
    ...(notificationPreferences.whatsapp && notificationPreferences.planningUpdates
      ? ['WhatsApp']
      : []),
  ];

  const normalizedAccountNameQuery = normalizeSearchValue(accountNameQuery);
  const normalizedProviderQuery = normalizeSearchValue(providerQuery);
  const filteredSavingsAccountNames = useMemo(
    () =>
      SAVINGS_ACCOUNT_NAMES.filter((option) => {
        if (!normalizedAccountNameQuery) {
          return true;
        }

        const haystack = `${option.label.en} ${option.label.ar} ${option.value}`.toLocaleLowerCase();
        return haystack.includes(normalizedAccountNameQuery);
      }),
    [normalizedAccountNameQuery]
  );
  const accountNameSuggestionValue = useMemo(() => {
    if (!normalizedAccountNameQuery) {
      return null;
    }

    const hasExactMatch = SAVINGS_ACCOUNT_NAMES.some((option) =>
      [option.label.en, option.label.ar].some(
        (label) => normalizeSearchValue(label) === normalizedAccountNameQuery
      )
    );

    return hasExactMatch ? null : accountNameQuery.trim();
  }, [accountNameQuery, normalizedAccountNameQuery]);
  const filteredBanks = useMemo(
    () =>
      GULF_BANKS.filter((option) => {
        if (!normalizedProviderQuery) {
          return true;
        }

        const haystack = `${option.label.en} ${option.label.ar} ${option.value}`.toLocaleLowerCase();
        return haystack.includes(normalizedProviderQuery);
      }),
    [normalizedProviderQuery]
  );
  const groupedBankOptions = useMemo(() => {
    if (normalizedProviderQuery) {
      return null;
    }

    return Object.entries(BANK_GROUP_LABELS)
      .map(([country, heading]) => ({
        heading,
        items: GULF_BANKS.filter((bank) => bank.country === country),
      }))
      .filter((group) => group.items.length > 0);
  }, [normalizedProviderQuery]);
  const providerSuggestionValue = useMemo(() => {
    if (!normalizedProviderQuery) {
      return null;
    }

    const hasExactMatch = GULF_BANKS.some((option) =>
      [option.label.en, option.label.ar].some(
        (label) => normalizeSearchValue(label) === normalizedProviderQuery
      )
    );

    return hasExactMatch ? null : providerQuery.trim();
  }, [normalizedProviderQuery, providerQuery]);
  const forecastChartData = useMemo(
    () =>
      forecast12.map((period) => ({
        month: period.label.split(' ')[0],
        monthKey: period.month,
        fullLabel: period.label,
        obligations: period.totalAmount,
        income: monthlyIncome,
      })),
    [forecast12, monthlyIncome]
  );
  const monthlyRecurringTopItems = useMemo(() => {
    const monthMap = new Map<string, Array<{ id: string; title: string; amount: number }>>();

    snapshot.forecast.monthlyRows.forEach((period) => {
      const [year, month] = period.month.split('-').map(Number);
      const rangeStart = new Date(year, month - 1, 1);
      const rangeEnd = new Date(year, month, 0);
      const monthlyItems = recurringObligations
        .flatMap((obligation) =>
          getOccurrencesInRange(obligation, rangeStart, rangeEnd).map((occurrence) => ({
            id: `${obligation.id}-${occurrence.toISOString().slice(0, 10)}`,
            title: obligation.title,
            amount: obligation.amount,
          }))
        )
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 3);

      monthMap.set(period.month, monthlyItems);
    });

    return monthMap;
  }, [recurringObligations, snapshot.forecast.monthlyRows]);

  const requireAccount = () => {
    toast({
      title: isArabic ? 'يتطلب حساباً' : 'Account required',
      description: isArabic
        ? 'أنشئ حساباً لحفظ التعديلات وإرسال الإشعارات.'
        : 'Create an account to save changes and send notifications.',
    });
  };

  const handleAddExpense = () => {
    if (!isSignedIn) {
      requireAccount();
      return;
    }
    if (!newExpense.description || !newExpense.amount) {
      return;
    }

    addExpenseEntry({
      id: createOpaqueId('budget-expense'),
      category: budgetToExpenseCategory[newExpense.category] || 'Other',
      description: newExpense.description,
      amount: Number(newExpense.amount),
      currency: 'SAR',
      merchantName: null,
      date: new Date().toISOString().slice(0, 10),
      paymentMethod: 'Card',
      notes: null,
      receiptId: null,
    });
    setNewExpense({ category: 'food', description: '', amount: '' });
    setShowAddExpense(false);
  };

  const handleAddObligation = () => {
    if (!isSignedIn) {
      requireAccount();
      return;
    }
    if (!obligationForm.title || !obligationForm.amount) {
      return;
    }

    const obligation: RecurringObligation = {
      id: createOpaqueId('obligation'),
      title: obligationForm.title,
      category: obligationForm.category,
      amount: Number(obligationForm.amount),
      currency: obligationForm.currency,
      dueDay: Number(obligationForm.dueDay) || 1,
      startDate: obligationForm.startDate || new Date().toISOString().slice(0, 10),
      endDate: obligationForm.endDate || null,
      frequency: obligationForm.frequency,
      customIntervalMonths: obligationForm.frequency === 'custom' ? Number(obligationForm.customIntervalMonths) || 1 : null,
      notes: obligationForm.notes || null,
      status: 'upcoming',
    };

    addRecurringObligation(obligation);
    setObligationForm(defaultObligationForm);
    setShowAddObligation(false);
  };

  const updateBudgetLimit = (category: string, value: number) => {
    if (!isSignedIn) {
      requireAccount();
      return;
    }
    setBudgetLimits(
      budgetLimits.map((item) => (item.category === category ? { ...item, limit: value } : item))
    );
  };

  const notificationChannelSummary = notificationPreferences.whatsapp
    ? 'WhatsApp'
    : notificationPreferences.sms
      ? 'SMS'
      : notificationPreferences.push
        ? isArabic ? 'داخل التطبيق' : 'In-app'
        : 'Email';
  const cardProps = cardDirectionProps(isArabic);

  return (
    <DashboardShell>
      <div dir={isArabic ? 'rtl' : 'ltr'} className="space-y-6">
        <div className="flex flex-col gap-4 rounded-3xl border border-border/60 bg-gradient-to-br from-background via-background to-primary/5 p-6 shadow-card">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{isArabic ? 'تجربة موحدة' : 'Unified Experience'}</Badge>
                <Badge variant="outline">{isArabic ? 'موجز يومي ثابت' : 'Static Daily Digest'}</Badge>
                {!hasAiSnapshot && (
                  <Badge variant="secondary">{isArabic ? 'يعتمد على بياناتك الحالية' : 'Using your current data'}</Badge>
                )}
              </div>
              <h1 className="text-3xl font-bold">
                {isArabic ? 'الموازنة والتخطيط' : 'Budget & Planning'}
              </h1>
              <p className="max-w-3xl text-sm text-muted-foreground">
                {isArabic
                  ? 'صفحة واحدة تجمع الميزانية، الالتزامات، والتوقعات المستقبلية مع موجز يومي ذكي وتنبيهات مخصصة حسب تفضيلاتك.'
                  : 'One place for budget control, recurring obligations, forward planning, and a daily AI digest tailored to your notification preferences.'}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Dialog open={showAddExpense} onOpenChange={setShowAddExpense}>
                <DialogTrigger asChild>
                  <Button className="gap-2" disabled={!isSignedIn}>
                    <Plus className="h-4 w-4" />
                    {isArabic ? 'إضافة مصروف' : 'Add Expense'}
                  </Button>
                </DialogTrigger>
                <DialogContent dir={isArabic ? 'rtl' : 'ltr'}>
                  <DialogHeader>
                    <DialogTitle>{isArabic ? 'إضافة مصروف جديد' : 'Add New Expense'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label dir={isArabic ? 'rtl' : 'ltr'}>{isArabic ? 'الفئة' : 'Category'}</Label>
                      <Select dir={isArabic ? 'rtl' : 'ltr'} value={newExpense.category} onValueChange={(value) => setNewExpense((current) => ({ ...current, category: value }))}>
                        <SelectTrigger dir={isArabic ? 'rtl' : 'ltr'}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(categoryLabels).map(([key, label]) => (
                            <SelectItem key={key} value={key}>{isArabic ? label.ar : label.en}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label dir={isArabic ? 'rtl' : 'ltr'}>{isArabic ? 'الوصف' : 'Description'}</Label>
                      <Input dir={isArabic ? 'rtl' : 'ltr'} value={newExpense.description} onChange={(event) => setNewExpense((current) => ({ ...current, description: event.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label dir={isArabic ? 'rtl' : 'ltr'}>{isArabic ? 'المبلغ (SAR)' : 'Amount (SAR)'}</Label>
                      <Input dir={isArabic ? 'rtl' : 'ltr'} type="number" value={newExpense.amount} onChange={(event) => setNewExpense((current) => ({ ...current, amount: event.target.value }))} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowAddExpense(false)}>{isArabic ? 'إلغاء' : 'Cancel'}</Button>
                    <Button onClick={handleAddExpense}>{isArabic ? 'إضافة' : 'Add'}</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={showAddObligation} onOpenChange={setShowAddObligation}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2" onClick={(event) => {
                    if (!isSignedIn) {
                      event.preventDefault();
                      requireAccount();
                    }
                  }}>
                    <Calendar className="h-4 w-4" />
                    {isArabic ? 'إضافة التزام' : 'Add Obligation'}
                  </Button>
                </DialogTrigger>
                <DialogContent dir={isArabic ? 'rtl' : 'ltr'} className="max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{isArabic ? 'إضافة التزام متكرر' : 'Add Recurring Obligation'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label dir={isArabic ? 'rtl' : 'ltr'}>{isArabic ? 'العنوان' : 'Title'}</Label>
                      <Input dir={isArabic ? 'rtl' : 'ltr'} value={obligationForm.title} onChange={(event) => setObligationForm((current) => ({ ...current, title: event.target.value }))} />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label dir={isArabic ? 'rtl' : 'ltr'}>{isArabic ? 'الفئة' : 'Category'}</Label>
                        <Select dir={isArabic ? 'rtl' : 'ltr'} value={obligationForm.category} onValueChange={(value) => setObligationForm((current) => ({ ...current, category: value }))}>
                          <SelectTrigger dir={isArabic ? 'rtl' : 'ltr'}><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(categoryLabels).map(([key, label]) => (
                              <SelectItem key={key} value={key}>{isArabic ? label.ar : label.en}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label dir={isArabic ? 'rtl' : 'ltr'}>{isArabic ? 'التكرار' : 'Frequency'}</Label>
                        <Select dir={isArabic ? 'rtl' : 'ltr'} value={obligationForm.frequency} onValueChange={(value) => setObligationForm((current) => ({ ...current, frequency: value as RecurringFrequency }))}>
                          <SelectTrigger dir={isArabic ? 'rtl' : 'ltr'}><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(obligationFrequencyLabels).map(([key, label]) => (
                              <SelectItem key={key} value={key}>{isArabic ? label.ar : label.en}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label dir={isArabic ? 'rtl' : 'ltr'}>{isArabic ? 'المبلغ' : 'Amount'}</Label>
                        <Input dir={isArabic ? 'rtl' : 'ltr'} type="number" value={obligationForm.amount} onChange={(event) => setObligationForm((current) => ({ ...current, amount: event.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label dir={isArabic ? 'rtl' : 'ltr'}>{isArabic ? 'يوم الاستحقاق' : 'Due day'}</Label>
                        <Input dir={isArabic ? 'rtl' : 'ltr'} type="number" value={obligationForm.dueDay} onChange={(event) => setObligationForm((current) => ({ ...current, dueDay: event.target.value }))} />
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label dir={isArabic ? 'rtl' : 'ltr'}>{isArabic ? 'تاريخ البدء' : 'Start date'}</Label>
                        <Input dir={isArabic ? 'rtl' : 'ltr'} type="date" value={obligationForm.startDate} onChange={(event) => setObligationForm((current) => ({ ...current, startDate: event.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label dir={isArabic ? 'rtl' : 'ltr'}>{isArabic ? 'تاريخ الانتهاء' : 'End date'}</Label>
                        <Input dir={isArabic ? 'rtl' : 'ltr'} type="date" value={obligationForm.endDate} onChange={(event) => setObligationForm((current) => ({ ...current, endDate: event.target.value }))} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label dir={isArabic ? 'rtl' : 'ltr'}>{isArabic ? 'ملاحظات' : 'Notes'}</Label>
                      <Input dir={isArabic ? 'rtl' : 'ltr'} value={obligationForm.notes} onChange={(event) => setObligationForm((current) => ({ ...current, notes: event.target.value }))} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowAddObligation(false)}>{isArabic ? 'إلغاء' : 'Cancel'}</Button>
                    <Button onClick={handleAddObligation}>{isArabic ? 'إضافة' : 'Add'}</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={showAddOneTimeExpense} onOpenChange={setShowAddOneTimeExpense}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2" onClick={(event) => {
                    if (!isSignedIn) {
                      event.preventDefault();
                      requireAccount();
                    }
                  }}>
                    <AlertCircle className="h-4 w-4" />
                    {isArabic ? 'مصروف لمرة واحدة' : 'One-Time Expense'}
                  </Button>
                </DialogTrigger>
                <DialogContent dir={isArabic ? 'rtl' : 'ltr'}>
                  <DialogHeader>
                    <DialogTitle>{isArabic ? 'إضافة مصروف لمرة واحدة' : 'Add One-Time Expense'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label dir={isArabic ? 'rtl' : 'ltr'}>{isArabic ? 'العنوان' : 'Title'}</Label>
                      <Input dir={isArabic ? 'rtl' : 'ltr'} value={oneTimeExpenseForm.title} onChange={(event) => setOneTimeExpenseForm((current) => ({ ...current, title: event.target.value }))} />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label dir={isArabic ? 'rtl' : 'ltr'}>{isArabic ? 'المبلغ' : 'Amount'}</Label>
                        <Input dir={isArabic ? 'rtl' : 'ltr'} type="number" value={oneTimeExpenseForm.amount} onChange={(event) => setOneTimeExpenseForm((current) => ({ ...current, amount: event.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label dir={isArabic ? 'rtl' : 'ltr'}>{isArabic ? 'تاريخ الاستحقاق' : 'Due date'}</Label>
                        <Input dir={isArabic ? 'rtl' : 'ltr'} type="date" value={oneTimeExpenseForm.dueDate} onChange={(event) => setOneTimeExpenseForm((current) => ({ ...current, dueDate: event.target.value }))} />
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label dir={isArabic ? 'rtl' : 'ltr'}>{isArabic ? 'الفئة' : 'Category'}</Label>
                        <Select dir={isArabic ? 'rtl' : 'ltr'} value={oneTimeExpenseForm.category} onValueChange={(value) => setOneTimeExpenseForm((current) => ({ ...current, category: value }))}>
                          <SelectTrigger dir={isArabic ? 'rtl' : 'ltr'}><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(categoryLabels).map(([key, label]) => (
                              <SelectItem key={key} value={key}>{isArabic ? label.ar : label.en}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label dir={isArabic ? 'rtl' : 'ltr'}>{isArabic ? 'الأولوية' : 'Priority'}</Label>
                        <Select dir={isArabic ? 'rtl' : 'ltr'} value={oneTimeExpenseForm.priority} onValueChange={(value) => setOneTimeExpenseForm((current) => ({ ...current, priority: value as OneTimeExpense['priority'] }))}>
                          <SelectTrigger dir={isArabic ? 'rtl' : 'ltr'}><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="critical">{isArabic ? 'حرج' : 'Critical'}</SelectItem>
                            <SelectItem value="high">{isArabic ? 'عالٍ' : 'High'}</SelectItem>
                            <SelectItem value="medium">{isArabic ? 'متوسط' : 'Medium'}</SelectItem>
                            <SelectItem value="low">{isArabic ? 'منخفض' : 'Low'}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label dir={isArabic ? 'rtl' : 'ltr'}>{isArabic ? 'مصدر التمويل' : 'Funding source'}</Label>
                      <Input dir={isArabic ? 'rtl' : 'ltr'} value={oneTimeExpenseForm.fundingSource} onChange={(event) => setOneTimeExpenseForm((current) => ({ ...current, fundingSource: event.target.value }))} placeholder={isArabic ? 'مثال: الحساب الجاري أو عوائد' : 'Example: current account or Awaeed'} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowAddOneTimeExpense(false)}>{isArabic ? 'إلغاء' : 'Cancel'}</Button>
                    <Button onClick={handleAddOneTimeExpense}>{isArabic ? 'إضافة' : 'Add'}</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={showAddSavingsAccount} onOpenChange={setShowAddSavingsAccount}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2" onClick={(event) => {
                    if (!isSignedIn) {
                      event.preventDefault();
                      requireAccount();
                    }
                  }}>
                    <PiggyBank className="h-4 w-4" />
                    {isArabic ? 'حساب ادخار / عوائد' : 'Savings / Awaeed'}
                  </Button>
                </DialogTrigger>
                <DialogContent dir={isArabic ? 'rtl' : 'ltr'} className="max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{isArabic ? 'إضافة حساب ادخار أو عوائد' : 'Add Savings or Awaeed Account'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label dir={isArabic ? 'rtl' : 'ltr'}>{isArabic ? 'اسم الحساب' : 'Account Name'}</Label>
                      <SuggestionCombobox
                        isArabic={isArabic}
                        value={savingsAccountForm.name}
                        searchValue={accountNameQuery}
                        open={accountNameOpen}
                        options={filteredSavingsAccountNames}
                        placeholder={{
                          ar: 'ابحث أو اختر نوع الحساب...',
                          en: 'Search or choose account type...',
                        }}
                        emptyText={{
                          ar: 'لا توجد نتائج مطابقة',
                          en: 'No matching account types',
                        }}
                        suggestionValue={accountNameSuggestionValue}
                        onOpenChange={setAccountNameOpen}
                        onSearchValueChange={(nextValue) => {
                          setAccountNameQuery(nextValue);
                          setSavingsAccountForm((current) => ({ ...current, name: nextValue }));
                        }}
                        onSelectOption={handleSelectSavingsAccountName}
                        onSuggestValue={handleSuggestSavingsAccountName}
                      />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label dir={isArabic ? 'rtl' : 'ltr'}>{isArabic ? 'النوع' : 'Type'}</Label>
                        <Select dir={isArabic ? 'rtl' : 'ltr'} value={savingsAccountForm.type} onValueChange={(value) => setSavingsAccountForm((current) => ({ ...current, type: value as SavingsAccount['type'] }))}>
                          <SelectTrigger dir={isArabic ? 'rtl' : 'ltr'}><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="current">{isArabic ? 'جاري' : 'Current'}</SelectItem>
                            <SelectItem value="awaeed">Awaeed</SelectItem>
                            <SelectItem value="mudarabah">Mudarabah</SelectItem>
                            <SelectItem value="hassad">Hassad</SelectItem>
                            <SelectItem value="standard_savings">{isArabic ? 'ادخار عادي' : 'Standard Savings'}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label dir={isArabic ? 'rtl' : 'ltr'}>{isArabic ? 'البنك / المزود' : 'Bank / Provider'}</Label>
                        <SuggestionCombobox
                          isArabic={isArabic}
                          value={savingsAccountForm.provider}
                          searchValue={providerQuery}
                          open={providerOpen}
                          options={filteredBanks}
                          groupedOptions={groupedBankOptions ?? undefined}
                          placeholder={{
                            ar: 'ابحث عن البنك...',
                            en: 'Search for a bank...',
                          }}
                          emptyText={{
                            ar: 'لا توجد بنوك مطابقة',
                            en: 'No matching banks',
                          }}
                          suggestionValue={providerSuggestionValue}
                          onOpenChange={setProviderOpen}
                          onSearchValueChange={(nextValue) => {
                            setProviderQuery(nextValue);
                            setSavingsAccountForm((current) => ({ ...current, provider: nextValue }));
                          }}
                          onSelectOption={handleSelectBankProvider}
                          onSuggestValue={handleSuggestBankProvider}
                          renderItemMeta={(option) => (
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {(option as BankOption).country || ''}
                            </span>
                          )}
                        />
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label dir={isArabic ? 'rtl' : 'ltr'}>{isArabic ? 'الأصل / المبلغ' : 'Principal'}</Label>
                        <Input dir={isArabic ? 'rtl' : 'ltr'} type="number" value={savingsAccountForm.principal} onChange={(event) => setSavingsAccountForm((current) => ({ ...current, principal: event.target.value, currentBalance: current.currentBalance || event.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label dir={isArabic ? 'rtl' : 'ltr'}>{isArabic ? 'الرصيد الحالي' : 'Current balance'}</Label>
                        <Input dir={isArabic ? 'rtl' : 'ltr'} type="number" value={savingsAccountForm.currentBalance} onChange={(event) => setSavingsAccountForm((current) => ({ ...current, currentBalance: event.target.value }))} />
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label dir={isArabic ? 'rtl' : 'ltr'}>{isArabic ? 'معدل الربح السنوي %' : 'Annual profit rate %'}</Label>
                        <Input dir={isArabic ? 'rtl' : 'ltr'} type="number" value={savingsAccountForm.annualProfitRate} onChange={(event) => setSavingsAccountForm((current) => ({ ...current, annualProfitRate: event.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label dir={isArabic ? 'rtl' : 'ltr'}>{isArabic ? 'المدة بالأشهر' : 'Term months'}</Label>
                        <Input dir={isArabic ? 'rtl' : 'ltr'} type="number" value={savingsAccountForm.termMonths} onChange={(event) => setSavingsAccountForm((current) => ({ ...current, termMonths: event.target.value }))} />
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label dir={isArabic ? 'rtl' : 'ltr'}>{isArabic ? 'تاريخ الفتح' : 'Opened at'}</Label>
                        <Input dir={isArabic ? 'rtl' : 'ltr'} type="date" value={savingsAccountForm.openedAt} onChange={(event) => setSavingsAccountForm((current) => ({ ...current, openedAt: event.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label dir={isArabic ? 'rtl' : 'ltr'}>{isArabic ? 'تاريخ الاستحقاق' : 'Maturity date'}</Label>
                        <Input dir={isArabic ? 'rtl' : 'ltr'} type="date" value={savingsAccountForm.maturityDate} onChange={(event) => setSavingsAccountForm((current) => ({ ...current, maturityDate: event.target.value }))} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label dir={isArabic ? 'rtl' : 'ltr'}>{isArabic ? 'الغرض' : 'Purpose'}</Label>
                      <Input dir={isArabic ? 'rtl' : 'ltr'} value={savingsAccountForm.purposeLabel} onChange={(event) => setSavingsAccountForm((current) => ({ ...current, purposeLabel: event.target.value }))} placeholder={isArabic ? 'مثال: تجديد الإقامة' : 'Example: Iqama renewal'} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowAddSavingsAccount(false)}>{isArabic ? 'إلغاء' : 'Cancel'}</Button>
                    <Button onClick={handleAddSavingsAccount}>{isArabic ? 'إضافة' : 'Add'}</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard title={isArabic ? 'صحة اليوم المالية' : 'Today’s Financial Health'} value={`${dailySnapshot.daily_headline.health_score_today}/100`} icon={Wallet} iconColor="text-primary bg-primary/10" />
          <StatCard title={isArabic ? 'الرصيد المتوقع' : 'Projected Month-End'} value={formatCurrency(dailySnapshot.budget_status.projected_month_end_balance, 'SAR', locale)} icon={TrendingUp} iconColor="text-emerald-500 bg-emerald-500/10" />
          <StatCard title={isArabic ? 'التزامات 30 يوماً' : '30-Day Obligations'} value={formatCurrency(actionableUpcomingObligations.filter((item) => item.daysUntilDue <= 30).reduce((sum, item) => sum + item.amount, 0), 'SAR', locale)} icon={Calendar} iconColor="text-amber-500 bg-amber-500/10" />
          <StatCard title={isArabic ? 'معدل الادخار' : 'Savings Rate'} value={`${savingsRate.toFixed(1)}%`} icon={PiggyBank} iconColor="text-sky-500 bg-sky-500/10" />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card {...cardProps}><CardContent className={`p-5 ${isArabic ? 'text-right' : ''}`}><p className="text-sm text-muted-foreground">{isArabic ? 'مستوى المخاطر' : 'Risk Level'}</p><p className="mt-2 text-xl font-semibold">{wealixContext.riskLevel}</p></CardContent></Card>
          <Card {...cardProps}><CardContent className={`p-5 ${isArabic ? 'text-right' : ''}`}><p className="text-sm text-muted-foreground">{isArabic ? 'مصروفات لمرة واحدة' : 'One-Time Expenses'}</p><p className="mt-2 text-xl font-semibold">{formatCurrency(unfundedOneTimeExpenses.reduce((sum, item) => sum + item.amount, 0), 'SAR', locale)}</p></CardContent></Card>
          <Card {...cardProps}><CardContent className={`p-5 ${isArabic ? 'text-right' : ''}`}><p className="text-sm text-muted-foreground">{isArabic ? 'استحقاقات العوائد' : 'Savings Maturities'}</p><p className="mt-2 text-xl font-semibold">{savingsAccounts.filter((item) => item.status === 'active' && item.type !== 'current').length}</p></CardContent></Card>
        </div>

        <Tabs defaultValue={initialSection} className="space-y-6">
          <TabsList className="h-auto flex-wrap gap-2">
            <TabsTrigger value="digest">{isArabic ? 'الموجز اليومي' : 'Daily Digest'}</TabsTrigger>
            <TabsTrigger value="budget">{isArabic ? 'الميزانية والنشاط' : 'Budget & Activity'}</TabsTrigger>
            <TabsTrigger value="obligations">{isArabic ? 'الالتزامات' : 'Obligations'}</TabsTrigger>
            <TabsTrigger value="forecast">{isArabic ? 'التوقعات' : 'Forecast'}</TabsTrigger>
          </TabsList>

          <TabsContent value="digest" className="space-y-6">
            <div className="grid gap-6">
              <Card {...cardProps} className={`overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background ${cardProps.className}`}>
                <CardHeader className={isArabic ? 'text-right' : ''}>
                  <div dir={isArabic ? 'rtl' : 'ltr'} className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle>
                        {hasAiSnapshot
                          ? dailySnapshot.daily_headline.title
                          : (isArabic ? 'ملخص التخطيط اليومي' : 'Today’s planning summary')}
                      </CardTitle>
                      <CardDescription className="mt-2">
                        {hasAiSnapshot
                          ? dailySnapshot.daily_headline.subtitle
                          : isArabic
                            ? 'هذا العرض يستخدم الدخل والمصروفات والالتزامات المحفوظة حالياً حتى يصبح لديك موجز ذكي أحدث.'
                            : 'This view already uses your saved income, spending, budgets, and obligations while a newer AI digest is unavailable.'}
                      </CardDescription>
                    </div>
                    <Badge variant={!hasAiSnapshot ? 'secondary' : dailySnapshot.daily_headline.sentiment === 'alert' ? 'destructive' : 'outline'}>
                      {!hasAiSnapshot ? (isArabic ? 'جاهز' : 'Ready') : dailySnapshot.daily_headline.sentiment}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className={`grid gap-4 md:grid-cols-3 ${isArabic ? 'text-right' : ''}`}>
                  <div dir={isArabic ? 'rtl' : 'ltr'} className="rounded-2xl border bg-background/70 p-4">
                    {hasAiSnapshot ? (
                      <>
                        <p className="text-sm text-muted-foreground">{isArabic ? 'حالة الميزانية' : 'Budget Status'}</p>
                        <p className="mt-2 text-xl font-semibold">
                          {dailySnapshot.budget_status.overall_budget_health === 'on_track'
                            ? (isArabic ? 'ضمن المسار' : 'On track')
                            : dailySnapshot.budget_status.overall_budget_health === 'at_risk'
                              ? (isArabic ? 'تحتاج متابعة' : 'Needs attention')
                              : (isArabic ? 'متجاوزة' : 'Breached')}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-muted-foreground">{isArabic ? 'مصدر التخطيط' : 'Planning Source'}</p>
                        <p className="mt-2 text-xl font-semibold">{isArabic ? 'بياناتك الحالية' : 'Saved workspace data'}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {isArabic ? 'أضف أو حدّث البنود لرؤية صورة أدق لليوم.' : 'Add or update entries to sharpen today’s view.'}
                        </p>
                      </>
                    )}
                  </div>
                  <div dir={isArabic ? 'rtl' : 'ltr'} className="rounded-2xl border bg-background/70 p-4">
                    <p className="text-sm text-muted-foreground">{isArabic ? 'أيام متبقية' : 'Days Remaining'}</p>
                    <p className="mt-2 text-xl font-semibold">{dailySnapshot.budget_status.days_remaining}</p>
                  </div>
                  <div dir={isArabic ? 'rtl' : 'ltr'} className="rounded-2xl border bg-background/70 p-4">
                    <p className="text-sm text-muted-foreground">
                      {hasAiSnapshot
                        ? (isArabic ? 'قناة الإشعار الأساسية' : 'Primary Channel')
                        : (isArabic ? 'سيصلك عبر' : 'You will be notified via')}
                    </p>
                    <p className="mt-2 text-xl font-semibold">
                      {hasAiSnapshot ? notificationChannelSummary : completionChannels.join(' + ')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <Card {...cardProps}>
                <CardHeader className={isArabic ? 'text-right' : ''}>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-amber-500" />
                    {isArabic ? 'أولويات اليوم' : 'Today’s Priorities'}
                  </CardTitle>
                </CardHeader>
                <CardContent className={`space-y-3 ${isArabic ? 'text-right' : ''}`}>
                  {!hasAiSnapshot ? (
                    <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                      {isArabic
                        ? 'سيظهر هنا ملخص الأولويات بمجرد انتهاء التحليل الذكي لهذا اليوم.'
                        : 'Your top priorities will appear here as soon as today’s AI analysis finishes.'}
                    </div>
                  ) : dailySnapshot.tips.length === 0 ? (
                    <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                      {isArabic ? 'سيظهر هنا الموجز اليومي عند توفر بيانات أكثر.' : 'The daily digest will show richer guidance here as more data becomes available.'}
                    </div>
                  ) : (
                    dailySnapshot.tips.map((tip) => (
                      <div key={tip.tip_id} dir={isArabic ? 'rtl' : 'ltr'} className="rounded-2xl border p-4">
                        <div dir={isArabic ? 'rtl' : 'ltr'} className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold">{tip.title}</p>
                            <p className="mt-2 text-sm text-muted-foreground">{tip.body}</p>
                          </div>
                          <Badge variant={tip.is_positive ? 'outline' : 'secondary'}>P{tip.priority}</Badge>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <span>{tip.impact_label}</span>
                          <span>•</span>
                          <span>{tip.data_evidence}</span>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card {...cardProps}>
                <CardHeader className={isArabic ? 'text-right' : ''}>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-rose-500" />
                    {isArabic ? 'تنبيهات تتطلب إجراء' : 'Action Notifications'}
                  </CardTitle>
                </CardHeader>
                <CardContent className={`space-y-3 ${isArabic ? 'text-right' : ''}`}>
                  {!hasAiSnapshot ? (
                    <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                      {isArabic
                        ? `ستظهر هنا التنبيهات اليومية عند توفر شيء يحتاج انتباهك. التوصيل الحالي: داخل التطبيق${notificationPreferences.whatsapp && notificationPreferences.planningUpdates ? ' + واتساب' : ''}.`
                        : `Action alerts will appear here whenever something needs attention. Current delivery setup: in-app${notificationPreferences.whatsapp && notificationPreferences.planningUpdates ? ' + WhatsApp' : ''}.`}
                    </div>
                  ) : dailySnapshot.notifications.length === 0 ? (
                    <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                      {isArabic ? 'لا توجد إجراءات عاجلة خلال 72 ساعة.' : 'No urgent actions in the next 72 hours.'}
                    </div>
                  ) : (
                    dailySnapshot.notifications.map((item) => (
                      <div key={item.notification_id} dir={isArabic ? 'rtl' : 'ltr'} className="rounded-2xl border p-4">
                        <div dir={isArabic ? 'rtl' : 'ltr'} className="flex items-center justify-between gap-3">
                          <p className="font-semibold">{item.title}</p>
                          <Badge variant={item.urgency === 'critical' ? 'destructive' : 'outline'}>{item.urgency}</Badge>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="budget" className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <Card {...cardProps}>
                <CardHeader className={isArabic ? 'text-right' : ''}>
                  <CardTitle>{isArabic ? 'مؤشر الفئات' : 'Budget by Category'}</CardTitle>
                  <CardDescription>
                    {isArabic ? 'راقب كل فئة مقابل حدها الحالي وتأثيرها على نهاية الشهر.' : 'Track each category against its current limit and month-end pressure.'}
                  </CardDescription>
                </CardHeader>
                <CardContent className={`space-y-4 ${isArabic ? 'text-right' : ''}`}>
                  {visibleBudgetRows.length === 0 ? (
                    <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                      <p className="font-medium text-foreground">
                        {isArabic ? 'ابدأ بتحديد حدود الفئات.' : 'Start by setting category limits.'}
                      </p>
                      <p className="mt-2">
                        {isArabic ? 'بمجرد إدخال أي حد ستظهر هنا المقارنة بين الإنفاق الفعلي والحد الشهري لكل فئة.' : 'As soon as you add a limit, this section will compare actual spending against each monthly cap.'}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={() => setShowAddExpense(true)} disabled={!isSignedIn}>
                          <Plus className="me-2 h-4 w-4" />
                          {isArabic ? 'إضافة مصروف' : 'Add expense'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    visibleBudgetRows.map((item) => {
                      const percentage = item.budget > 0 ? Math.min(100, (item.actual / item.budget) * 100) : 0;
                      const overBudget = item.actual > item.budget && item.budget > 0;
                      const Icon = categoryIcons[item.category] ?? MoreHorizontal;

                      return (
                        <div key={item.category} dir={isArabic ? 'rtl' : 'ltr'} className="rounded-2xl border p-4">
                          <div dir={isArabic ? 'rtl' : 'ltr'} className="flex items-center justify-between gap-3">
                            <div dir={isArabic ? 'rtl' : 'ltr'} className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-2xl" style={{ backgroundColor: `${item.color}18` }}>
                                <Icon className="h-4 w-4" style={{ color: item.color }} />
                              </div>
                              <div>
                                <p className="font-medium">{categoryLabel(item.category, isArabic)}</p>
                                <p className="text-sm text-muted-foreground">{formatCurrency(item.actual, 'SAR', locale)} / {formatCurrency(item.budget, 'SAR', locale)}</p>
                              </div>
                            </div>
                            <Badge variant={overBudget ? 'destructive' : 'outline'}>
                              {overBudget ? (isArabic ? 'متجاوزة' : 'Over') : `${percentage.toFixed(0)}%`}
                            </Badge>
                          </div>
                          <Progress value={percentage} className="mt-3" />
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>

              <Card {...cardProps}>
                <CardHeader className={isArabic ? 'text-right' : ''}>
                  <CardTitle>{isArabic ? 'إعداد الحدود' : 'Budget Setup'}</CardTitle>
                  <CardDescription>
                    {isArabic ? 'حدّث الحدود الشهرية هنا لتفعيل المقارنات والتنبيهات حسب الفئة.' : 'Update monthly limits here to power category comparisons and alerts.'}
                  </CardDescription>
                </CardHeader>
                <CardContent className={`space-y-4 ${isArabic ? 'text-right' : ''}`}>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border bg-background/70 p-4">
                      <p className="text-sm text-muted-foreground">{isArabic ? 'فئات مفعلة' : 'Active Categories'}</p>
                      <p className="mt-2 text-2xl font-semibold">{configuredBudgetCategories}/{budgetLimits.length}</p>
                    </div>
                    <div className="rounded-2xl border bg-background/70 p-4">
                      <p className="text-sm text-muted-foreground">{isArabic ? 'إجمالي الحدود' : 'Total Budgeted'}</p>
                      <p className="mt-2 text-2xl font-semibold">{formatCurrency(totalBudgetCapacity, 'SAR', locale)}</p>
                    </div>
                  </div>
                  {configuredBudgetCategories === 0 && (
                    <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
                      {isArabic
                        ? 'أدخل حدّاً شهرياً واحداً على الأقل لتبدأ قراءة الالتزام لكل فئة.'
                        : 'Enter at least one monthly limit to start reading category pacing and overages.'}
                    </div>
                  )}
                  {budgetLimits.map((item) => (
                    <div key={item.category} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>{categoryLabel(item.category, isArabic)}</Label>
                        <span className="text-xs text-muted-foreground">SAR</span>
                      </div>
                      <Input
                        type="number"
                        disabled={!isSignedIn}
                        value={item.limit}
                        onChange={(event) => updateBudgetLimit(item.category, Number(event.target.value) || 0)}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <Card {...cardProps}>
              <CardHeader className={isArabic ? 'text-right' : ''}>
                <CardTitle>{isArabic ? 'سجل المصروفات' : 'Expense Log'}</CardTitle>
              </CardHeader>
              <CardContent className={isArabic ? 'text-right' : ''}>
                {expenseEntries.length === 0 ? (
                  <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                    {isArabic ? 'لا توجد مصروفات حتى الآن.' : 'No expenses yet.'}
                  </div>
                ) : (
                  <ScrollArea className="h-96">
                    <div className="space-y-3">
                      {expenseEntries.map((expense) => (
                        <div key={expense.id} dir={isArabic ? 'rtl' : 'ltr'} className="flex items-center gap-4 rounded-2xl border p-4">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium">{expense.description}</p>
                            <p className="text-sm text-muted-foreground">{expense.date} • {categoryLabel(budgetToExpenseCategory[expense.category] ?? expense.category.toLowerCase(), isArabic)}</p>
                          </div>
                          <p className="font-semibold text-rose-500">-{formatCurrency(expense.amount, expense.currency, locale)}</p>
                          <Button variant="ghost" size="icon" disabled={!isSignedIn} onClick={() => deleteExpenseEntry(expense.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="obligations" className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              <Card {...cardProps}>
                <CardHeader className={isArabic ? 'text-right' : ''}>
                  <CardTitle>{isArabic ? 'الالتزامات القادمة' : 'Upcoming Obligations'}</CardTitle>
                  <CardDescription>{isArabic ? 'السلوك التنقلي أصبح أبسط: الإجراءات والدفعات في نفس الصفحة.' : 'Navigation is simpler now: actions and payment schedule live on the same page.'}</CardDescription>
                </CardHeader>
                <CardContent className={`space-y-3 ${isArabic ? 'text-right' : ''}`}>
                  {actionableUpcomingObligations.length === 0 ? (
                    <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                      {isArabic ? 'لا توجد التزامات خلال 90 يوماً.' : 'No obligations due in the next 90 days.'}
                    </div>
                  ) : (
                    actionableUpcomingObligations.slice(0, 10).map((item) => (
                      <div key={`${item.obligationId}-${item.dueDate}`} dir={isArabic ? 'rtl' : 'ltr'} className="flex items-center gap-3 rounded-2xl border p-4">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{item.title}</p>
                          <p className="text-sm text-muted-foreground">{item.dueDate} • {item.daysUntilDue <= 0 ? (isArabic ? 'اليوم' : 'Today') : `${item.daysUntilDue}d`}</p>
                        </div>
                        <Badge variant={item.daysUntilDue <= 7 ? 'destructive' : 'outline'}>
                          {item.daysUntilDue <= 7 ? (isArabic ? 'قريب' : 'Soon') : (isArabic ? 'قادم' : 'Upcoming')}
                        </Badge>
                        <p className="font-semibold">{formatCurrency(item.amount, item.currency, locale)}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!isSignedIn}
                          onClick={() => {
                            markObligationPaid(item.obligationId, item.dueDate);
                            toast({
                              title: isArabic ? 'تم تسجيل السداد' : 'Payment recorded',
                              description: isArabic
                                ? `تم تحديث ${item.title} كمدفوع وسيختفي من الالتزامات القادمة.`
                                : `${item.title} was marked as paid and removed from upcoming obligations.`,
                            });
                          }}
                        >
                          <CheckCircle className="me-2 h-4 w-4" />
                          {isArabic ? 'تم الدفع' : 'Mark Paid'}
                        </Button>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card {...cardProps}>
                <CardHeader className={isArabic ? 'text-right' : ''}>
                  <CardTitle>{isArabic ? 'كل الالتزامات' : 'Recurring Setup'}</CardTitle>
                </CardHeader>
                <CardContent className={`space-y-3 ${isArabic ? 'text-right' : ''}`}>
                  {recurringObligations.length === 0 ? (
                    <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                      {isArabic ? 'أضف الإيجار أو المدارس أو الرسوم الثابتة هنا.' : 'Add rent, school fees, and other recurring commitments here.'}
                    </div>
                  ) : (
                    recurringObligations.map((item) => (
                      <div key={item.id} dir={isArabic ? 'rtl' : 'ltr'} className="flex items-center gap-3 rounded-2xl border p-4" data-testid={`obligation-card-${item.id}`}>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{item.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {categoryLabel(item.category, isArabic)} • {isArabic ? obligationFrequencyLabels[item.frequency].ar : obligationFrequencyLabels[item.frequency].en}
                          </p>
                        </div>
                        <p className="font-semibold">{formatCurrency(item.amount, item.currency, locale)}</p>
                        <Button variant="ghost" size="icon" disabled={!isSignedIn} onClick={() => deleteRecurringObligation(item.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <Card {...cardProps}>
                <CardHeader className={isArabic ? 'text-right' : ''}>
                  <CardTitle>{isArabic ? 'المصروفات لمرة واحدة' : 'One-Time Expenses'}</CardTitle>
                  <CardDescription>{isArabic ? 'هذه البنود تدخل مباشرة في التوقع الشهري ولا يتم توزيعها على المتوسط.' : 'These expenses are injected into the forecast in their exact due month.'}</CardDescription>
                </CardHeader>
                <CardContent className={`space-y-3 ${isArabic ? 'text-right' : ''}`}>
                  {oneTimeExpenses.length === 0 ? (
                    <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                      {isArabic ? 'أضف رسوم سنوية أو مصروفاً كبيراً لمرة واحدة هنا.' : 'Add annual fees or other one-time obligations here.'}
                    </div>
                  ) : (
                    oneTimeExpenses.map((item) => (
                      <div key={item.id} dir={isArabic ? 'rtl' : 'ltr'} className="flex items-center gap-3 rounded-2xl border p-4">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{item.title}</p>
                          <p className="text-sm text-muted-foreground">{item.dueDate} • {item.priority}</p>
                        </div>
                        <p className="font-semibold">{formatCurrency(item.amount, item.currency, locale)}</p>
                        <Button variant="ghost" size="icon" disabled={!isSignedIn} onClick={() => deleteOneTimeExpense(item.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card {...cardProps}>
                <CardHeader className={isArabic ? 'text-right' : ''}>
                  <CardTitle>{isArabic ? 'الحسابات الادخارية والعوائد' : 'Savings & Awaeed Accounts'}</CardTitle>
                  <CardDescription>{isArabic ? 'استخدم حسابات الربح عند الاستحقاق للحاجات المرتبطة بموعد محدد.' : 'Use at-maturity profit accounts for time-bound obligations.'}</CardDescription>
                </CardHeader>
                <CardContent className={`space-y-3 ${isArabic ? 'text-right' : ''}`}>
                  {savingsAccounts.length === 0 ? (
                    <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                      {isArabic ? 'أضف الحساب الجاري أو حساب عوائد لربط التمويل بالالتزامات.' : 'Add your current account or Awaeed accounts here.'}
                    </div>
                  ) : (
                    savingsAccounts.map((account) => (
                      <div key={account.id} dir={isArabic ? 'rtl' : 'ltr'} className="rounded-2xl border p-4" data-testid={`savings-account-card-${account.id}`}>
                        <div dir={isArabic ? 'rtl' : 'ltr'} className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium">{account.name}</p>
                            <p className="text-sm text-muted-foreground">{account.provider} • {account.type}</p>
                          </div>
                          <Badge variant="outline">{account.profitPayoutMethod}</Badge>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
                          <span>{formatCurrency(account.currentBalance, 'SAR', locale)}</span>
                          <span>•</span>
                          <span>{account.annualProfitRate}%</span>
                          <span>•</span>
                          <span>{account.maturityDate}</span>
                        </div>
                        <div className="mt-3 flex justify-end">
                          <Button variant="ghost" size="icon" disabled={!isSignedIn} onClick={() => deleteSavingsAccount(account.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="forecast" className="space-y-6">
              <Card {...cardProps}>
                <CardHeader className={isArabic ? 'text-right' : ''}>
                  <CardTitle>{isArabic ? 'محرك Wealix المالي' : 'Wealix Financial Brain'}</CardTitle>
                  <CardDescription>{financialBrainInsightLines.join(' ')}</CardDescription>
                </CardHeader>
              <CardContent className={`space-y-3 ${isArabic ? 'text-right' : ''}`}>
                {financialBrainAlerts.slice(0, 4).map((alert) => (
                  <div key={`${alert.category}-${alert.title}`} className="rounded-2xl border p-4">
                    <div dir={isArabic ? 'rtl' : 'ltr'} className="flex items-center justify-between gap-3">
                      <p className="font-medium">{alert.title}</p>
                      <Badge variant={alert.severity === 'CRITICAL' ? 'destructive' : 'outline'}>{alert.severity}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{alert.detail}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-3">
              <Card {...cardProps}><CardContent className={`p-5 ${isArabic ? 'text-right' : ''}`}><p className="text-sm text-muted-foreground">{isArabic ? '3 أشهر' : 'Next 3 Months'}</p><p className="mt-2 text-2xl font-bold text-rose-500">-{formatCurrency(summary3.totalObligations, 'SAR', locale)}</p></CardContent></Card>
              <Card {...cardProps}><CardContent className={`p-5 ${isArabic ? 'text-right' : ''}`}><p className="text-sm text-muted-foreground">{isArabic ? '12 شهراً' : 'Next 12 Months'}</p><p className="mt-2 text-2xl font-bold text-rose-500">-{formatCurrency(summary12.totalObligations, 'SAR', locale)}</p></CardContent></Card>
              <Card {...cardProps}><CardContent className={`p-5 ${isArabic ? 'text-right' : ''}`}><p className="text-sm text-muted-foreground">{isArabic ? 'فائض متوقع' : 'Projected Surplus'}</p><p className={`mt-2 text-2xl font-bold ${summary12.projectedSurplus >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{summary12.projectedSurplus >= 0 ? '+' : ''}{formatCurrency(summary12.projectedSurplus, 'SAR', locale)}</p></CardContent></Card>
            </div>

            <Card {...cardProps}>
              <CardHeader className={isArabic ? 'text-right' : ''}>
                <CardTitle>{isArabic ? 'مقارنة الدخل والالتزامات' : 'Income vs Obligations Forecast'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={forecastChartData} accessibilityLayer>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis
                        dataKey="month"
                        stroke="var(--muted-foreground)"
                        tickMargin={isArabic ? 4 : 8}
                        padding={isArabic ? { left: 24, right: 8 } : { left: 8, right: 24 }}
                      />
                      <YAxis
                        stroke="var(--muted-foreground)"
                        tickFormatter={(value) => `${Math.round(value / 1000)}k`}
                        tick={{ textAnchor: isArabic ? 'start' : 'end' }}
                        tickMargin={isArabic ? 4 : 10}
                      />
                      <Tooltip
                        cursor={{ fill: 'transparent' }}
                        content={<CustomForecastTooltip isArabic={isArabic} locale={locale} forecastPeriods={forecast12} />}
                      />
                      <Bar dataKey="income" name={isArabic ? 'الدخل' : 'Income'} fill="var(--chart-2)" radius={[6, 6, 0, 0]} opacity={0.35} />
                      <Bar dataKey="obligations" name={isArabic ? 'الالتزامات' : 'Obligations'} fill="var(--chart-5)" radius={[6, 6, 0, 0]}>
                        {forecastChartData.map((entry) => (
                          <Cell key={entry.month} fill={entry.obligations > entry.income ? '#F43F5E' : '#D4A843'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card {...cardProps} data-testid="planning-forecast-table">
              <CardHeader className={isArabic ? 'text-right' : ''}>
                <CardTitle>{isArabic ? 'تفصيل التوقع الشهري' : 'Monthly Forecast Detail'}</CardTitle>
                <CardDescription>
                  {isArabic
                    ? 'الدخل والمصروفات والالتزامات والعوائد الظاهرة هنا تأتي من نفس اللقطة المالية الموحدة.'
                    : 'Income, expenses, obligations, and maturities here come from the same unified financial snapshot.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {snapshot.forecast.monthlyRows.map((period) => (
                  <div
                    key={period.month}
                    dir={isArabic ? 'rtl' : 'ltr'}
                    className="grid gap-2 rounded-2xl border p-4 md:grid-cols-7"
                    data-testid={`planning-forecast-row-${period.month}`}
                  >
                    <div>
                      <p className="text-xs text-muted-foreground">{isArabic ? 'الشهر' : 'Month'}</p>
                      <p className="font-medium">{period.label}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{isArabic ? 'الدخل' : 'Income'}</p>
                      <p className="font-medium">{formatCurrency(period.income, 'SAR', locale)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{isArabic ? 'مصروفات متكررة' : 'Recurring Expenses'}</p>
                      <ForecastItemsPopoverCell
                        isArabic={isArabic}
                        locale={locale}
                        amount={period.recurringExpenses}
                        items={monthlyRecurringTopItems.get(period.month) ?? []}
                      />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{isArabic ? 'التزامات' : 'Obligations'}</p>
                      <ForecastItemsPopoverCell
                        isArabic={isArabic}
                        locale={locale}
                        amount={period.obligationPayments}
                        items={monthlyRecurringTopItems.get(period.month) ?? []}
                      />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{isArabic ? 'مرة واحدة' : 'One-Time'}</p>
                      <p className="font-medium">{formatCurrency(period.oneTimeExpenses, 'SAR', locale)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{isArabic ? 'استحقاق عوائد' : 'Maturity Inflow'}</p>
                      <p className="font-medium">{formatCurrency(period.maturityInflows, 'SAR', locale)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{isArabic ? 'الرصيد الختامي' : 'Closing Balance'}</p>
                      <p className={`font-medium ${period.closingBalance >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {formatCurrency(period.closingBalance, 'SAR', locale)}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardShell>
  );
}
