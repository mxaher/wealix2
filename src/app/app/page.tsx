// BUG #017 FIX — Server-side auth check (eliminates FOAC flash)
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function AppPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  // Render dashboard overview — no client-side useEffect auth check needed
  return (
    <div className='p-6'>
      <h1 className='text-2xl font-bold'>Welcome to Wealix</h1>
    </div>
  );
}
