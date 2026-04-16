// BUG #025 FIX — Dynamic import prevents zero-dimension SSR chart rendering
import dynamic from 'next/dynamic';

export const PortfolioAllocationChart = dynamic(
  () => import('./PortfolioAllocationChartClient'),
  {
    ssr: false,
    loading: () => <div className='h-72 animate-pulse rounded-xl bg-muted' />,
  }
);
