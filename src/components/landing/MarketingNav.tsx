'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import {
  BookOpen,
  ChevronDown,
  GitCompare,
  Globe,
  Mail,
  Menu,
  Moon,
  Sun,
  TrendingUp,
  X,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuth } from '@clerk/nextjs';
import { useAppStore } from '@/store/useAppStore';
import { Button } from '@/components/ui/button';
import { WealixLogo } from '@/components/shared/WealixLogo';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Nav data
// ---------------------------------------------------------------------------
const navData = {
  en: {
    anchorLinks: [
      { id: 'features', label: 'Features' },
      { id: 'pricing', label: 'Pricing' },
      { id: 'faq', label: 'FAQ' },
    ],
    dropdown: {
      label: 'More',
      items: [
        { href: '/blog', label: 'Blog', icon: BookOpen },
        { href: '/markets', label: 'Markets', icon: TrendingUp },
        { href: '/vs', label: 'Comparisons', icon: GitCompare },
      ],
    },
    contact: { href: '/contact', label: 'Contact Us', icon: Mail },
    login: 'Log In',
    register: 'Get Started',
    openApp: 'Open App',
    langToggle: 'العربية',
    themeToggle: 'Toggle theme',
    close: 'Close menu',
  },
  ar: {
    anchorLinks: [
      { id: 'features', label: 'المميزات' },
      { id: 'pricing', label: 'الأسعار' },
      { id: 'faq', label: 'الأسئلة الشائعة' },
    ],
    dropdown: {
      label: 'المزيد',
      items: [
        { href: '/blog', label: 'المدونة', icon: BookOpen },
        { href: '/markets', label: 'الأسواق', icon: TrendingUp },
        { href: '/vs', label: 'مقارنات', icon: GitCompare },
      ],
    },
    contact: { href: '/contact', label: 'تواصل معنا', icon: Mail },
    login: 'تسجيل الدخول',
    register: 'ابدأ الآن',
    openApp: 'افتح التطبيق',
    langToggle: 'English',
    themeToggle: 'تبديل الوضع',
    close: 'إغلاق القائمة',
  },
} as const;

// ---------------------------------------------------------------------------
// Dropdown component
// ---------------------------------------------------------------------------
interface DropdownItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

