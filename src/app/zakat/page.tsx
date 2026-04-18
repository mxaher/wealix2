'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Info,
  CheckCircle2,
  AlertTriangle,
  Moon,
  Coins,
  Calculator,
  BookOpen,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { useAppStore, formatCurrency } from '@/store/useAppStore';
import { useFinancialSnapshot } from '@/hooks/useFinancialSnapshot';
import { useRuntimeUser } from '@/hooks/useRuntimeUser';

// Nisab values (approximate, SAR). Update annually.
// Based on gold nisab (85g × current SAR gold price ~340 SAR/g)
const NISAB_SAR = 28900; // 85g × 340 SAR/g
const ZAKAT_RATE = 0.025;

type ZakatAssetKey =
  | 'cashAndBank'
  | 'investmentsLiquid'
  | 'goldAndSilver'
  | 'businessInventory'
  | 'receivables';

interface ZakatAssets {
  cashAndBank: number;
  investmentsLiquid: number;
  goldAndSilver: number;
  businessInventory: number;
  receivables: number;
}

interface ZakatDeductions {
  shortTermDebts: number;
  businessExpenses: number;
}

export default function ZakatPage() {
  const locale = useAppStore((s) => s.locale);
  const appMode = useAppStore((s) => s.appMode);
  const { snapshot } = useFinancialSnapshot();
  const { isSignedIn } = useRuntimeUser();
  const isArabic = locale === 'ar';
  const isDemoMode = appMode === 'demo' && !isSignedIn;

  const [mode, setMode] = useState<'auto' | 'manual'>('auto');
  const [manualAssets, setManualAssets] = useState<ZakatAssets>({
    cashAndBank: '',
    investmentsLiquid: '',
    goldAndSilver: '',
    businessInventory: '',
    receivables: '',
  } as unknown as ZakatAssets);
  const [deductions, setDeductions] = useState<ZakatDeductions>({
    shortTermDebts: '',
    businessExpenses: '',
  } as unknown as ZakatDeductions);

  // Auto-derive from snapshot
  const autoAssets = useMemo<ZakatAssets>(() => {
    if (isDemoMode) {
      return {
        cashAndBank: 45000,
        investmentsLiquid: 180000,
        goldAndSilver: 24000,
        businessInventory: 0,
        receivables: 0,
      };
    }
    return {
      cashAndBank: snapshot.savings.liquidCash,
      investmentsLiquid: snapshot.portfolio.stocks + snapshot.portfolio.funds,
      goldAndSilver: 0,
      businessInventory: 0,
      receivables: 0,
    };
  }, [snapshot, isDemoMode]);

  const activeAssets = mode === 'auto' ? autoAssets : manualAssets;

  const result = useMemo(() => {
    const totalZakatable =
      (Number(activeAssets.cashAndBank) || 0) +
      (Number(activeAssets.investmentsLiquid) || 0) +
      (Number(activeAssets.goldAndSilver) || 0) +
      (Number(activeAssets.businessInventory) || 0) +
      (Number(activeAssets.receivables) || 0);

    const totalDeductions =
      (Number(deductions.shortTermDebts) || 0) +
      (Number(deductions.businessExpenses) || 0);

    const net = Math.max(0, totalZakatable - totalDeductions);
    const aboveNisab = net >= NISAB_SAR;
    const zakatDue = aboveNisab ? net * ZAKAT_RATE : 0;
    const nisabCoverage = (net / NISAB_SAR) * 100;

    return { totalZakatable, totalDeductions, net, aboveNisab, zakatDue, nisabCoverage };
  }, [activeAssets, deductions]);

  function setManualField(key: ZakatAssetKey, value: string) {
    setManualAssets((prev) => ({ ...prev, [key]: value === '' ? '' : Number(value) }));
  }

  function setDeductionField(key: keyof ZakatDeductions, value: string) {
    setDeductions((prev) => ({ ...prev, [key]: value === '' ? '' : Number(value) }));
  }

  const assetFields: { key: ZakatAssetKey; en: string; ar: string; hint?: string }[] = [
    { key: 'cashAndBank', en: 'Cash & Bank Balances', ar: 'النقد والأرصدة البنكية', hint: isArabic ? 'يشمل حسابات التوفير والجارية' : 'Includes savings & current accounts' },
    { key: 'investmentsLiquid', en: 'Stocks & Liquid Investments', ar: 'الأسهم والاستثمارات السائلة', hint: isArabic ? 'بالقيمة السوقية الحالية' : 'At current market value' },
    { key: 'goldAndSilver', en: 'Gold & Silver', ar: 'الذهب والفضة', hint: isArabic ? 'بالقيمة السوقية الحالية' : 'At current market value' },
    { key: 'businessInventory', en: 'Business Inventory', ar: 'بضاعة للبيع', hint: isArabic ? 'المخزون المعد للبيع' : 'Stock intended for sale' },
    { key: 'receivables', en: 'Receivables', ar: 'الديون المستحقة لك', hint: isArabic ? 'مبالغ مستحقة من الآخرين' : 'Amounts others owe you' },
  ];

  return (
    <DashboardShell>
      <div className="w-full space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Moon className="h-6 w-6 text-gold" />
            {isArabic ? 'حاسبة الزكاة' : 'Zakat Calculator'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isArabic
              ? 'احسب زكاتك السنوية بناءً على أصولك الزكوية'
              : 'Calculate your annual zakat based on zakatable assets'}
          </p>
        </div>

        {/* Nisab reference */}
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex items-start gap-3 p-4">
            <Coins className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-600">
                {isArabic ? 'نصاب الزكاة الحالي' : 'Current Nisab Threshold'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isArabic
                  ? `${formatCurrency(NISAB_SAR, 'SAR', locale)} (85 جرام ذهب × ~340 ريال/غ). يُحدَّث سنوياً.`
                  : `${formatCurrency(NISAB_SAR, 'SAR', locale)} (85g gold × ~SAR 340/g). Updated annually.`}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Mode toggle */}
        <div className="flex gap-2">
          <Button
            variant={mode === 'auto' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('auto')}
          >
            {isArabic ? 'تلقائي من بياناتك' : 'Auto from your data'}
          </Button>
          <Button
            variant={mode === 'manual' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('manual')}
          >
            {isArabic ? 'إدخال يدوي' : 'Manual entry'}
          </Button>
        </div>

        {mode === 'auto' && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{isArabic ? 'أصول مستخرجة تلقائياً' : 'Auto-extracted Assets'}</CardTitle>
              <CardDescription>
                {isArabic ? 'استُخرجت من بيانات Budget & Planning وPortfolio' : 'Sourced from Budget & Planning and Portfolio'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {assetFields.map((field) => (
                <div key={field.key} className="flex items-center justify-between py-1">
                  <div>
                    <p className="text-sm">{isArabic ? field.ar : field.en}</p>
                    {field.hint && (
                      <p className="text-xs text-muted-foreground">{field.hint}</p>
                    )}
                  </div>
                  <p className="text-sm font-medium">
                    {(Number(autoAssets[field.key]) || 0) > 0
                      ? formatCurrency(Number(autoAssets[field.key]), 'SAR', locale)
                      : <span className="text-muted-foreground">—</span>}
                  </p>
                </div>
              ))}
              <div className="pt-2">
                <Button variant="outline" size="sm" onClick={() => setMode('manual')}>
                  {isArabic ? 'تعديل يدوياً' : 'Edit manually'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {mode === 'manual' && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{isArabic ? 'الأصول الزكوية' : 'Zakatable Assets'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {assetFields.map((field) => (
                <div key={field.key}>
                  <Label className="mb-1.5 block">
                    {isArabic ? field.ar : field.en}
                    {field.hint && (
                      <span className="ms-1 text-xs text-muted-foreground">({field.hint})</span>
                    )}
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={manualAssets[field.key] === 0 ? '' : (manualAssets[field.key] as unknown as string)}
                    onChange={(e) => setManualField(field.key, e.target.value)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Deductions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{isArabic ? 'الخصومات' : 'Deductions'}</CardTitle>
            <CardDescription>
              {isArabic ? 'الديون قصيرة الأجل المستحقة هذا العام' : 'Short-term debts due within this year'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="mb-1.5 block">{isArabic ? 'ديون قصيرة الأجل' : 'Short-term debts'}</Label>
              <Input
                type="number" min="0" placeholder="0"
                value={deductions.shortTermDebts === 0 ? '' : (deductions.shortTermDebts as unknown as string)}
                onChange={(e) => setDeductionField('shortTermDebts', e.target.value)}
              />
            </div>
            <div>
              <Label className="mb-1.5 block">{isArabic ? 'مصاريف تجارية مستحقة' : 'Business expenses due'}</Label>
              <Input
                type="number" min="0" placeholder="0"
                value={deductions.businessExpenses === 0 ? '' : (deductions.businessExpenses as unknown as string)}
                onChange={(e) => setDeductionField('businessExpenses', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Result */}
        <motion.div
          key={result.net}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          <Card className={result.aboveNisab ? 'border-gold/40' : ''}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                {isArabic ? 'نتيجة الحساب' : 'Calculation Result'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{isArabic ? 'إجمالي الأصول الزكوية' : 'Total zakatable assets'}</span>
                  <span className="font-medium">{formatCurrency(result.totalZakatable, 'SAR', locale)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{isArabic ? 'الخصومات' : 'Deductions'}</span>
                  <span className="font-medium text-rose-500">−{formatCurrency(result.totalDeductions, 'SAR', locale)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm font-semibold">
                  <span>{isArabic ? 'الوعاء الزكوي' : 'Net zakatable wealth'}</span>
                  <span>{formatCurrency(result.net, 'SAR', locale)}</span>
                </div>
              </div>

              {/* Nisab coverage */}
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>{isArabic ? 'نسبة النصاب' : 'Nisab coverage'}</span>
                  <span>{Math.min(result.nisabCoverage, 200).toFixed(0)}%</span>
                </div>
                <Progress value={Math.min(result.nisabCoverage, 100)} className="h-2" />
              </div>

              {/* Status */}
              {result.net > 0 && (
                <div className={`flex items-start gap-2 rounded-lg p-3 ${result.aboveNisab ? 'bg-amber-500/10' : 'bg-muted/40'}`}>
                  {result.aboveNisab ? (
                    <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  )}
                  <p className="text-sm">
                    {result.aboveNisab
                      ? isArabic
                        ? `ثروتك تبلغ النصاب. الزكاة الواجبة بنسبة 2.5%: ${formatCurrency(result.zakatDue, 'SAR', locale)}`
                        : `Your wealth reaches nisab. Zakat due at 2.5%: ${formatCurrency(result.zakatDue, 'SAR', locale)}`
                      : isArabic
                        ? `ثروتك أقل من النصاب (${formatCurrency(NISAB_SAR, 'SAR', locale)}). لا تجب الزكاة.`
                        : `Wealth is below nisab (${formatCurrency(NISAB_SAR, 'SAR', locale)}). No zakat is due.`}
                  </p>
                </div>
              )}

              {result.aboveNisab && (
                <div className="rounded-xl border border-gold/30 bg-gold/5 p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">{isArabic ? 'الزكاة المستحقة' : 'Zakat Due'}</p>
                  <p className="text-3xl font-bold text-gold">
                    {formatCurrency(result.zakatDue, 'SAR', locale)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {ZAKAT_RATE * 100}% × {formatCurrency(result.net, 'SAR', locale)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* FAQ */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              {isArabic ? 'أسئلة شائعة' : 'FAQ'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Accordion type="multiple" className="px-4">
              <AccordionItem value="nisab">
                <AccordionTrigger className="text-sm">
                  {isArabic ? 'ما هو النصاب؟' : 'What is nisab?'}
                </AccordionTrigger>
                <AccordionContent className="text-xs text-muted-foreground">
                  {isArabic
                    ? 'النصاب هو الحد الأدنى للثروة الذي يجب بلوغه لتجب عليك الزكاة. ويُقدَّر بـ 85 جرام من الذهب أو 595 جرام من الفضة.'
                    : 'Nisab is the minimum wealth threshold above which zakat is obligatory. It equals 85 grams of gold or 595 grams of silver.'}
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="hawl">
                <AccordionTrigger className="text-sm">
                  {isArabic ? 'ما هو الحول؟' : 'What is the hawl?'}
                </AccordionTrigger>
                <AccordionContent className="text-xs text-muted-foreground">
                  {isArabic
                    ? 'الحول هو مرور سنة هجرية كاملة على امتلاك النصاب. وتجب الزكاة عند اكتمال الحول.'
                    : 'The hawl is one full lunar year during which wealth remains at or above nisab. Zakat becomes due at the end of the hawl.'}
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="investments">
                <AccordionTrigger className="text-sm">
                  {isArabic ? 'هل تجب الزكاة على الأسهم؟' : 'Is zakat due on stocks?'}
                </AccordionTrigger>
                <AccordionContent className="text-xs text-muted-foreground">
                  {isArabic
                    ? 'نعم، تُزكَّى الأسهم المعدة للاتجار بالقيمة السوقية. أما الأسهم للاستثمار طويل الأمد فتُزكَّى بحساب نسبة الأصول الزكوية من كل شركة. استشر عالماً للتفاصيل.'
                    : 'Yes, trading stocks are zakatable at market value. Long-term investment stocks may be zakatable based on the zakatable assets ratio of each company. Consult a scholar for details.'}
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="disclaimer">
                <AccordionTrigger className="text-sm">
                  {isArabic ? 'تنبيه شرعي' : 'Religious disclaimer'}
                </AccordionTrigger>
                <AccordionContent className="text-xs text-muted-foreground">
                  {isArabic
                    ? 'هذه الحاسبة للاسترشاد فقط. يُنصح باستشارة عالم شرعي أو هيئة زكاة معتمدة للحصول على فتوى دقيقة في وضعك.'
                    : 'This calculator is for guidance only. Consult a qualified Islamic scholar or certified zakat authority for a ruling specific to your situation.'}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        <div className="flex items-start gap-2 rounded-lg border border-sky-500/30 bg-sky-500/5 p-3">
          <Info className="h-4 w-4 text-sky-500 mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground">
            {isArabic
              ? 'يمكنك تسديد الزكاة عبر منصة هيئة الزكاة والضريبة والجمارك السعودية أو عبر جمعيات خيرية معتمدة.'
              : 'You can pay your zakat through the Saudi ZATCA platform or certified charitable organizations.'}
          </p>
        </div>
      </div>
    </DashboardShell>
  );
}
