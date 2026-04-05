import { Suspense } from 'react';
import { auth } from '@clerk/nextjs/server';
import { BudgetPlanningPage } from '@/components/budget-planning/BudgetPlanningPage';
import { loadLatestDailyPlanningSnapshot } from '@/lib/daily-planning-storage';
export { metadata } from '@/app/budget-planning/metadata';

export default async function BudgetPlanningRoute() {
  const { userId } = await auth();
  const snapshot = userId ? await loadLatestDailyPlanningSnapshot(userId).catch(() => null) : null;

  return (
    <Suspense fallback={null}>
      <BudgetPlanningPage initialSnapshot={snapshot} />
    </Suspense>
  );
}
