// BUG #003 FIX — Shared error card component
'use client';

interface ErrorCardProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorCard({ message, onRetry }: ErrorCardProps) {
  return (
    <div className='flex min-h-[300px] flex-col items-center justify-center gap-4 rounded-xl border border-destructive/30 bg-destructive/5 p-8'>
      <div className='text-center'>
        <h3 className='text-lg font-semibold text-destructive'>Something went wrong</h3>
        <p className='mt-1 text-sm text-muted-foreground'>
          {message ?? 'An unexpected error occurred. Please try again.'}
        </p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className='rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors'
        >
          Try again
        </button>
      )}
    </div>
  );
}
