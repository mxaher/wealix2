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
  ChevronLeft,
  ChevronRight,
  Lock,
  CalendarRange,
  ArrowLeftRight,
  Lightbulb,
  Bell,
  Target,
  Moon,
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
    title: { en: 'Planning', ar: 'التخطيط' },
    items: [
      { href: '/goals', label: { en: 'Goals', ar: 'الأهداف' }, icon: Target },
      { href: '/zakat', label: { en: 'Zakat', ar: 'الزكاة' }, icon: Moon },
      { href: '/alerts', label: { en: 'Alerts', ar: 'التنبيهات' }, icon: Bell },
    ],
  },
  {
    title: { en: 'Tools', ar: 'الأدوات' },
    items: [
      { href: '/insights', label: { en: 'Insights', ar: 'الرؤى' }, icon: Lightbulb },
      { href: '/converter', label: { en: 'Converter', ar: 'المحول' }, icon: ArrowLeftRight },
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
    ? isArabic ? 'تجريبي' : 'Trial'
    : tier === 'pro'
      ? 'Pro'
      : tier === 'core'
        ? 'Core'
        : isArabic ? 'الاشتراك' : 'Free';

  const isNavItemActive = (href: string) => {
    if (pathname === href) return true;

    if (href === '/budget-planning') {
      return pathname === '/budget' || pathname === '/planning' || pathname.startsWith('/budget-planning/');
    }

    if (href === '/alerts') {
      return pathname.startsWith('/alerts') || pathname.startsWith('/notifications');
    }

    return pathname.startsWith(`${href}/`);
  };

  return (
    <TooltipProvider delayDuration={0}>
      <motion.aside
        initial={false}
        animate={{ width: sidebarCollapsed ? 72 : 260 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        dir={isArabic ? 'rtl' : 'ltr'}
        className={cn(
          'sidebar hidden h-screen flex-col border-sidebar-border bg-sidebar md:flex',
          isArabic ? 'border-l' : 'border-r',
          'fixed bottom-0 top-0 z-40'
        )}
        style={{ [isArabic ? 'right' : 'left']: 0 }}
      >
        {/* Logo area — 56px to match header */}
        <div
          className={cn(
            'flex h-14 items-center justify-between border-b border-sidebar-border px-4',
            isArabic && 'flex-row-reverse'
          )}
        >
          <Link href={startPageHref} className="overflow-hidden">
            <WealixLogo compact={sidebarCollapsed} textClassName={sidebarCollapsed ? 'sr-only' : ''} />
          </Link>
          {!sidebarCollapsed && (
            <span className="text-[11px] font-medium text-muted-foreground">
              {subscriptionLabel}
            </span>
          )}
        </div>

        <ScrollArea className="flex-1 py-4">
          <nav className={cn('space-y-1 px-3', isArabic && !sidebarCollapsed && 'text-right')}>
            {navSections.map((section) => (
              <div key={section.title.en} className="mb-1">
                {!sidebarCollapsed && (
                  <div className={cn('sidebar-group-label', isArabic && 'text-right')}>
                    {isArabic ? section.title.ar : section.title.en}
                  </div>
                )}
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const isActive = isNavItemActive(item.href);
                    const Icon = item.icon;
                    const isLocked = item.pro && !isPro;

                    const navItem = (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          'sidebar-item',
                          isActive && 'active',
                          isLocked && 'opacity-50',
                          isArabic && !sidebarCollapsed && 'flex-row-reverse text-right',
                          sidebarCollapsed && 'justify-center px-0'
                        )}
                      >
                        <Icon
                          className={cn(
                            'h-4 w-4 shrink-0',
                            isActive ? 'stroke-[1.5]' : 'stroke-[1.2]'
                          )}
                        />
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
                            <span className="rounded border border-primary/20 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-primary uppercase [margin-inline-start:auto]">
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
              </div>
            ))}
          </nav>
        </ScrollArea>

        {/* Collapse toggle — no promo block */}
        <div className="border-t border-sidebar-border p-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className="w-full justify-center rounded-lg text-muted-foreground hover:bg-transparent hover:text-foreground"
          >
            {sidebarCollapsed ? (
              isArabic ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
            ) : (
              isArabic ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
      </motion.aside>
    </TooltipProvider>
  );
}
