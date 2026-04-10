'use client';

import { CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { useFinancialSettingsStore } from '@/store/useFinancialSettingsStore';

export function FinancialSettingsSyncBadge({
  isArabic,
  className = '',
}: {
  isArabic: boolean;
  className?: string;
}) {
  const syncStatus = useFinancialSettingsStore((state) => state.syncStatus);
  const error = useFinancialSettingsStore((state) => state.error);

  if (syncStatus === 'syncing') {
    return (
      <span className={`inline-flex items-center gap-2 text-xs text-muted-foreground ${className}`}>
        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
        {isArabic ? 'جارٍ المزامنة...' : 'Syncing...'}
      </span>
    );
  }

  if (syncStatus === 'error' && error) {
    return (
      <span className={`inline-flex items-center gap-2 text-xs text-destructive ${className}`}>
        <AlertCircle className="h-3.5 w-3.5" />
        {isArabic ? 'تعذر الحفظ' : 'Save failed'}
      </span>
    );
  }

  if (syncStatus === 'saved') {
    return (
      <span className={`inline-flex items-center gap-2 text-xs text-emerald-600 ${className}`}>
        <CheckCircle2 className="h-3.5 w-3.5" />
        {isArabic ? 'تم الحفظ' : 'Saved'}
      </span>
    );
  }

  return null;
}
