// BUG #002 FIX — Shared page skeleton for all feature routes
export function PageSkeleton() {
  return (
    <div className='animate-pulse space-y-6 p-6' aria-label='Loading...'>
      <div className='h-8 w-64 rounded-lg bg-muted' />
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className='h-28 rounded-xl bg-muted' />
        ))}
      </div>
      <div className='h-72 rounded-xl bg-muted' />
      <div className='space-y-3'>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className='h-12 rounded-lg bg-muted' />
        ))}
      </div>
    </div>
  );
}
