'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DashboardShell } from '@/components/layout';
import { DashboardSkeleton } from '@/components/shared';
import { getStartPageHref } from '@/lib/start-page';
import { useAppStore } from '@/store/useAppStore';
import { Button } from '@/components/ui/button';

/**
 * Client component that handles navigation to the user's start page.
 * Only rendered after the Server Component in page.tsx confirms onboarding is complete.
 */
export default function AppEntryClient() {
  const router = useRouter();
  const startPage = useAppStore((state) => state.startPage);
  const locale = useAppStore((state) => state.locale);
  const targetHref = getStartPageHref(startPage);
  const isArabic = locale === 'ar';

  useEffect(() => {
    if (targetHref !== '/dashboard') {
      router.replace(targetHref);
    }
  }, [router, targetHref]);

  if (targetHref !== '/dashboard') {
    return (
      <DashboardShell>
        <DashboardSkeleton />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm md:p-8">
          <p className="text-sm font-medium text-primary">
            {isArabic ? 'مساحة العمل الرئيسية' : 'Home dashboard'}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
            {isArabic ? 'مرحباً بك في Wealix' : 'Welcome to Wealix'}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
            {isArabic
              ? 'اختر من هنا أين تريد أن تبدأ: راقب المحفظة، حدّث الدخل والمصروفات، أو افتح المستشار الذكي.'
              : 'Start from the area that matters most right now: review your portfolio, update cash flow, or open the AI advisor.'}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/portfolio">{isArabic ? 'المحفظة' : 'Open portfolio'}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/income">{isArabic ? 'الدخل' : 'Update income'}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/expenses">{isArabic ? 'المصروفات' : 'Track expenses'}</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/advisor">{isArabic ? 'المستشار الذكي' : 'Ask AI advisor'}</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Link
            href="/net-worth"
            className="rounded-2xl border border-border bg-card p-5 transition-colors hover:bg-muted/40"
          >
            <p className="text-sm font-medium text-foreground">
              {isArabic ? 'صافي الثروة' : 'Net worth'}
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {isArabic ? 'راجع الصورة الكاملة لأصولك والتزاماتك.' : 'Review the full picture of your assets and liabilities.'}
            </p>
          </Link>
          <Link
            href="/budget-planning"
            className="rounded-2xl border border-border bg-card p-5 transition-colors hover:bg-muted/40"
          >
            <p className="text-sm font-medium text-foreground">
              {isArabic ? 'الموازنة والتخطيط' : 'Budget and planning'}
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {isArabic ? 'حدّث حدود الإنفاق وخطة الادخار.' : 'Adjust spending limits and savings plans.'}
            </p>
          </Link>
          <Link
            href="/settings"
            className="rounded-2xl border border-border bg-card p-5 transition-colors hover:bg-muted/40"
          >
            <p className="text-sm font-medium text-foreground">
              {isArabic ? 'الإعدادات' : 'Settings'}
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {isArabic ? 'غيّر الصفحة الافتراضية واللغة وتفضيلات الحساب.' : 'Update your default start page, language, and account preferences.'}
            </p>
          </Link>
        </div>
      </section>
    </DashboardShell>
  );
}
