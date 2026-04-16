// BUG #001 FIX — Canonical redirect to /app shell
import { redirect } from 'next/navigation';

export default function DashboardRedirect() {
  redirect('/app');
}
