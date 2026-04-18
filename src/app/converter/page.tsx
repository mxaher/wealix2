'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeftRight, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { useAppStore } from '@/store/useAppStore';

// Static mid-market rates relative to SAR (updated periodically)
const RATES_VS_SAR: Record<string, { rate: number; symbol: string; name: string; nameAr: string }> = {
  SAR: { rate: 1,           symbol: 'ر.س',  name: 'Saudi Riyal',       nameAr: 'ريال سعودي' },
  USD: { rate: 0.2667,      symbol: '$',    name: 'US Dollar',         nameAr: 'دولار أمريكي' },
  EUR: { rate: 0.2453,      symbol: '€',    name: 'Euro',              nameAr: 'يورو' },
  GBP: { rate: 0.2101,      symbol: '£',    name: 'British Pound',     nameAr: 'جنيه إسترليني' },
  AED: { rate: 0.9796,      symbol: 'د.إ',  name: 'UAE Dirham',        nameAr: 'درهم إماراتي' },
  KWD: { rate: 0.08196,     symbol: 'د.ك',  name: 'Kuwaiti Dinar',     nameAr: 'دينار كويتي' },
  QAR: { rate: 0.9713,      symbol: 'ر.ق',  name: 'Qatari Riyal',      nameAr: 'ريال قطري' },
  BHD: { rate: 0.1005,      symbol: 'د.ب',  name: 'Bahraini Dinar',    nameAr: 'دينار بحريني' },
  OMR: { rate: 0.1026,      symbol: 'ر.ع',  name: 'Omani Rial',        nameAr: 'ريال عُماني' },
  EGP: { rate: 13.23,       symbol: 'ج.م',  name: 'Egyptian Pound',    nameAr: 'جنيه مصري' },
  JOD: { rate: 0.1892,      symbol: 'د.ا',  name: 'Jordanian Dinar',   nameAr: 'دينار أردني' },
  GBX: { rate: 210.1,       symbol: 'p',    name: 'Pence Sterling',    nameAr: 'بنس إسترليني' },
  TRY: { rate: 8.72,        symbol: '₺',    name: 'Turkish Lira',      nameAr: 'ليرة تركية' },
  INR: { rate: 22.27,       symbol: '₹',    name: 'Indian Rupee',      nameAr: 'روبية هندية' },
  PKR: { rate: 74.54,       symbol: '₨',    name: 'Pakistani Rupee',   nameAr: 'روبية باكستانية' },
  MYR: { rate: 1.259,       symbol: 'RM',   name: 'Malaysian Ringgit', nameAr: 'رينغيت ماليزي' },
  JPY: { rate: 40.26,       symbol: '¥',    name: 'Japanese Yen',      nameAr: 'ين ياباني' },
  CNY: { rate: 1.937,       symbol: '¥',    name: 'Chinese Yuan',      nameAr: 'يوان صيني' },
};

const GOLD_PRICE_SAR_PER_GRAM: Record<string, number> = {
  '24K': 340,
  '22K': 311.7,
  '21K': 297.5,
  '18K': 255,
};

const CURRENCY_ORDER = ['SAR', 'USD', 'EUR', 'GBP', 'AED', 'KWD', 'QAR', 'BHD', 'OMR', 'EGP', 'JOD', 'TRY', 'INR', 'PKR', 'MYR', 'JPY', 'CNY', 'GBX'];

