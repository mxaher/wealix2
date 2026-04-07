import type { Metadata } from 'next';
import { SignIn } from '@clerk/nextjs';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Sign In | Wealix',
  description: 'Sign in to your Wealix account to access your private wealth dashboard and portfolio tools.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function SignInPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-16">
      <div className="mx-auto grid min-h-[calc(100vh-8rem)] max-w-5xl gap-10 lg:grid-cols-[1fr_420px] lg:items-center">
        <section className="max-w-xl">
          <h1 className="text-4xl font-semibold tracking-tight text-foreground">Sign in to Wealix</h1>
          <p className="mt-4 text-base leading-8 text-muted-foreground">
            Access your private wealth workspace to review your net worth, portfolio allocation,
            FIRE progress, budgets, and AI-supported financial planning tools. This page is for
            existing members and is intentionally excluded from search indexing.
          </p>
          <p className="mt-4 text-base leading-8 text-muted-foreground">
            If you are new to Wealix, create an account to start with a guided onboarding flow,
            choose your plan, and set up your personal wealth operating system in Arabic or English.
          </p>
        </section>

        <div className="flex items-center justify-center">
          <SignIn
            routing="path"
            path="/sign-in"
            signUpUrl="/sign-up"
            fallbackRedirectUrl="/app"
          />
        </div>
      </div>
    </main>
  );
}
