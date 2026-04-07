'use client';

import { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Loader2,
  ShieldAlert,
  Sparkles,
  Target,
} from 'lucide-react';
import { getPersistableWorkspaceSnapshot, useAppStore } from '@/store/useAppStore';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatCurrency } from '@/components/shared';
import { createOpaqueId } from '@/lib/ids';

type DecisionDimension = {
  key: string;
  title: string;
  status: 'positive' | 'neutral' | 'warning' | 'negative';
  score: number;
  analysis: string;
};

type DecisionResponse = {
  investmentName: string;
  price: number;
  decision: {
    verdict: 'proceed_now' | 'proceed_with_caution' | 'postpone' | 'do_not_proceed';
    verdictLabel: string;
    summary: string;
    alternativeSuggestion: string;
    suggestedAllocation: {
      amount: number;
      percentOfNetWorth: number;
      percentOfLiquidReserves: number;
    };
    revisitPlan: {
      month: string | null;
      savingsMilestone: number | null;
      monthsToWait: number;
    };
    dimensions: DecisionDimension[];
  };
};

function getVerdictMeta(verdict: DecisionResponse['decision']['verdict']) {
  switch (verdict) {
    case 'proceed_now':
      return {
        icon: CheckCircle2,
        badgeClass: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600',
      };
    case 'proceed_with_caution':
      return {
        icon: AlertTriangle,
        badgeClass: 'border-amber-500/30 bg-amber-500/10 text-amber-600',
      };
    case 'postpone':
      return {
        icon: Clock3,
        badgeClass: 'border-blue-500/30 bg-blue-500/10 text-blue-600',
      };
    case 'do_not_proceed':
    default:
      return {
        icon: ShieldAlert,
        badgeClass: 'border-rose-500/30 bg-rose-500/10 text-rose-600',
      };
  }
}

function getDimensionClass(status: DecisionDimension['status']) {
  switch (status) {
    case 'positive':
      return 'border-emerald-500/20 bg-emerald-500/10';
    case 'warning':
      return 'border-amber-500/20 bg-amber-500/10';
    case 'negative':
      return 'border-rose-500/20 bg-rose-500/10';
    case 'neutral':
    default:
      return 'border-border bg-muted/30';
  }
}

