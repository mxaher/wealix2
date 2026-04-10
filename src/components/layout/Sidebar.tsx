'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  TrendingUp,
  Briefcase,
  Flame,
  PiggyBank,
  Receipt,
  Bot,
  FileText,
  Settings,
  ChartNoAxesCombined,
  Landmark,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Lock,
  CalendarRange,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/useAppStore';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { WealixLogo } from '@/components/shared/WealixLogo';
import { useSubscription } from '@/store/useAppStore';
import { getStartPageHref } from '@/lib/start-page';

const navSections = [
  {
    title: { en: 'Overview', ar: 'نظرة عامة' },
    items: [
      { href: '/dashboard', label: { en: 'Dashboard', ar: 'لوحة التحكم' }, icon: LayoutDashboard },
      { href: '/net-worth', label: { en: 'Net Worth', ar: 'صافي الثروة' }, icon: ChartNoAxesCombined },
      { href: '/budget-planning', label: { en: 'Budget & Planning', ar: 'الموازنة والتخطيط' }, icon: CalendarRange },
      { href: '/reports', label: { en: 'Reports', ar: 'التقارير' }, icon: FileText },
    ],
  },
  {
    title: { en: 'Cash Flow', ar: 'التدفقات النقدية' },
    items: [
      { href: '/income', label: { en: 'Income', ar: 'الدخل' }, icon: TrendingUp },
      { href: '/expenses', label: { en: 'Expenses', ar: 'المصروفات' }, icon: Receipt },
    ],
  },
  {
    title: { en: 'Investing', ar: 'الاستثمار' },
    items: [
      { href: '/portfolio', label: { en: 'Portfolio', ar: 'المحفظة' }, icon: Briefcase },
      { href: '/fire', label: { en: 'FIRE Tracker', ar: 'متعقب FIRE' }, icon: Flame },
      { href: '/retirement', label: { en: 'Retirement', ar: 'التقاعد' }, icon: PiggyBank },
    ],
  },
  {
    title: { en: 'Tools', ar: 'الأدوات' },
    items: [
      { href: '/advisor', label: { en: 'AI Advisor', ar: 'المستشار المالي' }, icon: Bot, pro: true },
      { href: '/settings', label: { en: 'Settings', ar: 'الإعدادات' }, icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { locale, sidebarCollapsed, toggleSidebar, startPage } = useAppStore();
  const { tier, trialActive, isPro } = useSubscription();
  const isArabic = locale === 'ar';
  const startPageHref = getStartPageHref(startPage);
  const subscriptionLabel = trialActive
    ? isArabic
      ? 'تجريبي'
      : 'Trial'
    : tier === 'pro'
      ? 'Pro'
      : tier === 'core'
        ? 'Core'
        : isArabic
          ? 'الاشتراك'
          : 'Subscription';

  return (
    <TooltipProvider delayDuration={0}>
      <motion.aside
        initial={false}
        animate={{ width: sidebarCollapsed ? 84 : 280 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        dir={isArabic ? 'rtl' : 'ltr'}
        className={cn(
          'sidebar hidden h-screen flex-col border-sidebar-border bg-sidebar/96 backdrop-blur-sm md:flex',
          isArabic ? 'border-l' : 'border-r',
          'fixed bottom-0 top-0 z-40',
          isArabic ? 'right-0' : 'left-0'
        )}
      >
        <div
          className={cn(
            'flex h-16 items-center justify-between border-b border-sidebar-border px-4',
            isArabic && 'flex-row-reverse'
          )}
        >
          <Link href={startPageHref} className="overflow-hidden">
            <WealixLogo compact={sidebarCollapsed} textClassName={sidebarCollapsed ? 'sr-only' : ''} />
          </Link>
          {!sidebarCollapsed && (
            <div className="rounded-full bg-accent/10 px-2 py-1 text-[11px] font-medium text-accent">
              {subscriptionLabel}
            </div>
          )}
        </div>

        <ScrollArea className="flex-1 py-4">
          <nav className={cn('space-y-5 px-3', isArabic && !sidebarCollapsed && 'text-right')}>
            {navSections.map((section) => (
              <div key={section.title.en} className="space-y-1">
                {!sidebarCollapsed && (
                  <div className={cn(
                    'px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground',
                    isArabic && 'text-right'
                  )}>
                    {isArabic ? section.title.ar : section.title.en}
                  </div>
                )}
                {section.items.map((item) => {
                  const isActive = pathname === item.href || (item.href === '/budget-planning' && (pathname === '/budget' || pathname === '/planning'));
                  const Icon = item.icon;
                  const isLocked = item.pro && !isPro;

                  const navItem = (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'sidebar-item',
                        isActive && 'active',
                        isLocked && 'opacity-60',
                        isArabic && !sidebarCollapsed && 'flex-row-reverse text-right',
                        sidebarCollapsed && 'justify-center px-2'
                      )}
                    >
                      <Icon className="h-4.5 w-4.5 shrink-0" />
                      {!sidebarCollapsed && (
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="truncate"
                        >
                          {isArabic ? item.label.ar : item.label.en}
                        </motion.span>
                      )}
                      {!sidebarCollapsed && item.pro && (
                        isLocked ? (
                          <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground [margin-inline-start:auto]" />
                        ) : (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold tracking-[0.08em] text-primary uppercase [margin-inline-start:auto]">
                            Pro
                          </span>
                        )
                      )}
                      {sidebarCollapsed && isLocked && (
                        <Lock className="absolute bottom-1 end-1 h-3 w-3 text-muted-foreground" />
                      )}
                    </Link>
                  );

                  if (sidebarCollapsed) {
                    return (
                      <Tooltip key={item.href}>
                        <TooltipTrigger asChild>{navItem}</TooltipTrigger>
                        <TooltipContent side={isArabic ? 'left' : 'right'}>
                          {isArabic ? item.label.ar : item.label.en}
                        </TooltipContent>
                      </Tooltip>
                    );
                  }

                  return navItem;
                })}
              </div>
            ))}
          </nav>
        </ScrollArea>

        <div className="border-t border-sidebar-border p-3">
          {!sidebarCollapsed && (
            <div className="mb-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-card">
              <div className={cn('flex items-center gap-3', isArabic && 'flex-row-reverse text-right')}>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {isArabic ? 'Wealix Secure' : 'Wealix Secure'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isArabic ? 'مساحة مالية آمنة' : 'Protected personal workspace'}
                  </p>
                </div>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className="w-full justify-center rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            {sidebarCollapsed ? (
              isArabic ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
            ) : (
              isArabic ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />
            )}
          </Button>
        </div>
      </motion.aside>
    </TooltipProvider>
  );
}
