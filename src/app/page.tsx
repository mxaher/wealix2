'use client';

import Link from 'next/link';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Bot, Briefcase, Flame, Globe, LineChart, Moon, Receipt, ShieldCheck, Sun, Wallet } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Show, SignInButton, SignUpButton } from '@clerk/nextjs';
import { useAppStore } from '@/store/useAppStore';
import { Button } from '@/components/ui/button';
import { setPreferredTrialPlan } from '@/lib/trial-selection';

const sections = [
  { id: 'features', label: 'Features' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'faq', label: 'FAQ' },
];

const featureCards = [
  {
    icon: Wallet,
    title: 'Financial Command Center',
    description: 'Track income, expenses, assets, liabilities, and net worth from one clean operating layer.',
  },
  {
    icon: Briefcase,
    title: 'Portfolio Intelligence',
    description: 'Import holdings, review allocation, and get AI-guided decisions for hold, trim, add, or diversify.',
  },
  {
    icon: Receipt,
    title: 'Receipt Capture & OCR',
    description: 'Scan or upload receipts, review the extracted fields, then accept corrected data into expenses.',
  },
  {
    icon: Flame,
    title: 'FIRE Planning',
    description: 'Model financial independence progress and connect day-to-day budgeting with long-term freedom.',
  },
  {
    icon: Bot,
    title: 'AI Wealth Advisor',
    description: 'Turn your current numbers into practical guidance, summaries, and next-best actions.',
  },
  {
    icon: ShieldCheck,
    title: 'Clerk-Based Accounts',
    description: 'Each signed-in user gets an isolated workspace with clean live data and a safe demo experience for guests.',
  },
];

const stats = [
  { value: '14 Days', label: 'Free Trial' },
  { value: '5+', label: 'Markets' },
  { value: 'FIRE', label: 'Planning' },
  { value: 'AI', label: 'Advisor' },
];

const pricingByCycle = {
  monthly: [
    {
      id: 'core',
      name: 'Core',
      price: 25,
      suffix: '/mo',
      description: 'Unlimited holdings, full history, PDF reports, and the full planning workspace for active users.',
      features: ['Unlimited portfolio holdings', 'Full net worth & budget history', 'Basic PDF reports', '14-day free trial'],
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 49,
      suffix: '/mo',
      description: 'AI advisor, portfolio intelligence, advanced reports, and the deepest Wealix experience.',
      features: ['Everything in Core', 'AI advisor & portfolio analysis', 'Advanced reports', '14-day free trial'],
    },
  ],
  annual: [
    {
      id: 'core',
      name: 'Core',
      price: 250,
      suffix: '/year',
      description: 'Annual Core access for active planners who want the full tracking stack at a lower yearly rate.',
      features: ['Unlimited portfolio holdings', 'Full net worth & budget history', 'Basic PDF reports', '14-day free trial'],
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 490,
      suffix: '/year',
      description: 'Annual Pro access for the full Wealix intelligence layer, with AI and advanced portfolio workflows.',
      features: ['Everything in Core', 'AI advisor & portfolio analysis', 'Advanced reports', '14-day free trial'],
    },
  ],
} as const;