export function InvestmentDecisionCheck() {
  const {
    locale,
    financialStateVersion,
    addInvestmentDecisionRecord,
  } = useAppStore();
  const isArabic = locale === 'ar';

  const [investmentName, setInvestmentName] = useState('');
  const [price, setPrice] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<DecisionResponse | null>(null);

  const runDecision = async () => {
    const numericPrice = Number(price);
    if (!investmentName.trim() || !Number.isFinite(numericPrice) || numericPrice <= 0) {
      toast({
        title: isArabic ? 'بيانات غير مكتملة' : 'Incomplete input',
        description: isArabic
          ? 'أدخل اسم الاستثمار وقيمته التقديرية أولاً.'
          : 'Enter the investment name and estimated price first.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    toast({
      title: isArabic ? 'بدأ فحص القرار' : 'Decision Check started',
      description: isArabic
        ? 'سنضيف إشعاراً في أعلى التطبيق فور اكتمال النتيجة.'
        : 'We will notify you in the header as soon as the decision check is completed.',
    });
    try {
      const response = await fetch('/api/investment-decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker: investmentName.trim(),
          action: 'BUY',
          amount: numericPrice,
          locale,
          clientContext: {
            version: financialStateVersion,
            workspace: getPersistableWorkspaceSnapshot(useAppStore.getState()),
          },
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to evaluate investment.');
      }

      const nextResult = data as DecisionResponse;
      setResult(nextResult);
      addInvestmentDecisionRecord({
        id: createOpaqueId('investment-decision'),
        createdAt: new Date().toISOString(),
        investmentName: nextResult.investmentName,
        price: nextResult.price,
        verdict: nextResult.decision.verdict,
        verdictLabel: nextResult.decision.verdictLabel,
        summary: nextResult.decision.summary,
        alternativeSuggestion: nextResult.decision.alternativeSuggestion,
        suggestedAllocation: nextResult.decision.suggestedAllocation,
        revisitPlan: nextResult.decision.revisitPlan,
        dimensions: nextResult.decision.dimensions,
      });
    } catch (error) {
      toast({
        title: isArabic ? 'تعذر فحص القرار' : 'Decision check failed',
        description: error instanceof Error ? error.message : 'Could not evaluate this idea.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const verdictMeta = result ? getVerdictMeta(result.decision.verdict) : null;
  const VerdictIcon = verdictMeta?.icon;

  return (
    <div className="space-y-4" dir={isArabic ? 'rtl' : 'ltr'}>
      <Card className="border-border/70 bg-gradient-to-br from-background via-background to-secondary/20 shadow-sm">
        <CardHeader className="space-y-2">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {isArabic ? 'Decision Check' : 'Decision Check'}
          </CardTitle>
          <CardDescription>
            {isArabic
              ? 'أدخل اسم الأصل وتكلفته، وسنقارن القرار مع محفظتك، سيولتك، وصافي ثروتك وأهدافك.'
              : 'Enter the asset name and price, and the engine will compare it against your portfolio, liquidity, net worth, and goals.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{isArabic ? 'اسم الاستثمار' : 'Investment name'}</Label>
              <Input
                value={investmentName}
                onChange={(event) => setInvestmentName(event.target.value)}
                placeholder={isArabic ? 'مثل: ذهب، NVIDIA، شقة في الرياض' : 'Ex: Gold, NVIDIA stock, Riyadh apartment'}
                data-testid="decision-input-name"
              />
            </div>
            <div className="space-y-2">
              <Label>{isArabic ? 'السعر أو التكلفة الإجمالية' : 'Price or total cost'}</Label>
              <Input
                type="number"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                placeholder="32000"
                data-testid="decision-input-amount"
              />
            </div>
          </div>
          <Button className="gap-2" onClick={runDecision} disabled={isLoading} data-testid="decision-run">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Target className="h-4 w-4" />}
            {isArabic ? 'افحص القرار' : 'Run Decision Check'}
          </Button>
          <p className={`text-xs text-muted-foreground ${isArabic ? 'text-right' : ''}`}>
            {isArabic
              ? 'سنرسل إشعاراً داخل أيقونة التنبيهات بالأعلى عند اكتمال فحص القرار.'
              : 'We will notify you in the header notification bell when the decision check is completed.'}
          </p>
        </CardContent>
      </Card>

      {result && verdictMeta && VerdictIcon ? (
        <Card className="border-border/70 bg-card shadow-sm">
          <CardHeader className="space-y-4 border-b border-border/70">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={verdictMeta.badgeClass} data-testid="decision-verdict">
                    <VerdictIcon className="mr-1 h-3.5 w-3.5" />
                    {result.decision.verdictLabel}
                  </Badge>
                  <Badge variant="outline" className="border-border bg-background/80 text-muted-foreground">
                    {result.investmentName}
                  </Badge>
                </div>
                <CardTitle className="text-xl" data-testid="decision-reason">{result.decision.summary}</CardTitle>
                <CardDescription>
                  {isArabic ? 'فحص القرار اعتمد على صافي الثروة، السيولة، مسار الادخار، والأهداف الحالية.' : 'The verdict was built from net worth, liquidity, savings trajectory, and active goals.'}
                </CardDescription>
              </div>
              <div className="rounded-2xl border border-border bg-muted/30 px-4 py-3 text-sm">
                <p className="text-muted-foreground">{isArabic ? 'الحجم المقترح الآن' : 'Suggested size now'}</p>
                <p className="mt-1 text-lg font-semibold">{formatCurrency(result.decision.suggestedAllocation.amount, 'SAR', locale)}</p>
                <p className="text-xs text-muted-foreground">
                  {result.decision.suggestedAllocation.percentOfNetWorth.toFixed(1)}% {isArabic ? 'من صافي الثروة' : 'of net worth'}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 p-5">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-border bg-muted/30 p-4">
                <p className="text-sm text-muted-foreground">{isArabic ? 'المبلغ المدخل' : 'Entered amount'}</p>
                <p className="mt-1 font-semibold">{formatCurrency(result.price, 'SAR', locale)}</p>
              </div>
              <div className="rounded-2xl border border-border bg-muted/30 p-4">
                <p className="text-sm text-muted-foreground">{isArabic ? 'من السيولة الحالية' : 'Of liquid reserves'}</p>
                <p className="mt-1 font-semibold">{result.decision.suggestedAllocation.percentOfLiquidReserves.toFixed(1)}%</p>
              </div>
              <div className="rounded-2xl border border-border bg-muted/30 p-4">
                <p className="text-sm text-muted-foreground">{isArabic ? 'موعد إعادة النظر' : 'Revisit plan'}</p>
                <p className="mt-1 font-semibold">
                  {result.decision.revisitPlan.month ?? (isArabic ? 'لا حاجة' : 'Not needed')}
                </p>
              </div>
            </div>

            {result.decision.revisitPlan.month && result.decision.revisitPlan.savingsMilestone ? (
              <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4 text-sm">
                <p className="font-medium text-foreground">
                  {isArabic
                    ? `أعد النظر في ${result.decision.revisitPlan.month} عندما تصل السيولة إلى ${formatCurrency(result.decision.revisitPlan.savingsMilestone, 'SAR', locale)}.`
                    : `Revisit in ${result.decision.revisitPlan.month} when liquid savings reach ${formatCurrency(result.decision.revisitPlan.savingsMilestone, 'SAR', locale)}.`}
                </p>
              </div>
            ) : null}

            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm">
              <p className="font-medium text-foreground">{isArabic ? 'بديل أفضل' : 'Better alternative'}</p>
              <p className="mt-2 text-muted-foreground">{result.decision.alternativeSuggestion}</p>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold text-foreground">
                {isArabic ? 'تفصيل الأبعاد الثمانية' : 'Eight-dimension breakdown'}
              </p>
              <ScrollArea className="max-h-[360px]">
                <div className="grid gap-3 pr-1">
                  {result.decision.dimensions.map((dimension) => (
                    <div
                      key={dimension.key}
                      className={`rounded-2xl border p-4 ${getDimensionClass(dimension.status)}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-foreground">{dimension.title}</p>
                        <Badge variant="outline" className="border-border bg-background/80 text-muted-foreground">
                          {dimension.score > 0 ? '+' : ''}{dimension.score}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{dimension.analysis}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ArrowRight className="h-3.5 w-3.5" />
              {isArabic
                ? 'هذا القرار يعتمد على وضعك المالي الحالي، لذلك قد يتغير إذا تغيّرت السيولة أو صافي الثروة أو الدخل.'
                : 'This verdict is based on your current financial state, so it can change as liquidity, net worth, or cash flow changes.'}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
