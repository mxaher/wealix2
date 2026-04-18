'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Bell,
  BellOff,
  Filter,
  X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { useAppStore } from '@/store/useAppStore';
import { useFinancialSnapshot } from '@/hooks/useFinancialSnapshot';
import { useRuntimeUser } from '@/hooks/useRuntimeUser';
import type { AlertSummary } from '@/lib/financial-snapshot';

type SeverityFilter = 'all' | 'critical' | 'warning' | 'info';
type CategoryFilter = 'all' | 'cash_flow' | 'obligation' | 'forecast' | 'fire' | 'liquidity';

const DEMO_ALERTS: AlertSummary[] = [
  { severity: 'critical', category: 'obligation', title: 'Obligation due in 3 days', description: 'Car loan payment of SAR 1,800 is due on April 21.' },
  { severity: 'warning', category: 'cash_flow', title: 'High expense month', description: 'Spending this month is 12% above your monthly average.' },
  { severity: 'warning', category: 'liquidity', title: 'Emergency fund below target', description: 'Current coverage is 4.2 months, target is 6 months.' },
  { severity: 'info', category: 'fire', title: 'FIRE progress update', description: 'You are 18% toward your FIRE number. Keep investing consistently.' },
  { severity: 'info', category: 'forecast', title: 'Positive 3-month forecast', description: 'Based on current data, your balance remains positive through July.' },
];

const DEMO_ALERTS_AR: AlertSummary[] = [
  { severity: 'critical', category: 'obligation', title: 'التزام مستحق خلال 3 أيام', description: 'دفعة قرض السيارة 1,800 ريال مستحقة في 21 أبريل.' },
  { severity: 'warning', category: 'cash_flow', title: 'مصروفات مرتفعة هذا الشهر', description: 'الإنفاق هذا الشهر أعلى بنسبة 12% من المتوسط الشهري.' },
  { severity: 'warning', category: 'liquidity', title: 'صندوق الطوارئ دون الهدف', description: 'التغطية الحالية 4.2 أشهر، الهدف 6 أشهر.' },
  { severity: 'info', category: 'fire', title: 'تحديث تقدم FIRE', description: 'أنت عند 18% من هدف الاستقلال المالي. واصل الاستثمار.' },
  { severity: 'info', category: 'forecast', title: 'توقعات إيجابية للأشهر الثلاثة القادمة', description: 'بناءً على البيانات الحالية، رصيدك يبقى إيجابياً حتى يوليو.' },
];

function SeverityIcon({ severity }: { severity: AlertSummary['severity'] }) {
  if (severity === 'critical') return <AlertTriangle className="h-4 w-4 text-rose-500" />;
  if (severity === 'warning') return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  return <Info className="h-4 w-4 text-sky-500" />;
}

function severityBadgeClass(severity: AlertSummary['severity']) {
  if (severity === 'critical') return 'border-rose-500/30 text-rose-500 bg-rose-500/5';
  if (severity === 'warning') return 'border-amber-500/30 text-amber-500 bg-amber-500/5';
  return 'border-sky-500/30 text-sky-500 bg-sky-500/5';
}

function cardBgClass(severity: AlertSummary['severity']) {
  if (severity === 'critical') return 'border-rose-500/20 bg-rose-500/5';
  if (severity === 'warning') return 'border-amber-500/20 bg-amber-500/5';
  return '';
}

function getAlertKey(alert: AlertSummary, index: number) {
  return `${alert.severity}|${alert.category}|${alert.title}|${alert.description}|${index}`;
}

