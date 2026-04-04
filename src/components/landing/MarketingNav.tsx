'use client';

import Link from 'next/link';
import { BookOpen, GitCompare, Globe, Moon, Sun, TrendingUp } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuth } from '@clerk/nextjs';
import { useAppStore } from '@/store/useAppStore';
import { Button } from '@/components/ui/button';
import { WealixLogo } from '@/components/shared/WealixLogo';

// ---------------------------------------------------------------------------
// Nav data
// ---------------------------------------------------------------------------
const sections = {
  en: [
    { id: 'features', label: 'Features' },
    { id: 'pricing', label: 'Pricing' },
    { id: 'faq', label: 'FAQ' },
  ],
  ar: [
    { id: 'features', label: 'المميزات' },
    { id: 'pricing', label: 'الأسعار' },
    { id: 'faq', label: 'الأسئلة الشائعة' },
  ],
} as const;

const routedLinks = {
  en: [
    { href: '/blog', label: 'Blog', icon: BookOpen },
    { href: '/vs', label: 'Comparisons', icon: GitCompare },
    { href: '/markets', label: 'Markets', icon: TrendingUp },
  ],
  ar: [
    { href: '/blog', label: 'المدونة', icon: BookOpen },
    { href: '/vs', label: 'مقارنات', icon: GitCompare },
    { href: '/markets', label: 'الأسواق', icon: TrendingUp },
  ],
} as const;

// ---------------------------------------------------------------------------
// Component
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

  const currentSections = isArabic ? sections.ar : sections.en;
  const currentRoutedLinks = isArabic ? routedLinks.ar : routedLinks.en;

  return (
    <nav
      dir={isArabic ? 'rtl' : 'ltr'}
      className="glass fixed inset-x-0 top-0 z-50 border-b border-border/70"
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link href="/">
          <WealixLogo />
        </Link>

        {/* Center links */}
        <div className="hidden items-center gap-6 md:flex">
          {showSections &&
            currentSections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {section.label}
              </a>
            ))}

          {showSections && <span className="h-4 w-px bg-border" aria-hidden="true" />}

          {currentRoutedLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <link.icon className="h-3.5 w-3.5" />
              {link.label}
            </Link>
          ))}

          <a
            href={showSections ? '#contact' : '/#contact'}
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {isArabic ? 'تواصل معنا' : 'Contact'}
          </a>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => setLocale(isArabic ? 'en' : 'ar')}
            title={isArabic ? 'Switch to English' : 'التبديل إلى العربية'}
          >
            <Globe className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title={isArabic ? 'تبديل الوضع' : 'Toggle theme'}
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
          {!clerkSignedIn && (
            <>
              <Button asChild variant="ghost" className="hidden rounded-full md:inline-flex">
                <Link href="/sign-in">
                  {isArabic ? 'تسجيل الدخول' : 'Log In'}
                </Link>
              </Button>
              <Button asChild className="btn-primary rounded-full">
                <Link href="/sign-up">
                  {isArabic ? 'ابدأ الآن' : 'Get Started'}
                </Link>
              </Button>
            </>
          )}
          {clerkSignedIn && (
            <Button asChild className="btn-primary rounded-full">
              <Link href="/app">
                {isArabic ? 'افتح التطبيق' : 'Open App'}
              </Link>
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}
