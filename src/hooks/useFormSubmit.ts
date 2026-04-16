// BUG #010 FIX — Prevent double-submission on all financial forms
'use client';

import { useState, useCallback } from 'react';

interface UseFormSubmitOptions<TPayload, TResult> {
  onSubmit: (payload: TPayload) => Promise<TResult>;
  onSuccess?: (result: TResult) => void;
  onError?: (error: Error) => void;
  successMessage?: string;
}

export function useFormSubmit<TPayload, TResult>({
  onSubmit,
  onSuccess,
  onError,
  successMessage = 'Saved successfully',
}: UseFormSubmitOptions<TPayload, TResult>) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (payload: TPayload) => {
      if (isSubmitting) return;
      setIsSubmitting(true);
      setError(null);
      try {
        const result = await onSubmit(payload);
        onSuccess?.(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An error occurred';
        setError(message);
        onError?.(err instanceof Error ? err : new Error(message));
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, onSubmit, onSuccess, onError]
  );

  return { submit, isSubmitting, error };
}
