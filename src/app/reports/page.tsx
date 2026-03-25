'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Download,
  Calendar,
  FileDown,
  PieChart,
  TrendingUp,
  Wallet,
  Briefcase,
  Receipt,
  Flame,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { DashboardShell } from '@/components/layout';
import { FeatureGate } from '@/components/shared';
import { useAppStore, formatCurrency } from '@/store/useAppStore';

interface ReportType {
  id: string;
  name: { en: string; ar: string };
  description: { en: string; ar: string };
  icon: React.ReactNode;
  tier: 'free' | 'core' | 'pro';
}

const reportTypes: ReportType[] = [
  {
    id: 'monthly-summary',
    name: { en: 'Monthly Financial Summary', ar: 'الملخص المالي الشهري' },
    description: { en: 'Net worth, income vs expenses, savings rate', ar: 'صافي الثروة، الدخل مقابل المصروفات، معدل الادخار' },
    icon: <PieChart className="w-6 h-6" />,
    tier: 'core',
  },
  {
    id: 'portfolio-report',
    name: { en: 'Portfolio Report', ar: 'تقرير المحفظة' },
    description: { en: 'Holdings, P&L, allocation charts, AI commentary', ar: 'الممتلكات، الربح/الخسارة، رسوم التوزيع، تعليق الذكاء الاصطناعي' },
    icon: <Briefcase className="w-6 h-6" />,
    tier: 'pro',
  },
  {
    id: 'net-worth-report',
    name: { en: 'Net Worth Report', ar: 'تقرير صافي الثروة' },
    description: { en: 'Assets, liabilities, historical trend', ar: 'الأصول، الالتزامات، الاتجاه التاريخي' },
    icon: <Wallet className="w-6 h-6" />,
    tier: 'core',
  },
  {
    id: 'budget-report',
    name: { en: 'Budget Report', ar: 'تقرير الميزانية' },
    description: { en: 'Budget vs actual, spending breakdown', ar: 'الميزانية مقابل الفعلي، تفصيل الإنفاق' },
    icon: <Receipt className="w-6 h-6" />,
    tier: 'core',
  },
  {
    id: 'fire-report',
    name: { en: 'FIRE Progress Report', ar: 'تقرير تقدم FIRE' },
    description: { en: 'FIRE calculation, projections, scenarios', ar: 'حساب FIRE، التوقعات، السيناريوهات' },
    icon: <Flame className="w-6 h-6" />,
    tier: 'pro',
  },
  {
    id: 'annual-review',
    name: { en: 'Annual Financial Review', ar: 'المراجعة المالية السنوية' },
    description: { en: 'Complete year overview with AI insights', ar: 'نظرة عامة كاملة للسنة مع رؤى الذكاء الاصطناعي' },
    icon: <TrendingUp className="w-6 h-6" />,
    tier: 'pro',
  },
];

// Mock generated reports
const mockGeneratedReports = [
  {
    id: '1',
    type: 'monthly-summary',
    name: 'December 2024 Summary',
    generatedAt: '2024-12-31',
    size: '245 KB',
  },
  {
    id: '2',
    type: 'portfolio-report',
    name: 'Q4 2024 Portfolio Analysis',
    generatedAt: '2024-12-28',
    size: '1.2 MB',
  },
  {
    id: '3',
    type: 'budget-report',
    name: 'November 2024 Budget',
    generatedAt: '2024-11-30',
    size: '180 KB',
  },
];

