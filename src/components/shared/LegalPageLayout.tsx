import Link from 'next/link';
import type { ReactNode } from 'react';

type LegalPageLayoutProps = {
  title: string;
  effectiveDate: string;
  version: string;
  children: ReactNode;
};

export function LegalPageLayout({ title, effectiveDate, version, children }: LegalPageLayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b border-border/70 bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" dir="ltr" className="brand-wordmark flex flex-row items-center gap-0.5 text-xl font-bold">
            <span className="logo-weal">Weal</span>
            <span className="logo-ix">ix</span>
          </Link>
          <Link
            href="/"
            className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Back to Home
          </Link>
        </div>
      </div>

      <main className="px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-[28px] border border-border bg-card p-6 shadow-sm sm:p-8 lg:p-10">
            <div className="border-b border-border pb-6">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Wealix Legal</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
              <div className="mt-4 flex flex-wrap gap-3 text-sm text-muted-foreground">
                <span className="rounded-full bg-secondary px-3 py-1">Effective Date: {effectiveDate}</span>
                <span className="rounded-full bg-secondary px-3 py-1">Version: {version}</span>
              </div>
            </div>

            <div className="space-y-8 pt-8 text-[15px] leading-8 text-foreground">
              {children}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      <div className="space-y-4 text-muted-foreground">{children}</div>
    </section>
  );
}

export function LegalSubsection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <div className="space-y-3 text-muted-foreground">{children}</div>
    </section>
  );
}
