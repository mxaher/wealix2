'use client';

import { Bell, Search, Moon, Sun, Globe, User, LogOut, Settings } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAppStore } from '@/store/useAppStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function Header() {
  const { theme, setTheme } = useTheme();
  const locale = useAppStore((state) => state.locale);
  const setLocale = useAppStore((state) => state.setLocale);
  const user = useAppStore((state) => state.user);

  const isArabic = locale === 'ar';

  const handleThemeToggle = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleLanguageToggle = () => {
    setLocale(isArabic ? 'en' : 'ar');
  };

  return (
    <header className="h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-30 flex items-center justify-between px-4 md:px-6 transition-all duration-200">
      {/* Search */}
      <div className="flex items-center gap-4 flex-1 max-w-md">
        <div className="relative w-full hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={isArabic ? 'بحث...' : 'Search...'}
            className="pl-9 bg-muted/50"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Language Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleLanguageToggle}
          className="hidden sm:flex"
          title={isArabic ? 'Switch to English' : 'التبديل إلى العربية'}
        >
          <Globe className="w-4 h-4" />
        </Button>

        {/* Theme Toggle - CSS-based icon switching for SSR compatibility */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleThemeToggle}
          title={isArabic ? 'تبديل الوضع' : 'Toggle theme'}
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-4 h-4" />
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] rounded-full flex items-center justify-center">
            3
          </span>
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9">
                <AvatarImage src={user?.avatarUrl || ''} alt={user?.name || ''} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {user?.name?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align={isArabic ? 'start' : 'end'}>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{user?.name || 'Demo User'}</p>
                <p className="text-xs text-muted-foreground">
                  {user?.email || 'demo@wealthos.com'}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              <span>{isArabic ? 'الملف الشخصي' : 'Profile'}</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              <span>{isArabic ? 'الإعدادات' : 'Settings'}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              <span>{isArabic ? 'تسجيل الخروج' : 'Log out'}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