export default function AlertsPage() {
  const locale = useAppStore((s) => s.locale);
  const appMode = useAppStore((s) => s.appMode);
  const dismissedAlertKeys = useAppStore((s) => s.dismissedAlertKeys);
  const setDismissedAlertKeys = useAppStore((s) => s.setDismissedAlertKeys);
  const { snapshot } = useFinancialSnapshot();
  const { isSignedIn } = useRuntimeUser();
  const isArabic = locale === 'ar';
  const isDemoMode = appMode === 'demo' && !isSignedIn;

  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const dismissed = useMemo(() => new Set(dismissedAlertKeys), [dismissedAlertKeys]);

  const rawAlerts = isDemoMode
    ? (isArabic ? DEMO_ALERTS_AR : DEMO_ALERTS)
    : snapshot.alerts;

  const filtered = useMemo(
    () =>
      rawAlerts
        .map((alert, idx) => ({ ...alert, idx, alertKey: getAlertKey(alert, idx) }))
        .filter((a) => !dismissed.has(a.alertKey))
        .filter((a) => severityFilter === 'all' || a.severity === severityFilter)
        .filter((a) => categoryFilter === 'all' || a.category === categoryFilter),
    [rawAlerts, dismissed, severityFilter, categoryFilter]
  );

  const counts = useMemo(() => ({
    critical: rawAlerts.filter((a) => a.severity === 'critical').length,
    warning: rawAlerts.filter((a) => a.severity === 'warning').length,
    info: rawAlerts.filter((a) => a.severity === 'info').length,
  }), [rawAlerts]);

  function dismiss(alertKey: string) {
    setDismissedAlertKeys([...dismissed, alertKey]);
  }

  function dismissAll() {
    const keys = rawAlerts.map((alert, idx) => getAlertKey(alert, idx));
    setDismissedAlertKeys(Array.from(new Set([...dismissed, ...keys])));
  }

  const categoryLabels: Record<CategoryFilter, { en: string; ar: string }> = {
    all: { en: 'All Categories', ar: 'كل الفئات' },
    cash_flow: { en: 'Cash Flow', ar: 'التدفق النقدي' },
    obligation: { en: 'Obligations', ar: 'الالتزامات' },
    forecast: { en: 'Forecast', ar: 'التوقعات' },
    fire: { en: 'FIRE', ar: 'FIRE' },
    liquidity: { en: 'Liquidity', ar: 'السيولة' },
  };

  const severityLabels: Record<SeverityFilter, { en: string; ar: string }> = {
    all: { en: 'All Severities', ar: 'كل الأولويات' },
    critical: { en: 'Critical', ar: 'حرج' },
    warning: { en: 'Warning', ar: 'تحذير' },
    info: { en: 'Info', ar: 'معلومات' },
  };

  return (
    <DashboardShell>
      <div className="rhythm-page w-full space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">{isArabic ? 'مركز التنبيهات' : 'Alerts Center'}</h1>
            <p className="text-sm text-muted-foreground">
              {isArabic ? 'تتبع التنبيهات والإشعارات المالية' : 'Track financial alerts and notifications'}
            </p>
          </div>
          {filtered.length > 0 && (
            <Button variant="outline" size="sm" onClick={dismissAll} className="gap-2 self-start">
              <BellOff className="h-4 w-4" />
              {isArabic ? 'تجاهل الكل' : 'Dismiss all'}
            </Button>
          )}
        </div>

        {/* Summary chips */}
        <div className="flex flex-wrap gap-2">
          {counts.critical > 0 && (
            <Badge variant="outline" className="gap-1 border-rose-500/30 text-rose-500 bg-rose-500/5">
              <AlertTriangle className="h-3 w-3" />
              {counts.critical} {isArabic ? 'حرجة' : 'critical'}
            </Badge>
          )}
          {counts.warning > 0 && (
            <Badge variant="outline" className="gap-1 border-amber-500/30 text-amber-500 bg-amber-500/5">
              <AlertTriangle className="h-3 w-3" />
              {counts.warning} {isArabic ? 'تحذيرات' : 'warnings'}
            </Badge>
          )}
          {counts.info > 0 && (
            <Badge variant="outline" className="gap-1 border-sky-500/30 text-sky-500 bg-sky-500/5">
              <Info className="h-3 w-3" />
              {counts.info} {isArabic ? 'معلومات' : 'info'}
            </Badge>
          )}
          {rawAlerts.length === 0 && (
            <Badge variant="outline" className="gap-1 text-emerald-500 border-emerald-500/30">
              <CheckCircle2 className="h-3 w-3" />
              {isArabic ? 'لا توجد تنبيهات' : 'No alerts'}
            </Badge>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
            <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v as SeverityFilter)}>
              <SelectTrigger className="h-8 w-44 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(severityLabels) as SeverityFilter[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {isArabic ? severityLabels[k].ar : severityLabels[k].en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as CategoryFilter)}>
            <SelectTrigger className="h-8 w-44 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(categoryLabels) as CategoryFilter[]).map((k) => (
                <SelectItem key={k} value={k}>
                  {isArabic ? categoryLabels[k].ar : categoryLabels[k].en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Alert list */}
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="rounded-full bg-emerald-500/10 p-4">
                <Bell className="h-8 w-8 text-emerald-500" />
              </div>
              <p className="font-medium">{isArabic ? 'لا توجد تنبيهات نشطة' : 'No active alerts'}</p>
              <p className="text-sm text-muted-foreground max-w-xs">
                {isArabic
                  ? 'وضعك المالي يبدو جيداً. سيتم إخطارك عند ظهور تنبيهات جديدة.'
                  : "Your finances look healthy. You'll be notified when new alerts appear."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {filtered.map((alert) => (
                <motion.div
                  key={alert.idx}
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 12 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className={`overflow-hidden ${cardBgClass(alert.severity)}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 shrink-0">
                          <SeverityIcon severity={alert.severity} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <p className="text-sm font-medium">{alert.title}</p>
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${severityBadgeClass(alert.severity)}`}
                            >
                              {isArabic
                                ? severityLabels[alert.severity].ar
                                : severityLabels[alert.severity].en}
                            </Badge>
                            <Badge variant="outline" className="text-[10px]">
                              {isArabic
                                ? categoryLabels[alert.category].ar
                                : categoryLabels[alert.category].en}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{alert.description}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={() => dismiss(alert.alertKey)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {dismissed.size > 0 && (
          <p className="text-xs text-muted-foreground text-center">
            {dismissed.size} {isArabic ? 'تنبيه مُتجاهَل' : 'alert(s) dismissed'}
            {' · '}
            <button
              className="underline hover:text-foreground"
              onClick={() => setDismissedAlertKeys([])}
            >
              {isArabic ? 'استعادة' : 'Restore'}
            </button>
          </p>
        )}
      </div>
    </DashboardShell>
  );
}