export default function ReportsPage() {
  const { locale } = useAppStore();
  const isArabic = locale === 'ar';
  
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedYear, setSelectedYear] = useState('2025');
  const [selectedMonth, setSelectedMonth] = useState('01');
  const [generating, setGenerating] = useState<string | null>(null);
  const [generatedReports, setGeneratedReports] = useState(mockGeneratedReports);

  const handleGenerateReport = async (reportType: string) => {
    setGenerating(reportType);
    
    // Simulate report generation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const newReport = {
      id: Date.now().toString(),
      type: reportType,
      name: selectedPeriod === 'month' 
        ? `${selectedMonth}/${selectedYear} ${reportTypes.find(r => r.id === reportType)?.name[isArabic ? 'ar' : 'en']}`
        : `${selectedYear} ${reportTypes.find(r => r.id === reportType)?.name[isArabic ? 'ar' : 'en']}`,
      generatedAt: new Date().toISOString().split('T')[0],
      size: `${(Math.random() * 2 + 0.5).toFixed(2)} MB`,
    };
    
    setGeneratedReports([newReport, ...generatedReports]);
    setGenerating(null);
  };

  const handleDownload = (reportId: string) => {
    // In production, this would download the actual PDF
    console.log('Downloading report:', reportId);
  };

  return (
    <DashboardShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="w-6 h-6" />
              {isArabic ? 'التقارير' : 'Reports'}
            </h1>
            <p className="text-muted-foreground">
              {isArabic ? 'إنشاء وتحميل التقارير المالية' : 'Generate and download financial reports'}
            </p>
          </div>
        </div>

        {/* Period Selector */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">{isArabic ? 'الفترة:' : 'Period:'}</span>
              </div>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">{isArabic ? 'شهري' : 'Monthly'}</SelectItem>
                  <SelectItem value="quarter">{isArabic ? 'ربع سنوي' : 'Quarterly'}</SelectItem>
                  <SelectItem value="year">{isArabic ? 'سنوي' : 'Annual'}</SelectItem>
                </SelectContent>
              </Select>
              
              {selectedPeriod === 'month' && (
                <>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map(m => (
                        <SelectItem key={m} value={m}>
                          {isArabic 
                            ? new Date(2024, parseInt(m) - 1).toLocaleDateString('ar-SA', { month: 'long' })
                            : new Date(2024, parseInt(m) - 1).toLocaleDateString('en-US', { month: 'long' })
                          }
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}
              
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2023">2023</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Report Types Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reportTypes.map((report) => {
            const isPro = report.tier === 'pro';
            const isCore = report.tier === 'core';
            const isGenerating = generating === report.id;
            
            return (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className={`h-full ${isPro ? 'border-gold/30 bg-gradient-to-br from-gold/5 to-transparent' : ''}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className={`p-2 rounded-lg ${isPro ? 'bg-gold/20 text-gold' : 'bg-muted text-muted-foreground'}`}>
                        {report.icon}
                      </div>
                      {isPro && (
                        <Badge className="bg-gold text-navy-dark">
                          <Sparkles className="w-3 h-3 mr-1" />
                          PRO
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-lg mt-3">
                      {report.name[isArabic ? 'ar' : 'en']}
                    </CardTitle>
                    <CardDescription>
                      {report.description[isArabic ? 'ar' : 'en']}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <FeatureGate feature={isPro ? 'reports.full' : 'reports.basic'}>
                      <Button
                        className="w-full"
                        variant={isPro ? 'default' : 'outline'}
                        onClick={() => handleGenerateReport(report.id)}
                        disabled={isGenerating}
                      >
                        {isGenerating ? (
                          <>
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            >
                              <FileDown className="w-4 h-4 mr-2" />
                            </motion.div>
                            {isArabic ? 'جاري الإنشاء...' : 'Generating...'}
                          </>
                        ) : (
                          <>
                            <FileText className="w-4 h-4 mr-2" />
                            {isArabic ? 'إنشاء التقرير' : 'Generate Report'}
                          </>
                        )}
                      </Button>
                    </FeatureGate>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Generated Reports */}
        <Card>
          <CardHeader>
            <CardTitle>{isArabic ? 'التقارير المُنشأة' : 'Generated Reports'}</CardTitle>
            <CardDescription>
              {isArabic ? 'التقارير المحفوظة متاحة للتحميل لمدة 30 يوماً' : 'Saved reports are available for download for 30 days'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {generatedReports.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {isArabic ? 'لا توجد تقارير منشأة بعد' : 'No generated reports yet'}
              </div>
            ) : (
              <div className="space-y-3">
                {generatedReports.map((report, index) => {
                  const reportType = reportTypes.find(r => r.id === report.type);
                  return (
                    <motion.div
                      key={report.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className={`p-2 rounded-lg ${reportType?.tier === 'pro' ? 'bg-gold/20 text-gold' : 'bg-background text-muted-foreground'}`}>
                        {reportType?.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{report.name}</span>
                          {reportType?.tier === 'pro' && (
                            <Badge variant="outline" className="text-xs">PRO</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{report.generatedAt}</span>
                          <span>{report.size}</span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => handleDownload(report.id)}
                      >
                        <Download className="w-4 h-4" />
                        {isArabic ? 'تحميل' : 'Download'}
                      </Button>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Report Preview Dialog */}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2">
              <FileText className="w-4 h-4" />
              {isArabic ? 'معاينة التقرير' : 'Preview Report'}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{isArabic ? 'معاينة التقرير' : 'Report Preview'}</DialogTitle>
              <DialogDescription>
                {isArabic ? 'نظرة عامة على محتوى التقرير' : 'Overview of report content'}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="aspect-[8.5/11] bg-muted rounded-lg p-6 overflow-hidden">
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-4">
                    <div>
                      <h3 className="text-lg font-bold">WealthOS{isArabic ? ' - ثروتي' : ''}</h3>
                      <p className="text-sm text-muted-foreground">{isArabic ? 'الملخص المالي الشهري' : 'Monthly Financial Summary'}</p>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <p>{isArabic ? 'يناير 2025' : 'January 2025'}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-background rounded-lg">
                      <p className="text-xs text-muted-foreground">{isArabic ? 'صافي الثروة' : 'Net Worth'}</p>
                      <p className="text-lg font-bold">{formatCurrency(612450, 'SAR', locale)}</p>
                    </div>
                    <div className="p-3 bg-background rounded-lg">
                      <p className="text-xs text-muted-foreground">{isArabic ? 'قيمة المحفظة' : 'Portfolio Value'}</p>
                      <p className="text-lg font-bold">{formatCurrency(485000, 'SAR', locale)}</p>
                    </div>
                    <div className="p-3 bg-background rounded-lg">
                      <p className="text-xs text-muted-foreground">{isArabic ? 'الدخل الشهري' : 'Monthly Income'}</p>
                      <p className="text-lg font-bold">{formatCurrency(28500, 'SAR', locale)}</p>
                    </div>
                    <div className="p-3 bg-background rounded-lg">
                      <p className="text-xs text-muted-foreground">{isArabic ? 'المصروفات' : 'Expenses'}</p>
                      <p className="text-lg font-bold">{formatCurrency(12450, 'SAR', locale)}</p>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <p className="text-xs text-muted-foreground text-center">
                      {isArabic ? 'هذه معاينة فقط. التقرير الكامل يتضمن رسوم بيانية وتحليلات مفصلة.' : 'This is a preview only. Full report includes charts and detailed analysis.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button className="gap-2">
                <Download className="w-4 h-4" />
                {isArabic ? 'تحميل PDF' : 'Download PDF'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardShell>
  );
}
