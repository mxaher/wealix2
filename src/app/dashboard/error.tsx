// BUG #008 FIX — Standalone error boundary (no cross-directory relative import)
'use client';

import { ErrorCard } from '@/components/ui/ErrorCard';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorCard message={error.message} onRetry={reset} />;
}