export default function ConverterPage() {
  const locale = useAppStore((s) => s.locale);
  const isArabic = locale === 'ar';
  const [ratesVsSar, setRatesVsSar] = useState(RATES_VS_SAR);
  const [lastRatesSync, setLastRatesSync] = useState<string | null>(null);

  const [amount, setAmount] = useState('1000');
  const [from, setFrom] = useState('SAR');
  const [to, setTo] = useState('USD');
  const [goldKarat, setGoldKarat] = useState<'24K' | '22K' | '21K' | '18K'>('21K');
  const [goldGrams, setGoldGrams] = useState('1');
  const [tab, setTab] = useState<'currency' | 'gold'>('currency');

  useEffect(() => {
    let cancelled = false;

    async function syncRates() {
      try {
        const res = await fetch('https://open.er-api.com/v6/latest/SAR');
        if (!res.ok) return;
        const data = (await res.json()) as { rates?: Record<string, number> };
        if (!data.rates) return;

        const nextRates = { ...RATES_VS_SAR };
        for (const code of Object.keys(nextRates)) {
          if (code === 'SAR') continue;
          const liveRate = data.rates[code];
          if (typeof liveRate === 'number' && Number.isFinite(liveRate) && liveRate > 0) {
            nextRates[code] = { ...nextRates[code], rate: liveRate };
          }
        }

        if (!cancelled) {
          setRatesVsSar(nextRates);
          setLastRatesSync(new Date().toISOString());
        }
      } catch {
        // Keep static fallback rates on any network failure.
      }
    }

    void syncRates();
    const intervalId = window.setInterval(() => {
      void syncRates();
    }, 6 * 60 * 60 * 1000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  const result = useMemo(() => {
    const num = parseFloat(amount);
    if (isNaN(num) || num < 0) return null;
    const fromRate = ratesVsSar[from]?.rate ?? 1;
    const toRate = ratesVsSar[to]?.rate ?? 1;
    const sarAmount = num / fromRate;
    return sarAmount * toRate;
  }, [amount, from, to, ratesVsSar]);

  const goldResult = useMemo(() => {
    const grams = parseFloat(goldGrams);
    if (isNaN(grams) || grams <= 0) return null;
    return grams * (GOLD_PRICE_SAR_PER_GRAM[goldKarat] ?? 340);
  }, [goldGrams, goldKarat]);

  const crossRate = useMemo(() => {
    const fromRate = ratesVsSar[from]?.rate ?? 1;
    const toRate = ratesVsSar[to]?.rate ?? 1;
    return toRate / fromRate;
  }, [from, to, ratesVsSar]);

  function swap() {
    setFrom(to);
    setTo(from);
  }

  const popularPairs = [
    { from: 'SAR', to: 'USD' },
    { from: 'SAR', to: 'EUR' },
    { from: 'SAR', to: 'AED' },
    { from: 'SAR', to: 'KWD' },
    { from: 'USD', to: 'SAR' },
    { from: 'USD', to: 'EUR' },
  ];

  return (
    <DashboardShell>
      <div className="w-full space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{isArabic ? 'محول العملات' : 'Currency Converter'}</h1>
          <p className="text-sm text-muted-foreground">
            {isArabic ? 'تحويل العملات بأسعار تقريبية' : 'Convert currencies with approximate mid-market rates'}
          </p>
        </div>

        {/* Tab selector */}
        <div className="flex gap-2">
          <Button
            variant={tab === 'currency' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTab('currency')}
          >
            {isArabic ? 'عملات' : 'Currency'}
          </Button>
          <Button
            variant={tab === 'gold' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTab('gold')}
          >
            {isArabic ? 'ذهب' : 'Gold'}
          </Button>
        </div>

        {tab === 'currency' && (
          <>
            <Card>
              <CardContent className="p-6 space-y-5">
                {/* Amount */}
                <div>
                  <Label className="mb-1.5 block">{isArabic ? 'المبلغ' : 'Amount'}</Label>
                  <Input
                    type="number"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="text-lg font-semibold"
                    placeholder="0"
                  />
                </div>

                {/* From / Swap / To */}
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <Label className="mb-1.5 block">{isArabic ? 'من' : 'From'}</Label>
                    <Select value={from} onValueChange={setFrom}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCY_ORDER.map((code) => (
                          <SelectItem key={code} value={code}>
                            <span className="font-mono me-2">{ratesVsSar[code]?.symbol}</span>
                            {code} — {isArabic ? ratesVsSar[code]?.nameAr : ratesVsSar[code]?.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button variant="outline" size="icon" onClick={swap} className="mb-0.5 shrink-0">
                    <ArrowLeftRight className="h-4 w-4" />
                  </Button>

                  <div className="flex-1">
                    <Label className="mb-1.5 block">{isArabic ? 'إلى' : 'To'}</Label>
                    <Select value={to} onValueChange={setTo}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCY_ORDER.map((code) => (
                          <SelectItem key={code} value={code}>
                            <span className="font-mono me-2">{ratesVsSar[code]?.symbol}</span>
                            {code} — {isArabic ? ratesVsSar[code]?.nameAr : ratesVsSar[code]?.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Result */}
                <div className="rounded-xl bg-muted/60 p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">
                    {parseFloat(amount) || 0} {from} =
                  </p>
                  <p className="text-3xl font-bold text-primary">
                    {result !== null
                      ? `${ratesVsSar[to]?.symbol ?? ''} ${result.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`
                      : '—'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    1 {from} = {crossRate.toFixed(6)} {to}
                  </p>
                  {lastRatesSync && (
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {isArabic ? 'آخر تحديث:' : 'Last sync:'} {new Date(lastRatesSync).toLocaleTimeString(isArabic ? 'ar-SA' : 'en-US')}
                    </p>
                  )}
                </div>

                {/* Disclaimer */}
                <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                  <Info className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    {isArabic
                      ? 'الأسعار تقريبية للمعرفة العامة فقط. للمعاملات الحقيقية استخدم سعر البنك أو الصرافة.'
                      : 'Rates are approximate for reference only. Use your bank or exchange for actual transactions.'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Popular pairs */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">{isArabic ? 'أزواج شائعة' : 'Popular Pairs'}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {popularPairs.map((pair) => {
                    const fromRate = ratesVsSar[pair.from]?.rate ?? 1;
                    const toRate = ratesVsSar[pair.to]?.rate ?? 1;
                    const rate = toRate / fromRate;
                    return (
                      <button
                        key={`${pair.from}-${pair.to}`}
                        onClick={() => { setFrom(pair.from); setTo(pair.to); }}
                        className="rounded-lg border bg-muted/30 p-3 text-start hover:bg-muted/60 transition-colors"
                      >
                        <p className="text-xs font-semibold">{pair.from} → {pair.to}</p>
                        <p className="text-sm font-bold mt-0.5">{rate.toFixed(4)}</p>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {tab === 'gold' && (
          <Card>
            <CardHeader>
              <CardTitle>{isArabic ? 'تحويل الذهب' : 'Gold Converter'}</CardTitle>
              <CardDescription>
                {isArabic ? 'تقدير قيمة الذهب بالريال السعودي' : 'Estimate gold value in SAR'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="mb-1.5 block">{isArabic ? 'الوزن (غرام)' : 'Weight (grams)'}</Label>
                  <Input
                    type="number"
                    min="0"
                    value={goldGrams}
                    onChange={(e) => setGoldGrams(e.target.value)}
                    className="text-lg font-semibold"
                  />
                </div>
                <div>
                  <Label className="mb-1.5 block">{isArabic ? 'العيار' : 'Karat'}</Label>
                  <Select value={goldKarat} onValueChange={(v) => setGoldKarat(v as typeof goldKarat)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(['24K', '22K', '21K', '18K'] as const).map((k) => (
                        <SelectItem key={k} value={k}>{k}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="rounded-xl bg-muted/60 p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">
                  {goldGrams}g × {goldKarat} =
                </p>
                <p className="text-3xl font-bold text-amber-500">
                  {goldResult !== null
                    ? `ر.س ${goldResult.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : '—'}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {isArabic ? 'سعر الغرام' : 'Price per gram'}: ر.س {GOLD_PRICE_SAR_PER_GRAM[goldKarat]}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {(['24K', '22K', '21K', '18K'] as const).map((k) => (
                  <div key={k} className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 text-xs">
                    <Badge variant="outline">{k}</Badge>
                    <span className="font-medium">ر.س {GOLD_PRICE_SAR_PER_GRAM[k]}/غ</span>
                  </div>
                ))}
              </div>

              <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                <Info className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  {isArabic
                    ? 'أسعار تقريبية. السعر الفعلي يعتمد على التاجر وتاريخ الشراء.'
                    : 'Approximate prices. Actual price depends on dealer and purchase date.'}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardShell>
  );
}
