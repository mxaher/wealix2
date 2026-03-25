'use client';

import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/useAppStore';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { BottomNav } from './BottomNav';

interface DashboardShellProps {
  children: React.ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
  const locale = useAppStore((state) => state.locale);
  const sidebarCollapsed = useAppStore((state) => state.sidebarCollapsed);
  const isMobile = useAppStore((state) => state.isMobile);
  const setIsMobile = useAppStore((state) => state.setIsMobile);
  const isArabic = locale === 'ar';

  // Handle responsive behavior
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [setIsMobile]);

  return (
    <div
      className={cn(
        'min-h-screen bg-background',
        isArabic && 'font-[family-name:var(--font-tajawal)]'
      )}
      dir={isArabic ? 'rtl' : 'ltr'}
    >
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div
        className={cn(
          'transition-all duration-200',
          'md:transition-none',
          // Desktop: Add margin for sidebar
          !isMobile && (
            sidebarCollapsed
              ? isArabic ? 'md:mr-[72px]' : 'md:ml-[72px]'
              : isArabic ? 'md:mr-[240px]' : 'md:ml-[240px]'
          )
        )}
      >
        {/* Header */}
        <Header />

        {/* Page Content */}
        <main className="p-4 md:p-6 pb-24 md:pb-6">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
