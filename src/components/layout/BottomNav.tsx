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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/useAppStore';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Flame,
  PiggyBank,
  FileText,
  Settings,
} from 'lucide-react';

const bottomNavItems = [
  { href: '/', label: { en: 'Home', ar: 'الرئيسية' }, icon: LayoutDashboard },
  { href: '/income', label: { en: 'Income', ar: 'الدخل' }, icon: TrendingUp },
  { href: '/expenses', label: { en: 'Expenses', ar: 'المصروفات' }, icon: Receipt },
  { href: '/advisor', label: { en: 'AI', ar: 'المستشار' }, icon: Bot },
];

const allNavItems = [
  { href: '/', label: { en: 'Dashboard', ar: 'لوحة التحكم' }, icon: LayoutDashboard },
  { href: '/income', label: { en: 'Income', ar: 'الدخل' }, icon: TrendingUp },
  { href: '/expenses', label: { en: 'Expenses', ar: 'المصروفات' }, icon: Receipt },
  { href: '/net-worth', label: { en: 'Net Worth', ar: 'صافي الثروة' }, icon: Wallet },
  { href: '/portfolio', label: { en: 'Portfolio', ar: 'المحفظة' }, icon: Briefcase },
  { href: '/fire', label: { en: 'FIRE Tracker', ar: 'متعقب FIRE' }, icon: Flame },
  { href: '/retirement', label: { en: 'Retirement', ar: 'التقاعد' }, icon: PiggyBank },
  { href: '/budget', label: { en: 'Budget', ar: 'الميزانية' }, icon: Wallet },
  { href: '/advisor', label: { en: 'AI Advisor', ar: 'المستشار المالي' }, icon: Bot },
  { href: '/reports', label: { en: 'Reports', ar: 'التقارير' }, icon: FileText },
  { href: '/settings', label: { en: 'Settings', ar: 'الإعدادات' }, icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();
  const { locale } = useAppStore();
  const isArabic = locale === 'ar';

  return (
    <>
      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border">
        <div className="flex items-center justify-around h-16 px-2">
          {bottomNavItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
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
              <button className="flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-lg text-muted-foreground hover:text-foreground transition-colors">
                <Menu className="w-5 h-5" />
                <span className="text-[10px] font-medium">
                  {isArabic ? 'المزيد' : 'More'}
                </span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[60vh] rounded-t-2xl">
              <div className="py-4">
                <h3 className="text-lg font-semibold mb-4">
                  {isArabic ? 'القائمة' : 'Menu'}
                </h3>
                <ScrollArea className="h-[calc(60vh-6rem)]">
                  <div className="grid grid-cols-3 gap-4">
                    {allNavItems.map((item) => {
                      const isActive = pathname === item.href;
                      const Icon = item.icon;

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            'flex flex-col items-center justify-center gap-2 p-4 rounded-xl transition-colors',
                            isActive
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted hover:bg-muted/80'
                          )}
                        >
                          <Icon className="w-6 h-6" />
                          <span className="text-xs font-medium text-center">
                            {isArabic ? item.label.ar : item.label.en}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>

      {/* Safe area for iOS */}
      <div className="md:hidden h-[env(safe-area-inset-bottom)]" />
    </>
  );
}
