import type { Metadata } from 'next';
import { SignUp } from '@clerk/nextjs';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Create Account | Wealix',
  description: 'Create your Wealix account to start tracking net worth, investments, budgets, and FIRE goals.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function SignUpPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-16">
      <div className="mx-auto grid min-h-[calc(100vh-8rem)] max-w-5xl gap-10 lg:grid-cols-[1fr_420px] lg:items-center">
        <section className="max-w-xl">
          <h1 className="text-4xl font-semibold tracking-tight text-foreground">Create your Wealix account</h1>
          <p className="mt-4 text-base leading-8 text-muted-foreground">
            Start with a guided setup that helps you organize income, expenses, investments,
            retirement goals, and FIRE planning inside one bilingual wealth workspace built for
            MENA and global investors.
          </p>
          <p className="mt-4 text-base leading-8 text-muted-foreground">
            New members can choose the plan that fits them, connect their first accounts, and move
            into onboarding immediately after registration. This account page is intentionally kept
            out of search results because it is part of the private app flow.
          </p>
        </section>

        <div className="flex items-center justify-center">
          <SignUp
            routing="path"
            path="/sign-up"
            signInUrl="/sign-in"
            fallbackRedirectUrl="/onboarding"
          />
        </div>
      </div>
    </main>
  );
}
