'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    console.error('[app/global-error]', error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-background px-6 text-center text-foreground">
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold">Wealix hit a critical error</h1>
          <p className="max-w-md text-sm text-muted-foreground">
            A global rendering error prevented the app shell from loading. Refresh the page, and if it persists we should inspect the deployment logs immediately.
          </p>
        </div>
      </body>
    </html>
  );
}
