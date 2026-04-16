import type { RecurringObligation } from '@/store/useAppStore';

export type ForecastPeriod = {
  month: string; // 'YYYY-MM'
  label: string; // e.g. 'Apr 2026'
  obligations: Array<{
    id: string;
    title: string;
    category: string;
    amount: number;
    currency: string;
    dueDate: string; // 'YYYY-MM-DD'
    status: RecurringObligation['status'];
  }>;
  totalAmount: number;
};

export type UpcomingOccurrence = {
  obligationId: string;
  title: string;
  category: string;
  amount: number;
  currency: string;
  dueDate: string;
  daysUntilDue: number;
  status: RecurringObligation['status'];
};

export type ForecastSummary = {
  periodLabel: string;
  months: number;
  totalObligations: number;
  monthlyAverage: number;
  periods: ForecastPeriod[];
};

/**
 * Returns the number of months between two frequency steps.
 */
function frequencyToMonths(
  frequency: RecurringObligation['frequency'],
  customIntervalMonths?: number | null
): number {
  switch (frequency) {
    case 'monthly':
      return 1;
    case 'quarterly':
      return 3;
    case 'semi_annual':
      return 6;
    case 'annual':
      return 12;
    case 'one_time':
      return 0; // no recurrence
    case 'custom':
      return customIntervalMonths && customIntervalMonths > 0 ? customIntervalMonths : 1;
    default:
      return 1;
  }
}

/**
 * Get next due date on or after `fromDate` for a recurring obligation.
 * Returns null if obligation has ended or is one-time and already occurred.
 */
export function getNextDueDate(
  obligation: RecurringObligation,
  fromDate: Date = new Date()
): Date | null {
  const start = new Date(obligation.startDate);
  const end = obligation.endDate ? new Date(obligation.endDate) : null;
  const from = new Date(fromDate);
  from.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);

  if (end) {
    end.setHours(0, 0, 0, 0);
    if (end < from) return null;
  }

  if (obligation.frequency === 'one_time') {
    // One-time obligations should respect the explicit ISO start date as the due date.
    const dueDate = new Date(start);
    dueDate.setHours(0, 0, 0, 0);
    if (dueDate >= from && (!end || dueDate <= end)) {
      return dueDate;
    }
    return null;
  }

  const intervalMonths = frequencyToMonths(obligation.frequency, obligation.customIntervalMonths);
  if (intervalMonths === 0) return null;

  // First occurrence: in start month on dueDay
  let candidate = new Date(start.getFullYear(), start.getMonth(), obligation.dueDay);
  candidate.setHours(0, 0, 0, 0);

  // If candidate is before start, move forward one interval
  if (candidate < start) {
    candidate = new Date(candidate.getFullYear(), candidate.getMonth() + intervalMonths, obligation.dueDay);
    candidate.setHours(0, 0, 0, 0);
  }

  // Advance until candidate >= from
  while (candidate < from) {
    candidate = new Date(candidate.getFullYear(), candidate.getMonth() + intervalMonths, obligation.dueDay);
    candidate.setHours(0, 0, 0, 0);
  }

  if (end && candidate > end) return null;

  return candidate;
}

/**
 * Get all occurrences of an obligation within a date range [rangeStart, rangeEnd].
 */
export function getOccurrencesInRange(
  obligation: RecurringObligation,
  rangeStart: Date,
  rangeEnd: Date
): Date[] {
  const start = new Date(obligation.startDate);
  const end = obligation.endDate ? new Date(obligation.endDate) : null;
  const occurrences: Date[] = [];

  start.setHours(0, 0, 0, 0);
  rangeStart = new Date(rangeStart);
  rangeStart.setHours(0, 0, 0, 0);
  rangeEnd = new Date(rangeEnd);
  rangeEnd.setHours(23, 59, 59, 999);

  if (end) {
    end.setHours(23, 59, 59, 999);
    if (end < rangeStart) return [];
  }

  if (obligation.frequency === 'one_time') {
    const dueDate = new Date(start);
    dueDate.setHours(0, 0, 0, 0);
    if (dueDate >= rangeStart && dueDate <= rangeEnd && (!end || dueDate <= end)) {
      occurrences.push(dueDate);
    }
    return occurrences;
  }

  const intervalMonths = frequencyToMonths(obligation.frequency, obligation.customIntervalMonths);
  if (intervalMonths === 0) return [];

  // First candidate: dueDay in start month
  let candidate = new Date(start.getFullYear(), start.getMonth(), obligation.dueDay);
  candidate.setHours(0, 0, 0, 0);

  // Align to start
  if (candidate < start) {
    candidate = new Date(candidate.getFullYear(), candidate.getMonth() + intervalMonths, obligation.dueDay);
    candidate.setHours(0, 0, 0, 0);
  }

  // Advance to range start
  while (candidate < rangeStart) {
    candidate = new Date(candidate.getFullYear(), candidate.getMonth() + intervalMonths, obligation.dueDay);
    candidate.setHours(0, 0, 0, 0);
  }

  // Collect until range end
  while (candidate <= rangeEnd) {
    if (!end || candidate <= end) {
      occurrences.push(new Date(candidate));
    }
    if (intervalMonths === 0) break;
    candidate = new Date(candidate.getFullYear(), candidate.getMonth() + intervalMonths, obligation.dueDay);
    candidate.setHours(0, 0, 0, 0);
  }

  return occurrences;
}