export default function LandingPage() {
  const { theme, setTheme } = useTheme();
  const locale = useAppStore((state) => state.locale);
  const setLocale = useAppStore((state) => state.setLocale);
  const isArabic = locale === 'ar';
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  return (
    <div className="min-h-screen bg-background text-foreground" dir={isArabic ? 'rtl' : 'ltr'}>
      <nav className="glass fixed inset-x-0 top-0 z-50 border-b border-border/70">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-0.5 text-xl font-bold">
            <span className="logo-weal">Weal</span>
            <span className="logo-ix">ix</span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            {sections.map((section) => (
              <a key={section.id} href={`#${section.id}`} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                {section.label}
              </a>
            ))}
            <a href="#contact" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Contact
            </a>
          </div>

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
            <Show when="signed-out">
              <SignInButton mode="modal">
                <Button variant="ghost" className="hidden rounded-full md:inline-flex">
                  {isArabic ? 'دخول' : 'Log In'}
                </Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button className="btn-primary rounded-full" onClick={() => setPreferredTrialPlan('pro')}>
                  {isArabic ? 'ابدأ الآن' : 'Get Started'}
                </Button>
              </SignUpButton>
            </Show>
            <Show when="signed-in">
              <Button asChild className="btn-primary rounded-full">
                <Link href="/app">
                  {isArabic ? 'فتح التطبيق' : 'Open App'}
                </Link>
              </Button>
            </Show>
          </div>
        </div>
      </nav>

      <main>
        <section className="relative overflow-hidden px-4 pt-28 pb-16 sm:px-6 lg:px-8 lg:pt-36 lg:pb-24">
          <div className="hero-orbit pointer-events-none absolute inset-0 opacity-80" />
          <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="relative z-10"
            >
              <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold tracking-[0.16em] text-primary uppercase">
                Personal Wealth Operating System
              </span>
              <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
                Master your wealth with <span className="gradient-text">intelligent</span> insights
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground md:text-lg">
                Wealix combines budgeting, investing, FIRE planning, OCR-powered expense capture, and AI analysis into one calm operating system for personal wealth.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Show when="signed-out">
                  <SignUpButton mode="modal">
                    <Button className="btn-primary rounded-xl px-5 py-6 text-sm" onClick={() => setPreferredTrialPlan('pro')}>
                      Start 14-Day Trial
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </SignUpButton>
                </Show>
                <Show when="signed-in">
                  <Button asChild className="btn-primary rounded-xl px-5 py-6 text-sm">
                    <Link href="/app">
                      Open Wealix
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </Show>
                <Button asChild variant="outline" className="rounded-xl border-border bg-card/70 px-5 py-6 text-sm">
                  <a href="#features">Explore Features</a>
                </Button>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                No credit card required. Start with a 14-day trial, then continue on Core or Pro.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.1 }}
              className="relative"
            >
              <div className="absolute -inset-6 rounded-[32px] bg-gradient-to-br from-primary/18 via-accent/12 to-transparent blur-3xl" />
              <div className="relative overflow-hidden rounded-[28px] border border-border bg-card/90 p-6 shadow-[0_30px_90px_-35px_rgba(0,106,255,0.35)]">
                <div className="flex items-center justify-between border-b border-border pb-5">
                  <div>
                    <p className="text-sm font-medium text-foreground">Wealix App</p>
                    <p className="text-xs text-muted-foreground">Unified financial operating layer</p>
                  </div>
                  <span className="rounded-full bg-accent/12 px-3 py-1 text-xs font-medium text-accent">Live Design System</span>
                </div>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {stats.map((stat) => (
                    <div key={stat.label} className="stat-card p-5">
                      <div className="stat-value">{stat.value}</div>
                      <div className="stat-label mt-1">{stat.label}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-5 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
                  <div className="card-hover rounded-[20px] border border-border bg-background p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Portfolio Health</p>
                        <p className="mt-1 text-2xl font-semibold financial-number">$612,450</p>
                      </div>
                      <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                        <LineChart className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="mt-5 h-28 rounded-2xl bg-[linear-gradient(180deg,rgba(0,106,255,0.14),rgba(0,106,255,0.02))]" />
                  </div>
                  <div className="card-hover rounded-[20px] border border-border bg-background p-5">
                    <p className="text-sm text-muted-foreground">AI Focus</p>
                    <p className="mt-2 text-base leading-7 text-foreground">
                      Reduce concentration in energy, add income diversification, and rebalance to improve resilience.
                    </p>
                    <div className="mt-5 flex gap-2">
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">Buy</span>
                      <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">Hold</span>
                      <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">Review</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section id="features" className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-2xl text-center">
              <span className="inline-flex items-center rounded-full bg-secondary px-3 py-1 text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                Features
              </span>
              <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
                Everything you need in one place
              </h2>
              <p className="mt-4 text-base leading-8 text-muted-foreground">
                The live Wealix design is built around calm surfaces, focused financial cards, and a side menu split into overview, planning, investing, and system tools.
              </p>
            </div>
            <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {featureCards.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.35, delay: index * 0.05 }}
                  className="card-hover rounded-[20px] border border-border bg-card p-6"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-xl font-semibold">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="border-y border-border bg-secondary/35 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-2xl text-center">
              <span className="inline-flex items-center rounded-full bg-card px-3 py-1 text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                Pricing
              </span>
              <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">Simple paid plans with a 14-day trial first</h2>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                Start with a 14-day free trial without a credit card. Then choose Core or Pro monthly or annually.
              </p>
              <div className="mt-8 inline-flex rounded-full border border-border bg-background p-1">
                <button
                  type="button"
                  onClick={() => setBillingCycle('monthly')}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    billingCycle === 'monthly' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('annual')}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    billingCycle === 'annual' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                  }`}
                >
                  Annually
                </button>
              </div>
            </div>
            <div className="mt-12 grid gap-5 md:grid-cols-2">
              {pricingByCycle[billingCycle].map((plan) => (
                <div
                  key={plan.id}
                  className={`card-hover rounded-[24px] bg-card p-8 ${
                    plan.id === 'pro' ? 'border border-primary/20 ring-1 ring-primary/10' : 'border border-border'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className={`text-sm font-medium ${plan.id === 'pro' ? 'text-primary' : 'text-muted-foreground'}`}>{plan.name}</p>
                      <h3 className="mt-3 text-4xl font-semibold">
                        {plan.price} SAR
                        <span className="ml-1 text-base font-normal text-muted-foreground">{plan.suffix}</span>
                      </h3>
                    </div>
                    {plan.id === 'pro' && (
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                        Most Advanced
                      </span>
                    )}
                  </div>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{plan.description}</p>
                  <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-accent" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-3">
            {[
              ['What does the sidebar include?', 'Overview, Cash Flow, Investing, Planning, and System sections. The live app groups Dashboard, Income, Expenses, Net Worth, Portfolio, FIRE, Retirement, Reports, and Settings into a focused operating menu.'],
              ['What fonts does Wealix use?', 'Inter drives the main interface, JetBrains Mono is used for numeric and code-like emphasis, and Tajawal handles Arabic typography with RTL support.'],
              ['How are colors used?', 'Blue is primary for navigation and action, mint is accent for success and emphasis, white and soft gray surfaces keep the app calm, and green/red communicate financial gains and losses.'],
            ].map(([title, body]) => (
              <div key={title} className="card-hover rounded-[20px] border border-border bg-card p-6">
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="contact" className="px-4 pb-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl overflow-hidden rounded-[28px] border border-border bg-[linear-gradient(135deg,rgba(0,106,255,0.10),rgba(0,204,153,0.08))] p-8 md:p-12">
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div className="max-w-2xl">
                <span className="inline-flex items-center rounded-full bg-background/80 px-3 py-1 text-xs font-semibold tracking-[0.16em] text-primary uppercase">
                  Wealix
                </span>
                <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">Personal Wealth Operating System</h2>
                <p className="mt-4 text-base leading-8 text-muted-foreground">
                  The landing page, token system, split logo, sidebar grouping, and app shell in this repo now follow the live Wealix frontend direction instead of the older navy-gold theme.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Show when="signed-out">
                  <SignUpButton mode="modal">
                    <Button className="btn-primary rounded-xl" onClick={() => setPreferredTrialPlan('pro')}>Create your workspace</Button>
                  </SignUpButton>
                </Show>
                <Show when="signed-in">
                  <Button asChild className="btn-primary rounded-xl">
                    <Link href="/app">Go to app</Link>
                  </Button>
                </Show>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