function MoreDropdown({
  label,
  items,
  isArabic,
}: {
  label: string;
  items: readonly DropdownItem[];
  isArabic: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleMouseEnter() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpen(true);
  }

  function handleMouseLeave() {
    timeoutRef.current = setTimeout(() => setOpen(false), 150);
  }

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="true"
        className={cn(
          'flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground',
          open && 'text-foreground',
        )}
      >
        {label}
        <ChevronDown
          className={cn('h-3.5 w-3.5 transition-transform duration-200', open && 'rotate-180')}
        />
      </button>

      {/* Dropdown panel */}
      <div
        role="menu"
        className={cn(
          'absolute top-full z-50 mt-2 w-44 origin-top overflow-hidden rounded-xl border border-border/70 bg-background/95 shadow-lg backdrop-blur-md',
          // RTL-aware alignment: open toward the center of the page
          isArabic ? 'left-0' : 'right-0',
          // Animation
          'transition-all duration-200',
          open ? 'scale-y-100 opacity-100' : 'pointer-events-none scale-y-95 opacity-0',
        )}
      >
        <div className="p-1">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground',
                'transition-colors hover:bg-accent hover:text-foreground',
              )}
            >
              <item.icon className="h-3.5 w-3.5 shrink-0" />
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mobile menu content
// ---------------------------------------------------------------------------
function MobileMenu({
  data,
  isArabic,
  showSections,
  clerkSignedIn,
  onLocaleToggle,
  onThemeToggle,
  theme,
  onClose,
}: {
  data: (typeof navData)['en'] | (typeof navData)['ar'];
  isArabic: boolean;
  showSections: boolean;
  clerkSignedIn: boolean;
  onLocaleToggle: () => void;
  onThemeToggle: () => void;
  theme: string | undefined;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col gap-1 px-2 py-4" dir={isArabic ? 'rtl' : 'ltr'}>
      {/* Anchor links */}
      {showSections &&
        data.anchorLinks.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            onClick={onClose}
            className="rounded-lg px-3 py-2.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
          >
            {item.label}
          </a>
        ))}

      {/* Dropdown items (flat in mobile) */}
      {data.dropdown.items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={onClose}
          className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
        >
          <item.icon className="h-4 w-4 shrink-0" />
          {item.label}
        </Link>
      ))}

      {/* Contact */}
      <Link
        href={data.contact.href}
        onClick={onClose}
        className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
      >
        <data.contact.icon className="h-4 w-4 shrink-0" />
        {data.contact.label}
      </Link>

      <div className="my-2 h-px bg-border" />

      {/* Utility row */}
      <div className="flex items-center gap-2 px-3">
        <Button
          variant="outline"
          size="sm"
          className="rounded-full"
          onClick={onLocaleToggle}
        >
          <Globe className="me-1.5 h-3.5 w-3.5" />
          {data.langToggle}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={onThemeToggle}
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>
      </div>

      <div className="mt-2 flex flex-col gap-2 px-3">
        {!clerkSignedIn ? (
          <>
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/sign-in" onClick={onClose}>
                {data.login}
              </Link>
            </Button>
            <Button asChild className="btn-primary rounded-full">
              <Link href="/sign-up" onClick={onClose}>
                {data.register}
              </Link>
            </Button>
          </>
        ) : (
          <Button asChild className="btn-primary rounded-full">
            <Link href="/app" onClick={onClose}>
              {data.openApp}
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
interface MarketingNavProps {
  /** Pass true on the landing page to show Features/Pricing/FAQ anchor links */
  showSections?: boolean;
}

export function MarketingNav({ showSections = false }: MarketingNavProps) {
  const { theme, setTheme } = useTheme();
  const locale = useAppStore((state) => state.locale);
  const setLocale = useAppStore((state) => state.setLocale);
  const isArabic = locale === 'ar';
  const { isLoaded, isSignedIn } = useAuth();
  const clerkSignedIn = isLoaded && isSignedIn;

  const [mobileOpen, setMobileOpen] = useState(false);
  const data = isArabic ? navData.ar : navData.en;

  function toggleLocale() {
    setLocale(isArabic ? 'en' : 'ar');
  }

  function toggleTheme() {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }

  return (
    <nav
      dir={isArabic ? 'rtl' : 'ltr'}
      className="glass fixed inset-x-0 top-0 z-50 border-b border-border/70"
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* ── Brand ─────────────────────────────────────────────────────────── */}
        <Link href="/" className="shrink-0">
          <WealixLogo />
        </Link>

        {/* ── Desktop nav ───────────────────────────────────────────────────── */}
        <div className="hidden items-center gap-6 md:flex">
          {/* Anchor links (landing page only) */}
          {showSections &&
            data.anchorLinks.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </a>
            ))}

          {/* Divider after anchors */}
          {showSections && (
            <span className="h-4 w-px bg-border" aria-hidden="true" />
          )}

          {/* More dropdown */}
          <MoreDropdown
            label={data.dropdown.label}
            items={data.dropdown.items}
            isArabic={isArabic}
          />

          {/* Contact Us */}
          <Link
            href={data.contact.href}
            className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <data.contact.icon className="h-3.5 w-3.5" />
            {data.contact.label}
          </Link>
        </div>

        {/* ── Desktop actions ───────────────────────────────────────────────── */}
        <div className="hidden items-center gap-2 md:flex">
          {/* Language toggle */}
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full px-3 text-xs font-medium"
            onClick={toggleLocale}
            title={data.langToggle}
          >
            <Globe className="me-1.5 h-3.5 w-3.5" />
            {data.langToggle}
          </Button>

          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={toggleTheme}
            title={data.themeToggle}
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>

          {/* Auth actions */}
          {!clerkSignedIn && (
            <>
              <Button asChild variant="ghost" className="rounded-full">
                <Link href="/sign-in">{data.login}</Link>
              </Button>
              <Button asChild className="btn-primary rounded-full">
                <Link href="/sign-up">{data.register}</Link>
              </Button>
            </>
          )}
          {clerkSignedIn && (
            <Button asChild className="btn-primary rounded-full">
              <Link href="/app">{data.openApp}</Link>
            </Button>
          )}
        </div>

        {/* ── Mobile hamburger ──────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 md:hidden">
          {/* Theme toggle (always visible on mobile) */}
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={toggleTheme}
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                aria-label={mobileOpen ? data.close : 'Open menu'}
              >
                {mobileOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>
            </SheetTrigger>
            <SheetContent
              side={isArabic ? 'right' : 'left'}
              className="w-72 p-0"
            >
              <div className="flex h-16 items-center border-b border-border/70 px-4">
                <Link href="/" onClick={() => setMobileOpen(false)}>
                  <WealixLogo />
                </Link>
              </div>
              <MobileMenu
                data={data}
                isArabic={isArabic}
                showSections={showSections}
                clerkSignedIn={clerkSignedIn}
                onLocaleToggle={toggleLocale}
                onThemeToggle={toggleTheme}
                theme={theme}
                onClose={() => setMobileOpen(false)}
              />
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
