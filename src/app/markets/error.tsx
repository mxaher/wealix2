// BUG #003 FIX — error.tsx for /markets
'use client';

import { ErrorCard } from '@/components/ui/ErrorCard';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorCard message={error.message} onRetry={reset} />;
}
