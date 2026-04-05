import { Suspense } from 'react';
import { BudgetPlanningPage } from '@/components/budget-planning/BudgetPlanningPage';
export { metadata } from '@/app/budget-planning/metadata';

export default function BudgetPlanningRoute() {
  return (
    <Suspense fallback={null}>
      <BudgetPlanningPage />
    </Suspense>
  );
}
