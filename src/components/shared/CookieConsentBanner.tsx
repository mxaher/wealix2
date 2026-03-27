'use client';

import { useSyncExternalStore } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const COOKIE_CONSENT_KEY = 'wealix-cookie-consent';

type CookieConsent = 'accepted' | 'necessary';

function subscribeToConsent() {
  return () => {};
}

function getConsentSnapshot(): CookieConsent | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const stored = window.localStorage.getItem(COOKIE_CONSENT_KEY);
  return stored === 'accepted' || stored === 'necessary' ? stored : null;
}

export function CookieConsentBanner({ isArabic }: { isArabic: boolean }) {
  const consent = useSyncExternalStore(subscribeToConsent, getConsentSnapshot, () => null);

  const saveConsent = (value: CookieConsent) => {
    window.localStorage.setItem(COOKIE_CONSENT_KEY, value);
    window.dispatchEvent(new Event('storage'));
  };

  if (consent) {
    return null;
  }

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-4xl rounded-[24px] border border-border bg-card/95 p-4 shadow-[0_20px_60px_-25px_rgba(0,0,0,0.35)] backdrop-blur sm:p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-foreground">
            {isArabic ? 'إعدادات ملفات تعريف الارتباط والبيانات' : 'Cookie and data preferences'}
          </p>
          <p className="text-sm leading-6 text-muted-foreground">
            {isArabic
              ? 'تستخدم Wealix ملفات تعريف ارتباط أساسية وتخزيناً محلياً لتسجيل الدخول، وتذكر اللغة والمظهر، وحفظ تفضيلات الواجهة. يمكنك قبول ملفات القياس الاختيارية مستقبلاً أو الاكتفاء بالملفات الأساسية فقط.'
              : 'Wealix uses necessary cookies and local storage for sign-in, language and theme preferences, and secure app functionality. You can accept optional measurement cookies in the future or continue with necessary cookies only.'}
          </p>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <Link href="/privacy" className="transition-colors hover:text-foreground">
              {isArabic ? 'سياسة الخصوصية' : 'Privacy Policy'}
            </Link>
            <span className="text-border">•</span>
            <Link href="/terms" className="transition-colors hover:text-foreground">
              {isArabic ? 'شروط الخدمة' : 'Terms of Service'}
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="rounded-full" onClick={() => saveConsent('necessary')}>
            {isArabic ? 'الأساسية فقط' : 'Necessary Only'}
          </Button>
          <Button className="btn-primary rounded-full" onClick={() => saveConsent('accepted')}>
            {isArabic ? 'قبول الكل' : 'Accept All'}
          </Button>
        </div>
      </div>
    </div>
  );
}