/**
 * Compute upcoming occurrences across all obligations, within the next `days` days.
 */
export function getUpcomingOccurrences(
  obligations: RecurringObligation[] | undefined | null,
  days = 90
): UpcomingOccurrence[] {
  if (!obligations?.length) return [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const rangeEnd = new Date(today);
  rangeEnd.setDate(rangeEnd.getDate() + days);

  const upcoming: UpcomingOccurrence[] = [];

  for (const obligation of obligations) {
    const dates = getOccurrencesInRange(obligation, today, rangeEnd);
    for (const date of dates) {
      const diffMs = date.getTime() - today.getTime();
      const daysUntilDue = Math.round(diffMs / (1000 * 60 * 60 * 24));
      const status = resolveOccurrenceStatus(obligation, date, daysUntilDue);

      upcoming.push({
        obligationId: obligation.id,
        title: obligation.title,
        category: obligation.category,
        amount: obligation.amount,
        currency: obligation.currency,
        dueDate: date.toISOString().slice(0, 10),
        daysUntilDue,
        status,
      });
    }
  }

  upcoming.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  return upcoming;
}

/**
 * Resolve the display status of an occurrence.
 */
function resolveOccurrenceStatus(
  obligation: RecurringObligation,
  dueDate: Date,
  daysUntilDue: number
): RecurringObligation['status'] {
  // If the obligation was marked paid and lastPaidDate matches this occurrence month
  if (obligation.status === 'paid' && obligation.lastPaidDate) {
    const lastPaid = new Date(obligation.lastPaidDate);
    if (
      lastPaid.getFullYear() === dueDate.getFullYear() &&
      lastPaid.getMonth() === dueDate.getMonth()
    ) {
      return 'paid';
    }
  }

  if (daysUntilDue < 0) return 'overdue';
  if (daysUntilDue <= 7) return 'due_soon';
  return 'upcoming';
}

/**
 * Build a monthly forecast for the next `months` months.
 */
export function buildForecast(
  obligations: RecurringObligation[] | undefined | null,
  months = 12
): ForecastPeriod[] {
  if (!obligations) obligations = [];
  const today = new Date();
  const periods: ForecastPeriod[] = [];

  for (let i = 0; i < months; i++) {
    const periodStart = new Date(today.getFullYear(), today.getMonth() + i, 1);
    const periodEnd = new Date(today.getFullYear(), today.getMonth() + i + 1, 0);

    const monthLabel = periodStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    const monthKey = periodStart.toISOString().slice(0, 7);

    const occurrencesForPeriod: ForecastPeriod['obligations'] = [];
    let totalAmount = 0;

    for (const obligation of obligations) {
      const dates = getOccurrencesInRange(obligation, periodStart, periodEnd);
      for (const date of dates) {
        const daysUntilDue = Math.round((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const status = resolveOccurrenceStatus(obligation, date, daysUntilDue);
        occurrencesForPeriod.push({
          id: `${obligation.id}-${date.toISOString().slice(0, 10)}`,
          title: obligation.title,
          category: obligation.category,
          amount: obligation.amount,
          currency: obligation.currency,
          dueDate: date.toISOString().slice(0, 10),
          status,
        });
        totalAmount += obligation.amount;
      }
    }

    occurrencesForPeriod.sort((a, b) => a.dueDate.localeCompare(b.dueDate));

    periods.push({
      month: monthKey,
      label: monthLabel,
      obligations: occurrencesForPeriod,
      totalAmount,
    });
  }

  return periods;
}

/**
 * Summarize forecast over a period window (3, 6, or 12 months).
 */
export function buildForecastSummary(
  obligations: RecurringObligation[] | undefined | null,
  windowMonths: 3 | 6 | 12,
  monthlyIncome: number
): {
  totalObligations: number;
  monthlyAverage: number;
  totalIncome: number;
  projectedSurplus: number;
  periods: ForecastPeriod[];
  heaviestMonth: ForecastPeriod | null;
} {
  const periods = buildForecast(obligations, windowMonths);
  const totalObligations = periods.reduce((sum, p) => sum + p.totalAmount, 0);
  const monthlyAverage = totalObligations / windowMonths;
  const totalIncome = monthlyIncome * windowMonths;
  const projectedSurplus = totalIncome - totalObligations;
  const heaviestMonth = periods.reduce(
    (max, p) => (p.totalAmount > (max?.totalAmount ?? 0) ? p : max),
    null as ForecastPeriod | null
  );

  return {
    totalObligations,
    monthlyAverage,
    totalIncome,
    projectedSurplus,
    periods,
    heaviestMonth,
  };
}

/**
 * Format a month string 'YYYY-MM' to a display label.
 */
export function formatMonthLabel(month: string, locale: 'en' | 'ar' = 'en'): string {
  const [year, m] = month.split('-').map(Number);
  const date = new Date(year, m - 1, 1);
  return date.toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', {
    month: 'short',
    year: 'numeric',
  });
}
