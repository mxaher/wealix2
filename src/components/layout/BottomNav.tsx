'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  TrendingUp,
  Wallet,
  Briefcase,
  Receipt,
  Bot,
  Menu,
  Lock,
  BookOpenText,
  Flame,
  PiggyBank,
  FileText,
  Settings,
  CalendarRange,
  ArrowLeftRight,
  Lightbulb,
  Bell,
  Target,
  Moon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore, useSubscription } from '@/store/useAppStore';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getStartPageHref } from '@/lib/start-page';

const bottomNavItems = [
  { href: '/portfolio', label: { en: 'Portfolio', ar: 'المحفظة' }, icon: Briefcase },
  { href: '/budget-planning', label: { en: 'Budget', ar: 'الموازنة' }, icon: CalendarRange },
  { href: '/net-worth', label: { en: 'Net Worth', ar: 'صافي الثروة' }, icon: Wallet },
  { href: '/expenses', label: { en: 'Expenses', ar: 'المصروفات' }, icon: Receipt },
];

const allNavItems = [
  { href: '/dashboard', label: { en: 'Dashboard', ar: 'لوحة التحكم' }, icon: LayoutDashboard },
  { href: '/income', label: { en: 'Income', ar: 'الدخل' }, icon: TrendingUp },
  { href: '/expenses', label: { en: 'Expenses', ar: 'المصروفات' }, icon: Receipt },
  { href: '/net-worth', label: { en: 'Net Worth', ar: 'صافي الثروة' }, icon: Wallet },
  { href: '/portfolio', label: { en: 'Portfolio', ar: 'المحفظة' }, icon: Briefcase },
  { href: '/fire', label: { en: 'FIRE Tracker', ar: 'متعقب FIRE' }, icon: Flame },
  { href: '/retirement', label: { en: 'Retirement', ar: 'التقاعد' }, icon: PiggyBank },
  { href: '/budget-planning', label: { en: 'Budget & Planning', ar: 'الموازنة والتخطيط' }, icon: CalendarRange },
  { href: '/goals', label: { en: 'Goals', ar: 'الأهداف' }, icon: Target },
  { href: '/zakat', label: { en: 'Zakat', ar: 'الزكاة' }, icon: Moon },
  { href: '/alerts', label: { en: 'Alerts', ar: 'التنبيهات' }, icon: Bell },
  { href: '/insights', label: { en: 'Insights', ar: 'الرؤى' }, icon: Lightbulb },
  { href: '/converter', label: { en: 'Converter', ar: 'المحول' }, icon: ArrowLeftRight },
  { href: '/advisor', label: { en: 'AI Advisor', ar: 'المستشار المالي' }, icon: Bot, pro: true },
  { href: '/help', label: { en: 'Documentation', ar: 'التوثيق' }, icon: BookOpenText },
  { href: '/reports', label: { en: 'Reports', ar: 'التقارير' }, icon: FileText },
  { href: '/settings', label: { en: 'Settings', ar: 'الإعدادات' }, icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();
  const { locale, startPage } = useAppStore();
  const { isPro } = useSubscription();
  const isArabic = locale === 'ar';
  const startPageHref = getStartPageHref(startPage);

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
    <>
      {/* Mobile Bottom Navigation */}
      <nav className="glass md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border/70">
        <div className="flex items-center justify-around h-16 px-2">
          {bottomNavItems.map((item) => {
            const href = item.href === 'start-page' ? startPageHref : item.href;
            const isActive = isNavItemActive(href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={href}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-lg transition-colors',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className={cn('w-5 h-5', isActive && 'text-primary')} />
                <span className="text-[10px] font-medium">
                  {isArabic ? item.label.ar : item.label.en}
                </span>
              </Link>
            );
          })}

          {/* More Menu */}
          <Sheet>
            <SheetTrigger asChild>
              <button className="flex flex-col items-center justify-center gap-1 rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:text-foreground">
                <Menu className="w-5 h-5" />
                <span className="text-[10px] font-medium">
                  {isArabic ? 'المزيد' : 'More'}
                </span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[60vh] rounded-t-2xl">
              <SheetHeader className="mb-2">
                <SheetTitle>
                  {isArabic ? 'القائمة' : 'Menu'}
                </SheetTitle>
              </SheetHeader>
                <ScrollArea className="h-[calc(60vh-5rem)]">
                  <div className="grid grid-cols-3 gap-4">
                    {allNavItems.map((item) => {
                      const isActive = isNavItemActive(item.href);
                      const Icon = item.icon;
                      const isLocked = item.pro && !isPro;

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            'relative flex flex-col items-center justify-center gap-2 p-4 rounded-xl transition-colors',
                            isActive
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted hover:bg-muted/80',
                            isLocked && 'opacity-60'
                          )}
                        >
                          <Icon className="w-6 h-6" />
                          <span className="text-xs font-medium text-center">
                            {isArabic ? item.label.ar : item.label.en}
                          </span>
                          {isLocked && (
                            <Lock className="absolute top-2 end-2 h-3 w-3 text-muted-foreground" />
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </ScrollArea>
            </SheetContent>
          </Sheet>
        </div>
      </nav>

      {/* Safe area for iOS */}
      <div className="md:hidden h-[env(safe-area-inset-bottom)]" />
    </>
  );
}
