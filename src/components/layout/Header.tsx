'use client';

import Link from 'next/link';
import { Bell, Moon, Sun, Globe, Settings, PanelLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Show, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs';
import { useAppStore } from '@/store/useAppStore';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function Header() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const locale = useAppStore((state) => state.locale);
  const setLocale = useAppStore((state) => state.setLocale);
  const notificationFeed = useAppStore((state) => state.notificationFeed);
  const markAllNotificationsRead = useAppStore((state) => state.markAllNotificationsRead);
  const toggleSidebar = useAppStore((state) => state.toggleSidebar);
  const unreadCount = notificationFeed.filter((item) => !item.read).length;

  const isArabic = locale === 'ar';

  const handleThemeToggle = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleLanguageToggle = () => {
    setLocale(isArabic ? 'en' : 'ar');
  };

  return (
    <header className="glass sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/70 px-4 md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <Button variant="ghost" size="icon" className="hidden rounded-xl md:inline-flex" onClick={toggleSidebar}>
          <PanelLeft className="h-4 w-4" />
        </Button>
        <div className="hidden sm:block">
          <p className="text-sm font-medium text-foreground">
            {isArabic ? 'مساحة Wealix' : 'Wealix Workspace'}
          </p>
          <p className="text-xs text-muted-foreground">
            {isArabic ? 'نظام تشغيل الثروة الشخصية' : 'Personal Wealth Operating System'}
          </p>
        </div>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleLanguageToggle}
          className="hidden rounded-xl sm:flex"
          title={isArabic ? 'Switch to English' : 'التبديل إلى العربية'}
        >
          <Globe className="w-4 h-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleThemeToggle}
          className="rounded-xl"
          title={isArabic ? 'تبديل الوضع' : 'Toggle theme'}
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative rounded-xl">
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 bg-destructive text-destructive-foreground text-[10px] rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-80" align={isArabic ? 'start' : 'end'}>
            <DropdownMenuLabel className="flex items-center justify-between gap-2">
              <span>{isArabic ? 'الإشعارات' : 'Notifications'}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-auto px-2 py-1 text-xs"
                onClick={() => {
                  markAllNotificationsRead();
                  router.push('/settings?tab=preferences');
                }}
              >
                {isArabic ? 'عرض الكل' : 'View all'}
              </Button>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notificationFeed.map((item) => (
              <DropdownMenuItem key={item.id} asChild>
                <Link
                  href={item.href}
                  className="flex flex-col items-start gap-1"
                  onClick={() => markAllNotificationsRead()}
                >
                  <span className="font-medium">
                    {isArabic ? item.titleAr : item.title}
                  </span>
                  <span className="text-xs text-muted-foreground whitespace-normal">
                    {isArabic ? item.descriptionAr : item.description}
                  </span>
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="ghost" size="icon" className="rounded-xl" asChild>
          <Link href="/settings?tab=profile" title={isArabic ? 'الإعدادات' : 'Settings'}>
            <Settings className="w-4 h-4" />
          </Link>
        </Button>

        <div className="flex items-center gap-2 rounded-full border border-border bg-card px-1 py-1 shadow-sm">
          <Show when="signed-out">
            <SignInButton mode="modal">
              <Button variant="ghost" size="sm" className="rounded-full">{isArabic ? 'دخول' : 'Sign in'}</Button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button size="sm" className="btn-primary rounded-full">{isArabic ? 'إنشاء حساب' : 'Sign up'}</Button>
            </SignUpButton>
          </Show>
          <Show when="signed-in">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full">
              <UserButton
                appearance={{
                  elements: {
                    userButtonTrigger: 'flex h-9 w-9 items-center justify-center rounded-full',
                    userButtonBox: 'flex h-9 w-9 items-center justify-center',
                    avatarBox: 'h-9 w-9',
                  },
                }}
              />
            </div>
          </Show>
        </div>
      </div>
    </header>
  );
}
