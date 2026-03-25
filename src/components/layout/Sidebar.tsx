'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  TrendingUp,
  Wallet,
  Briefcase,
  Flame,
  PiggyBank,
  Receipt,
  Bot,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/useAppStore';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const navItems = [
  { href: '/', label: { en: 'Dashboard', ar: 'لوحة التحكم' }, icon: LayoutDashboard },
  { href: '/income', label: { en: 'Income', ar: 'الدخل' }, icon: TrendingUp },
  { href: '/expenses', label: { en: 'Expenses', ar: 'المصروفات' }, icon: Receipt },
  { href: '/net-worth', label: { en: 'Net Worth', ar: 'صافي الثروة' }, icon: Wallet },
  { href: '/portfolio', label: { en: 'Portfolio', ar: 'المحفظة' }, icon: Briefcase },
  { href: '/fire', label: { en: 'FIRE Tracker', ar: 'متعقب FIRE' }, icon: Flame },
  { href: '/retirement', label: { en: 'Retirement', ar: 'التقاعد' }, icon: PiggyBank },
  { href: '/budget', label: { en: 'Budget', ar: 'الميزانية' }, icon: Wallet },
  { href: '/advisor', label: { en: 'AI Advisor', ar: 'المستشار المالي' }, icon: Bot, pro: true },
  { href: '/reports', label: { en: 'Reports', ar: 'التقارير' }, icon: FileText },
  { href: '/settings', label: { en: 'Settings', ar: 'الإعدادات' }, icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { locale, sidebarCollapsed, toggleSidebar } = useAppStore();
  const isArabic = locale === 'ar';

  return (
    <TooltipProvider delayDuration={0}>
      <motion.aside
        initial={false}
        animate={{ width: sidebarCollapsed ? 72 : 240 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className={cn(
          'hidden md:flex flex-col h-screen bg-sidebar border-l border-sidebar-border',
          'fixed bottom-0 top-0 z-40',
          isArabic ? 'right-0' : 'left-0'
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-center border-b border-sidebar-border px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center">
              <span className="text-navy-dark font-bold text-lg">W</span>
            </div>
            {!sidebarCollapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="font-bold text-lg text-sidebar-foreground"
              >
                {isArabic ? 'ثروتي' : 'WealthOS'}
              </motion.span>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-4">
          <nav className="space-y-1 px-3">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              const NavItem = (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                    'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                    isActive && 'bg-primary text-primary-foreground font-medium',
                    sidebarCollapsed && 'justify-center'
                  )}
                >
                  <Icon className={cn('w-5 h-5 shrink-0', isActive && 'text-primary-foreground')} />
                  {!sidebarCollapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="truncate"
                    >
                      {isArabic ? item.label.ar : item.label.en}
                      {item.pro && (
                        <span className="ml-2 text-xs bg-gold/20 text-gold px-1.5 py-0.5 rounded">
                          PRO
                        </span>
                      )}
                    </motion.span>
                  )}
                </Link>
              );

              if (sidebarCollapsed) {
                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>{NavItem}</TooltipTrigger>
                    <TooltipContent side={isArabic ? 'left' : 'right'}>
                      {isArabic ? item.label.ar : item.label.en}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return NavItem;
            })}
          </nav>
        </ScrollArea>

        {/* Collapse Toggle */}
        <div className="p-3 border-t border-sidebar-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className="w-full justify-center"
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
