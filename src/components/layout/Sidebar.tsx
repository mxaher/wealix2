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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/useAppStore';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { WealixLogo } from '@/components/shared/WealixLogo';

const navSections = [
  {
    title: { en: 'Overview', ar: 'نظرة عامة' },
    items: [
      { href: '/app', label: { en: 'Dashboard', ar: 'لوحة التحكم' }, icon: LayoutDashboard },
      { href: '/net-worth', label: { en: 'Net Worth', ar: 'صافي الثروة' }, icon: ChartNoAxesCombined },
      { href: '/budget', label: { en: 'Budget', ar: 'الميزانية' }, icon: Landmark },
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
  const { locale, sidebarCollapsed, toggleSidebar } = useAppStore();
  const isArabic = locale === 'ar';

  return (
    <TooltipProvider delayDuration={0}>
      <motion.aside
        initial={false}
        animate={{ width: sidebarCollapsed ? 84 : 280 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className={cn(
          'sidebar hidden md:flex flex-col h-screen border-r border-sidebar-border bg-sidebar/96 backdrop-blur-sm',
          'fixed bottom-0 top-0 z-40',
          isArabic ? 'right-0' : 'left-0'
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
          <Link href="/app" dir="ltr" className="overflow-hidden">
            <WealixLogo compact={sidebarCollapsed} textClassName={sidebarCollapsed ? 'sr-only' : ''} />
          </Link>
          {!sidebarCollapsed && (
            <div className="rounded-full bg-accent/10 px-2 py-1 text-[11px] font-medium text-accent">
              Core / Pro
            </div>
          )}
        </div>

        <ScrollArea className="flex-1 py-4">
          <nav className="space-y-5 px-3">
            {navSections.map((section) => (
              <div key={section.title.en} className="space-y-1">
                {!sidebarCollapsed && (
                  <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {isArabic ? section.title.ar : section.title.en}
                  </div>
                )}
                {section.items.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;

                  const navItem = (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'sidebar-item',
                        isActive && 'active',
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
                        <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold tracking-[0.08em] text-primary uppercase">
                          Pro
                        </span>
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
              <div className="flex items-center gap-3">
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
