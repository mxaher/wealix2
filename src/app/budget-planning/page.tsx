import { Suspense } from 'react';
import { auth } from '@clerk/nextjs/server';
import { BudgetPlanningPage } from '@/components/budget-planning/BudgetPlanningPage';
import { runNvidiaDailyPlanningForUser } from '@/lib/ai/daily-planning-runner';
import {
  loadDailyPlanningSnapshotByDate,
  loadLatestDailyPlanningSnapshot,
  saveDailyPlanningSnapshot,
} from '@/lib/daily-planning-storage';
import { loadRemoteWorkspace } from '@/lib/remote-user-data';
export { metadata } from '@/app/budget-planning/metadata';

function previousDate(snapshotDate: string) {
  const date = new Date(`${snapshotDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

async function getBudgetPlanningSnapshot(userId: string) {
  const snapshotDate = new Date().toISOString().slice(0, 10);
  const todaysSnapshot = await loadDailyPlanningSnapshotByDate(userId, snapshotDate).catch(() => null);
  if (todaysSnapshot) {
    return todaysSnapshot;
  }

  const remote = await loadRemoteWorkspace(userId).catch(() => ({ workspace: null, updatedAt: null }));
  if (!remote.workspace || remote.workspace.appMode !== 'live') {
    return loadLatestDailyPlanningSnapshot(userId).catch(() => null);
  }

  const previousSnapshot = await loadDailyPlanningSnapshotByDate(userId, previousDate(snapshotDate)).catch(() => null);

  try {
    const generatedSnapshot = await runNvidiaDailyPlanningForUser({
      userId,
      workspace: remote.workspace,
      previousSnapshot,
    });

    const snapshotForToday = {
      ...generatedSnapshot,
      snapshot_date: snapshotDate,
    };

    await saveDailyPlanningSnapshot(userId, snapshotForToday).catch(() => null);
    return snapshotForToday;
  } catch {
    return loadLatestDailyPlanningSnapshot(userId).catch(() => null);
  }
}

export default async function BudgetPlanningRoute() {
  const { userId } = await auth();
  const snapshot = userId ? await getBudgetPlanningSnapshot(userId) : null;

  return (
    <Suspense fallback={null}>
      <BudgetPlanningPage initialSnapshot={snapshot} />
    </Suspense>
  );
}
