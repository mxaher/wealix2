// BUG #032 FIX — Noindex samples route, ensure no real API calls
export const metadata = {
  robots: { index: false, follow: false },
};

export default function SamplesLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === 'production') {
    // Hard-block in production — samples should not be live
    return (
      <div className='flex h-screen items-center justify-center'>
        <p className='text-muted-foreground'>Not available in production.</p>
      </div>
    );
  }
  return <>{children}</>;
}
