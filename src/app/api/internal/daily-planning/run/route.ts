import { NextRequest, NextResponse } from 'next/server';
import { runNvidiaDailyPlanningForUser } from '@/lib/ai/daily-planning-runner';
import { loadDailyPlanningSnapshotByDate, listLiveWorkspacesForDailyPlanning, saveDailyPlanningSnapshot } from '@/lib/daily-planning-storage';
import { loadRemoteWorkspace } from '@/lib/remote-user-data';
import { requireInternalRouteSecret } from '@/lib/internal-route-auth';

function previousDate(snapshotDate: string) {
  const date = new Date(`${snapshotDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

export async function POST(request: NextRequest) {
  const authError = requireInternalRouteSecret(request);
  if (authError) {
    return authError;
  }

  const body = await request.json().catch(() => null) as
    | {
        userId?: string;
        runForAllUsers?: boolean;
        snapshotDate?: string;
      }
    | null;

  const targetDate = body?.snapshotDate || new Date().toISOString().slice(0, 10);

  if (body?.runForAllUsers) {
    const workspaces = await listLiveWorkspacesForDailyPlanning();
    const results: Array<{ userId: string; snapshotDate: string; runId: string }> = [];
    const previousSnapshotDate = previousDate(targetDate);

    for (const item of workspaces) {
      const previous = await loadDailyPlanningSnapshotByDate(item.userId, previousSnapshotDate);
      const snapshot = await runNvidiaDailyPlanningForUser({
        userId: item.userId,
        workspace: item.workspace,
        previousSnapshot: previous,
      });
      await saveDailyPlanningSnapshot(item.userId, {
        ...snapshot,
        snapshot_date: targetDate,
      });
      results.push({ userId: item.userId, snapshotDate: targetDate, runId: snapshot.run_id });
    }

    return NextResponse.json({ ok: true, count: results.length, results });
  }

  const userId = body?.userId?.trim();
  if (!userId) {
    return NextResponse.json({ error: 'userId is required when runForAllUsers is false.' }, { status: 400 });
  }

  const remote = await loadRemoteWorkspace(userId);
  if (!remote.workspace) {
    return NextResponse.json({ error: 'Workspace not found for user.' }, { status: 404 });
  }

  const previous = await loadDailyPlanningSnapshotByDate(userId, previousDate(targetDate));
  const snapshot = await runNvidiaDailyPlanningForUser({
    userId,
    workspace: remote.workspace,
    previousSnapshot: previous,
  });

  await saveDailyPlanningSnapshot(userId, {
    ...snapshot,
    snapshot_date: targetDate,
  });

  return NextResponse.json({
    ok: true,
    userId,
    snapshotDate: targetDate,
    runId: snapshot.run_id,
  });
}
