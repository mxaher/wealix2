'use client';

import { useAppStore, formatCurrency as formatCurrencyUtil } from '@/store/useAppStore';
import { cn } from '@/lib/utils';

interface CurrencyDisplayProps {
  amount: number;
  currency?: string;
  showSign?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function CurrencyDisplay({
  amount,
  currency,
  showSign = false,
  size = 'md',
  className,
}: CurrencyDisplayProps) {
  const { locale, user } = useAppStore();
  const displayCurrency = currency || user?.currency || 'SAR';

  const formatted = formatCurrencyUtil(Math.abs(amount), displayCurrency, locale);

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg font-semibold',
    xl: 'text-2xl font-bold',
  };

  const isPositive = amount >= 0;

  return (
    <span
      className={cn(
        sizeClasses[size],
        showSign && !isPositive && 'text-rose-500',
        showSign && isPositive && 'text-emerald-500',
        className
      )}
    >
      {showSign && amount < 0 && '-'}
      {formatted}
    </span>
  );
}

// Quick format function for use outside components
export function formatCurrency(
  amount: number,
  currency: string = 'SAR',
  locale: 'ar' | 'en' = 'ar'
): string {
  return formatCurrencyUtil(amount, currency, locale);
}
