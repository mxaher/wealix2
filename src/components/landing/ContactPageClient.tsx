'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Building2, Clock3, Globe2, ShieldCheck } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { ContactForm } from '@/components/landing/ContactForm';
import { MarketingNav } from '@/components/landing/MarketingNav';
import { Button } from '@/components/ui/button';

const content = {
  en: {
    badge: 'Contact Wealix',
    title: 'Talk to the team behind a bilingual, AI-powered investment platform.',
    description:
      'Whether you want a product walkthrough, partnership discussion, or support with onboarding, the team is here to help.',
    cards: [
      {
        icon: Globe2,
        title: 'Regional relevance, global ambition',
        body: 'We design for investors across MENA while keeping the platform ready for broader market expansion.',
      },
      {
        icon: ShieldCheck,
        title: 'Trust-first product conversations',
        body: 'We can walk you through how decision support, data handling, and product boundaries are presented inside Wealix.',
      },
      {
        icon: Clock3,
        title: 'Fast response',
        body: 'Most inquiries receive a response within two business days.',
      },
      {
        icon: Building2,
        title: 'Remote-first team',
        body: 'The Wealix team operates remotely and supports investors and partners across the region.',
      },
    ],
    backLabel: 'Back to home',
  },
  ar: {
    badge: 'تواصل مع Wealix',
    title: 'تحدث مع الفريق الذي يبني منصة استثمار ذكية ثنائية اللغة.',
    description:
      'سواء كنت تريد عرضاً للمنتج، أو مناقشة شراكة، أو مساعدة في البدء، فالفريق جاهز للمساعدة.',
    cards: [
      {
        icon: Globe2,
        title: 'ملاءمة إقليمية وطموح عالمي',
        body: 'نصمم للمستثمرين في المنطقة مع الحفاظ على جاهزية المنصة للتوسع إلى أسواق أوسع.',
      },
      {
        icon: ShieldCheck,
        title: 'حديث واضح يبني الثقة',
        body: 'يمكننا شرح كيفية تقديم دعم القرار وحدود المنتج ومعالجة البيانات داخل Wealix بصورة واضحة.',
      },
      {
        icon: Clock3,
        title: 'استجابة سريعة',
        body: 'معظم الاستفسارات تحصل على رد خلال يومي عمل.',
      },
      {
        icon: Building2,
        title: 'فريق يعمل عن بُعد',
        body: 'يعمل فريق Wealix عن بُعد ويدعم المستثمرين والشركاء في أنحاء المنطقة.',
      },
    ],
    backLabel: 'العودة للرئيسية',
  },
} as const;

export function ContactPageClient() {
  const locale = useAppStore((state) => state.locale);
  const isArabic = locale === 'ar';
  const t = content[locale];

  return (
    <div
      className={`min-h-screen bg-background text-foreground ${isArabic ? 'font-[family-name:var(--font-arabic)]' : ''}`}
      dir={isArabic ? 'rtl' : 'ltr'}
    >
      <MarketingNav />

      <main className="px-4 pt-28 pb-24 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-[36px] border border-border bg-card px-6 py-10 shadow-[0_24px_75px_-40px_rgba(0,106,255,0.25)] sm:px-8 lg:px-10 lg:py-12">
          <div className="hero-orbit pointer-events-none absolute inset-0 opacity-80" />
          <div className="relative z-10 grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <span className="inline-flex items-center rounded-full border border-primary/15 bg-primary/8 px-3 py-1 text-xs font-semibold tracking-[0.16em] text-primary uppercase">
                {t.badge}
              </span>
              <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">{t.title}</h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground">{t.description}</p>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {t.cards.map((card) => (
                  <div key={card.title} className="rounded-[24px] border border-border bg-background/80 p-5">
                    <card.icon className="h-5 w-5 text-primary" />
                    <h2 className="mt-4 text-lg font-semibold">{card.title}</h2>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">{card.body}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8">
                <Button asChild variant="outline" className="rounded-full px-5">
                  <Link href="/">{t.backLabel}</Link>
                </Button>
              </div>
            </motion.div>

            <div className="rounded-[28px] border border-border bg-background/80 p-6 shadow-sm sm:p-8">
              <ContactForm isArabic={isArabic} />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
